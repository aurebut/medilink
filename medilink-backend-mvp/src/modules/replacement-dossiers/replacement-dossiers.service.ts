import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReplacementDossierDocument } from '@prisma/client';
import { createHash, randomUUID } from 'crypto';
import { isEmail } from 'class-validator';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../documents/storage.service';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { DossierDetails, DOSSIER_ATTACHMENT_KINDS, DOSSIER_FIELD_LABELS, DOSSIER_TEMPLATE_VERSION, getMissingDossierFields } from './dossier-types';
import { generateDossierPdf } from './dossier-pdf';
import { GenerateDossierDto, SendDossierDto, UpdateDossierDto, UploadDossierDto } from './dossier.dto';

const APPLICATION_INCLUDE = Prisma.validator<Prisma.ApplicationInclude>()({
  candidate: { select: { email: true, profile: true } },
  mission: { include: { establishment: true } },
  agreements: { where: { acceptedAt: { not: null }, status: { notIn: ['CANCELLED', 'REJECTED', 'EXPIRED'] } }, orderBy: { createdAt: 'desc' }, take: 1 },
});
type DossierApplication = Prisma.ApplicationGetPayload<{ include: typeof APPLICATION_INCLUDE }>;
const ACTIVE_APPLICATIONS = ['SUBMITTED', 'VIEWED', 'ACCEPTED'];
const MAX_ATTACHMENT_TOTAL = 20 * 1024 * 1024;

@Injectable()
export class ReplacementDossiersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  async get(user: RequestUser, applicationId: string) {
    const application = await this.assertAccess(user, applicationId);
    const dossier = await this.ensureDossier(application);
    const [documents, deliveries] = await Promise.all([
      this.prisma.replacementDossierDocument.findMany({ where: { dossierId: dossier.id, archivedAt: null }, orderBy: { createdAt: 'desc' } }),
      this.prisma.replacementDossierDelivery.findMany({ where: { dossierId: dossier.id }, orderBy: { createdAt: 'desc' } }),
    ]);
    const canEdit = ACTIVE_APPLICATIONS.includes(application.status);
    return {
      id: dossier.id, applicationId, revision: dossier.revision, details: dossier.details,
      documents: documents.map((document) => this.documentView(document)),
      deliveries: deliveries.map((delivery) => ({
        id: delivery.id, recipientEmail: delivery.recipientEmail, recipientName: delivery.recipientName,
        recipientType: delivery.recipientType, status: delivery.status, createdAt: delivery.createdAt,
        sentAt: delivery.sentAt, documentIds: delivery.documentIds, error: delivery.error, idempotencyKey: delivery.idempotencyKey,
      })),
      canEdit, canSend: canEdit && this.email.isDossierDeliveryAvailable(),
      missingFields: getMissingDossierFields(dossier.details as unknown as DossierDetails),
    };
  }

  async update(user: RequestUser, applicationId: string, dto: UpdateDossierDto) {
    const application = await this.assertAccess(user, applicationId, true);
    const dossier = await this.ensureDossier(application);
    const details = this.validateDetails(dto.details);
    const result = await this.prisma.replacementDossier.updateMany({
      where: { id: dossier.id, revision: dto.revision },
      data: { details: details as unknown as Prisma.InputJsonValue, revision: { increment: 1 } },
    });
    if (!result.count) this.revisionConflict();
    await this.record(user, dossier.id, 'updated', { revision: dto.revision + 1 });
    return this.get(user, applicationId);
  }

  async generate(user: RequestUser, applicationId: string, dto: GenerateDossierDto) {
    const application = await this.assertAccess(user, applicationId, true);
    if (application.mission.missionType !== 'REMPLACEMENT' || ['NURSE', 'OPERATING_ROOM_ASSISTANT'].includes(application.candidate.profile?.medicalStatus)) {
      throw new BadRequestException('Ces modèles sont réservés au remplacement médical libéral individuel.');
    }
    const dossier = await this.ensureDossier(application);
    if (dossier.revision !== dto.revision) this.revisionConflict();
    const details = dossier.details as unknown as DossierDetails;
    const missingFields = getMissingDossierFields(details, dto.kind);
    if (missingFields.length) throw new BadRequestException({ message: 'Complétez les informations nécessaires avant de générer le document.', missingFields });
    let storedKey: string | undefined;
    try {
      await this.prisma.$transaction(async (tx) => {
        await this.lockRevision(tx, dossier.id, dto.revision);
        const version = await this.nextVersion(tx, dossier.id, dto.kind);
        const bytes = await generateDossierPdf(dto.kind, details, { version, generatedAt: new Date() });
        const id = randomUUID();
        const fileName = `${dto.kind === 'CONTRACT' ? 'contrat' : 'declaration'}-remplacement-v${version}.pdf`;
        storedKey = `replacement-dossiers/${dossier.id}/${id}.pdf`;
        await this.storage.writeBuffer(storedKey, bytes, 'application/pdf');
        await tx.replacementDossierDocument.create({ data: {
          id, dossierId: dossier.id, kind: dto.kind, fileName, storageKey: storedKey,
          mimeType: 'application/pdf', sizeBytes: bytes.length, status: 'READY', source: 'GENERATED',
          version, revision: dto.revision, detailsSnapshot: dossier.details as Prisma.InputJsonValue,
          templateVersion: DOSSIER_TEMPLATE_VERSION, createdById: user.id,
        } });
      }, { timeout: 20000 });
    } catch (error) {
      if (storedKey) await this.storage.deleteObject(storedKey).catch(() => undefined);
      throw error;
    }
    await this.record(user, dossier.id, 'generated', { kind: dto.kind, revision: dto.revision });
    return this.get(user, applicationId);
  }

  async createUploadUrl(user: RequestUser, applicationId: string, dto: UploadDossierDto) {
    const application = await this.assertAccess(user, applicationId, true);
    const dossier = await this.ensureDossier(application);
    // Validation also lives here so internal callers cannot bypass HTTP DTO validation.
    if (!DOSSIER_ATTACHMENT_KINDS.includes(dto.kind)
      || !['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(dto.mimeType)
      || !Number.isInteger(dto.sizeBytes) || dto.sizeBytes < 1 || dto.sizeBytes > 10 * 1024 * 1024) {
      throw new BadRequestException('Type ou taille du fichier non autorisé (10 Mo maximum).');
    }
    const fileName = this.safeFileName(dto.fileName);
    const document = await this.prisma.$transaction(async (tx) => {
      await this.lockRevision(tx, dossier.id, dto.revision);
      const id = randomUUID();
      return tx.replacementDossierDocument.create({ data: {
        id, dossierId: dossier.id, kind: dto.kind, fileName,
        storageKey: `quarantine/replacement-dossiers/${dossier.id}/${id}`,
        mimeType: dto.mimeType, sizeBytes: dto.sizeBytes, source: 'UPLOADED', status: 'UPLOADING',
        version: await this.nextVersion(tx, dossier.id, dto.kind), revision: dto.revision,
        createdById: user.id, expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      } });
    });
    const signed = await this.storage.createUploadUrl(document.storageKey, dto.mimeType, dto.sizeBytes);
    await this.record(user, dossier.id, 'upload_requested', { documentId: document.id, kind: dto.kind });
    return { documentId: document.id, ...signed };
  }

  async confirmUpload(user: RequestUser, applicationId: string, documentId: string) {
    const application = await this.assertAccess(user, applicationId, true);
    const dossier = await this.ensureDossier(application);
    await this.prisma.$transaction(async (tx) => {
      await this.lockRevision(tx, dossier.id);
      const document = await tx.replacementDossierDocument.findFirst({ where: { id: documentId, dossierId: dossier.id, archivedAt: null } });
      if (!document) throw new NotFoundException('Document introuvable dans ce dossier.');
      if (document.status === 'READY') return;
      if (document.createdById !== user.id) throw new ForbiddenException('Seul l’auteur du téléversement peut le confirmer.');
      const finalKey = `replacement-dossiers/${dossier.id}/${document.id}`;
      try {
        // Freeze the object BEFORE checking its actual bytes: upload URLs can be replayed
        // only against quarantine, never against the verified final object.
        await this.storage.promoteUploadedObject(document.storageKey, finalKey);
        await this.storage.assertUploadedObject(finalKey, document.mimeType, document.sizeBytes);
      } catch {
        await this.storage.deleteObject(finalKey).catch(() => undefined);
        throw new BadRequestException('Le fichier est absent ou ne correspond pas au type et à la taille annoncés. Téléversez-le à nouveau.');
      }
      await tx.replacementDossierDocument.update({ where: { id: document.id }, data: { status: 'READY', storageKey: finalKey } });
    }, { timeout: 20000 });
    await this.record(user, dossier.id, 'upload_confirmed', { documentId });
    return this.get(user, applicationId);
  }

  async download(user: RequestUser, applicationId: string, documentId: string) {
    const application = await this.assertAccess(user, applicationId);
    const dossier = await this.ensureDossier(application);
    const document = await this.prisma.replacementDossierDocument.findFirst({
      where: { id: documentId, dossierId: dossier.id, archivedAt: null, status: 'READY' },
    });
    if (!document) throw new NotFoundException('Document disponible introuvable dans ce dossier.');
    await this.record(user, dossier.id, 'downloaded', { documentId });
    return this.storage.createDownloadUrl(document.storageKey, document.fileName, document.mimeType);
  }

  async archive(user: RequestUser, applicationId: string, documentId: string) {
    const application = await this.assertAccess(user, applicationId, true);
    const dossier = await this.ensureDossier(application);
    await this.prisma.$transaction(async (tx) => {
      await this.lockRevision(tx, dossier.id);
      const result = await tx.replacementDossierDocument.updateMany({
        where: { id: documentId, dossierId: dossier.id, archivedAt: null }, data: { archivedAt: new Date() },
      });
      if (!result.count) throw new NotFoundException('Document introuvable dans ce dossier.');
    });
    // Keep immutable bytes and sent snapshots for traceability; remove from active dossier.
    await this.record(user, dossier.id, 'document_archived', { documentId });
    return this.get(user, applicationId);
  }

  async send(user: RequestUser, applicationId: string, dto: SendDossierDto) {
    const application = await this.assertAccess(user, applicationId, true);
    const dossier = await this.ensureDossier(application);
    const request = {
      documentIds: [...dto.documentIds].sort(), recipientEmail: dto.recipientEmail.trim().toLowerCase(),
      recipientName: dto.recipientName.trim(), recipientType: dto.recipientType, message: dto.message?.trim() || '',
    };
    const requestHash = createHash('sha256').update(JSON.stringify(request)).digest('hex');
    const claimed = await this.prisma.$transaction(async (tx) => {
      await this.lockRevision(tx, dossier.id);
      const existing = await tx.replacementDossierDelivery.findUnique({ where: { dossierId_idempotencyKey: { dossierId: dossier.id, idempotencyKey: dto.idempotencyKey } } });
      if (existing) {
        if (existing.requestHash !== requestHash) throw new ConflictException('Cette clé d’envoi correspond déjà à une autre sélection ou un autre destinataire.');
        if (existing.status !== 'FAILED') return { delivery: existing, documents: [], created: false };
        // Resend retains idempotency keys for 24h. Never retry an ambiguous failure
        // outside that window because the first attempt may have been accepted.
        if (Date.now() - existing.createdAt.getTime() > 23 * 60 * 60 * 1000
          && existing.error !== 'Le service email n’est pas configuré. Aucun document n’a été envoyé.') {
          throw new ConflictException('Cet ancien envoi n’a pas pu être confirmé. Vérifiez sa réception avant de créer un nouvel envoi.');
        }
      }
      const documents = await tx.replacementDossierDocument.findMany({ where: { id: { in: request.documentIds }, dossierId: dossier.id, archivedAt: null, status: 'READY' } });
      documents.sort((left, right) => left.id.localeCompare(right.id));
      const current = await tx.replacementDossier.findUniqueOrThrow({ where: { id: dossier.id } });
      if (!documents.length || documents.length !== request.documentIds.length || new Set(request.documentIds).size !== request.documentIds.length) {
        throw new BadRequestException('Sélectionnez uniquement des documents disponibles dans ce dossier.');
      }
      if (documents.some((document) => (document.source === 'GENERATED' || document.kind === 'SIGNED_CONTRACT') && document.revision !== current.revision)) {
        throw new ConflictException('Les informations ont changé. Régénérez les documents et ajoutez le contrat signé correspondant avant de les envoyer.');
      }
      const today = new Date().toISOString().slice(0, 10);
      if (documents.some((document) => document.expiresAt && document.expiresAt.toISOString().slice(0, 10) < today)) {
        throw new BadRequestException('Une pièce sélectionnée a expiré. Ajoutez un justificatif à jour.');
      }
      const replacementEnd = (current.details as unknown as DossierDetails).endDate;
      if (replacementEnd && documents.some((document) => ['LICENSE', 'INSURANCE'].includes(document.kind)
        && document.expiresAt && document.expiresAt.toISOString().slice(0, 10) < replacementEnd)) {
        throw new BadRequestException('La licence et l’assurance sélectionnées doivent couvrir toute la période du remplacement.');
      }
      if (documents.reduce((size, document) => size + document.sizeBytes, 0) > MAX_ATTACHMENT_TOTAL) {
        throw new BadRequestException('Les pièces jointes dépassent la limite de 20 Mo par envoi.');
      }
      let delivery = existing;
      if (existing) {
        const updated = await tx.replacementDossierDelivery.updateMany({
          where: { id: existing.id, status: 'FAILED' }, data: { status: 'SENDING', error: null },
        });
        if (!updated.count) return { delivery: existing, documents: [], created: false };
      } else {
        delivery = await tx.replacementDossierDelivery.create({ data: {
          dossierId: dossier.id, actorUserId: user.id, ...request, idempotencyKey: dto.idempotencyKey, requestHash,
          documentSnapshots: documents.map((document) => ({ id: document.id, kind: document.kind, fileName: document.fileName, version: document.version, revision: document.revision })),
          status: 'SENDING',
        } });
      }
      return { delivery, documents, created: true };
    });
    if (!claimed.created) return this.get(user, applicationId);
    try {
      if (!this.email.isDossierDeliveryAvailable()) throw new Error('Envoi indisponible : le service email n’est pas configuré. Aucun document n’a été envoyé.');
      const attachments = await Promise.all(claimed.documents.map(async (document) => ({
        filename: document.fileName, content: await this.storage.readBuffer(document.storageKey),
      })));
      const sent = await this.email.sendDossierEmail({
        userId: user.id, to: request.recipientEmail, recipientName: request.recipientName,
        message: request.message, attachments, idempotencyKey: `dossier-${claimed.delivery.id}`, createdAt: claimed.delivery.createdAt,
      });
      await this.prisma.replacementDossierDelivery.update({ where: { id: claimed.delivery.id }, data: {
        status: 'SENT', sentAt: new Date(), providerMessageId: sent.providerMessageId,
      } });
    } catch (error) {
      await this.prisma.replacementDossierDelivery.update({ where: { id: claimed.delivery.id }, data: {
        status: 'FAILED', error: this.email.isDossierDeliveryAvailable()
          ? 'L’envoi n’a pas pu être confirmé. Vérifiez le destinataire et réessayez ; si nécessaire, vérifiez le journal du fournisseur avant un nouvel envoi.'
          : 'Le service email n’est pas configuré. Aucun document n’a été envoyé.',
      } });
    }
    await this.record(user, dossier.id, 'delivery_attempted', { deliveryId: claimed.delivery.id });
    return this.get(user, applicationId);
  }

  private async assertAccess(user: RequestUser, applicationId: string, write = false): Promise<DossierApplication> {
    const application = await this.prisma.application.findUnique({ where: { id: applicationId }, include: APPLICATION_INCLUDE });
    if (!application) throw new NotFoundException('Candidature introuvable.');
    if (application.candidateUserId !== user.id) {
      const member = await this.prisma.establishmentMember.findUnique({
        where: { establishmentId_userId: { establishmentId: application.mission.establishmentId, userId: user.id } },
      });
      if (!member || !['OWNER', 'ADMIN', 'RECRUITER'].includes(member.role)) {
        throw new ForbiddenException('Ce dossier est réservé au candidat concerné et aux responsables de cet établissement.');
      }
    }
    if (write && !ACTIVE_APPLICATIONS.includes(application.status)) throw new ForbiddenException('Cette candidature est clôturée ; son dossier est accessible en lecture seule.');
    return application;
  }

  private async ensureDossier(application: DossierApplication) {
    if (!ACTIVE_APPLICATIONS.includes(application.status)) {
      const existing = await this.prisma.replacementDossier.findUnique({ where: { applicationId: application.id } });
      if (!existing) throw new NotFoundException('Aucun dossier n’a été créé avant la clôture de cette candidature.');
      return existing;
    }
    return this.prisma.replacementDossier.upsert({
      where: { applicationId: application.id }, update: {},
      create: { applicationId: application.id, details: this.prefill(application) as unknown as Prisma.InputJsonValue },
    });
  }

  private prefill(application: DossierApplication): DossierDetails {
    const { mission, candidate } = application;
    const profile = candidate.profile;
    const agreement = application.agreements[0];
    const isoDate = (value?: Date | null) => value?.toISOString().slice(0, 10) || '';
    const timeRange = [agreement?.startTime || mission.startTime, agreement?.endTime || mission.endTime].filter(Boolean).join(' – ');
    return {
      practiceFramework: '', replacementKind: ['STUDENT', 'INTERN', 'JUNIOR_DOCTOR'].includes(profile?.medicalStatus) ? 'STUDENT' : 'DOCTOR',
      // An establishment account/mission creator does not establish the identity of the replaced physician.
      holderName: '', holderRpps: '', holderOrderNumber: '', holderAddress: '', holderEmail: '',
      replacementName: [profile?.firstName, profile?.lastName].filter(Boolean).join(' '),
      replacementRpps: profile?.rpps || '', replacementOrderNumber: '', replacementAddress: '', replacementEmail: candidate.email,
      licenseNumber: '', licenseValidUntil: '', specialty: mission.specialty,
      practiceAddress: [mission.establishment.address, mission.establishment.city].filter(Boolean).join(', '),
      startDate: isoDate(agreement?.startDate || mission.startDate), endDate: isoDate(agreement?.endDate || mission.endDate),
      scheduleDetails: timeRange, retrocessionPercent: agreement?.retrocessionPercentage ?? mission.retrocessionPercentage ?? null,
      paymentTerms: agreement?.terms || '', orderCouncilName: '', orderEmail: '',
    };
  }

  private validateDetails(input: DossierDetails): DossierDetails {
    const keys = Object.keys(DOSSIER_FIELD_LABELS) as (keyof DossierDetails)[];
    if (!input || typeof input !== 'object' || Object.keys(input).some((key) => !keys.includes(key as keyof DossierDetails))) throw new BadRequestException('Informations du dossier non reconnues.');
    const result: Record<string, unknown> = {};
    for (const key of keys) {
      const value = input[key];
      if (key === 'retrocessionPercent') {
        if (value !== null && (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 100)) throw new BadRequestException('La rétrocession doit être comprise entre 0 et 100 %.');
        result[key] = value;
      } else {
        if (typeof value !== 'string' || value.length > (['paymentTerms', 'scheduleDetails'].includes(key) ? 4000 : 500) || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) throw new BadRequestException(`Valeur invalide : ${DOSSIER_FIELD_LABELS[key]}.`);
        result[key] = value.trim();
      }
    }
    if (!['DOCTOR', 'STUDENT'].includes(result.replacementKind as string) || !['', 'INDIVIDUAL_LIBERAL'].includes(result.practiceFramework as string)) throw new BadRequestException('Cadre ou statut du remplacement non reconnu.');
    for (const key of ['holderEmail', 'replacementEmail', 'orderEmail']) {
      if (result[key] && !isEmail(result[key] as string)) throw new BadRequestException(`Courriel invalide : ${DOSSIER_FIELD_LABELS[key]}.`);
    }
    for (const key of ['startDate', 'endDate', 'licenseValidUntil']) {
      const date = result[key] as string;
      if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) throw new BadRequestException(`Date invalide : ${DOSSIER_FIELD_LABELS[key]}.`);
    }
    return result as unknown as DossierDetails;
  }

  private async lockRevision(tx: Prisma.TransactionClient, id: string, revision?: number) {
    const result = await tx.replacementDossier.updateMany({ where: { id, ...(revision !== undefined ? { revision } : {}) }, data: { updatedAt: new Date() } });
    if (!result.count) this.revisionConflict();
  }

  private async nextVersion(tx: Prisma.TransactionClient, dossierId: string, kind: string) {
    const last = await tx.replacementDossierDocument.findFirst({ where: { dossierId, kind }, orderBy: { version: 'desc' } });
    return (last?.version || 0) + 1;
  }

  private revisionConflict(): never {
    throw new ConflictException('Le dossier a été modifié par votre interlocuteur. Actualisez-le avant de poursuivre.');
  }

  private safeFileName(fileName: string) {
    if (!fileName || fileName.length > 180 || /[\x00-\x1f\x7f/\\]/.test(fileName)) throw new BadRequestException('Nom de fichier invalide.');
    return fileName.replace(/\.\.+/g, '.').trim();
  }

  private documentView(document: ReplacementDossierDocument) {
    return {
      id: document.id, kind: document.kind, fileName: document.fileName, mimeType: document.mimeType,
      sizeBytes: document.sizeBytes, status: document.status, version: document.version, revision: document.revision,
      createdAt: document.createdAt, expiresAt: document.expiresAt, source: document.source, templateVersion: document.templateVersion,
    };
  }

  private record(user: RequestUser, id: string, action: string, metadata: Record<string, unknown>) {
    return this.audit.log({ actorUserId: user.id, action: `replacement_dossier.${action}`, entityType: 'replacement_dossier', entityId: id, metadata });
  }
}
