import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  AccountingDeclarationFrequency,
  AccountingEntryKind,
  AccountingEntrySource,
  AccountingEntryStatus,
  AccountingOwnerType,
  AccountingSocialScheme,
  CompensationMode,
  EstablishmentMemberRole,
  InvoiceType,
  MissionAgreementStatus,
  Prisma,
  RetrocessionSettlementStatus,
  UserRole,
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateAccountingEntryDto,
  SetAccountingClassificationDto,
  UpdateAccountingSettingsDto,
  UpdateCandidateAccountingProfileDto,
} from './dto/accounting.dto';

type Scope = { ownerType: AccountingOwnerType; ownerId: string };

export type ReleasedRetrocessionInput = {
  grossHonorariaCents?: number;
  candidateAmountCents?: number;
  dueDate?: string;
  paidAt?: string;
  notes?: string;
};

type ReleasedAgreement = {
  id: string;
  candidateUserId: string;
  establishmentId: string;
  missionId: string;
  currency: string;
  retrocessionPercentage?: number | null;
  candidateAmount: number;
};

const ACCOUNTING_CATEGORIES = [
  { code: 'RETROCESSION_HONORAIRES', kind: AccountingEntryKind.REVENUE, label: "Rétrocessions d'honoraires" },
  { code: 'GARDE_LIBERALE', kind: AccountingEntryKind.REVENUE, label: 'Gardes et astreintes libérales' },
  { code: 'VACATION_LIBERALE', kind: AccountingEntryKind.REVENUE, label: 'Vacations libérales' },
  { code: 'AIDES_INDEMNITES', kind: AccountingEntryKind.REVENUE, label: 'Aides et indemnités' },
  { code: 'OTHER_REVENUE', kind: AccountingEntryKind.REVENUE, label: 'Autres recettes professionnelles' },
  { code: 'URSSAF', kind: AccountingEntryKind.EXPENSE, label: 'Cotisations Urssaf' },
  { code: 'CARMF', kind: AccountingEntryKind.EXPENSE, label: 'Cotisations CARMF' },
  { code: 'RCP', kind: AccountingEntryKind.EXPENSE, label: 'Responsabilité civile professionnelle' },
  { code: 'ORDRE_MEDECINS', kind: AccountingEntryKind.EXPENSE, label: "Cotisation à l'Ordre" },
  { code: 'DEPLACEMENTS', kind: AccountingEntryKind.EXPENSE, label: 'Déplacements' },
  { code: 'PEAGES_STATIONNEMENT', kind: AccountingEntryKind.EXPENSE, label: 'Péages et stationnement' },
  { code: 'REPAS', kind: AccountingEntryKind.EXPENSE, label: 'Repas' },
  { code: 'HEBERGEMENT', kind: AccountingEntryKind.EXPENSE, label: 'Hébergement' },
  { code: 'MATERIEL_MEDICAL', kind: AccountingEntryKind.EXPENSE, label: 'Matériel médical' },
  { code: 'INFORMATIQUE_TELEPHONE', kind: AccountingEntryKind.EXPENSE, label: 'Informatique et téléphone' },
  { code: 'LOGICIELS_ABONNEMENTS', kind: AccountingEntryKind.EXPENSE, label: 'Logiciels et abonnements' },
  { code: 'FORMATION_CONGRES', kind: AccountingEntryKind.EXPENSE, label: 'Formations et congrès' },
  { code: 'FRAIS_BANCAIRES', kind: AccountingEntryKind.EXPENSE, label: 'Frais bancaires' },
  { code: 'HONORAIRES_COMPTABLES', kind: AccountingEntryKind.EXPENSE, label: 'Honoraires comptables' },
  { code: 'OTHER_EXPENSE', kind: AccountingEntryKind.EXPENSE, label: 'Autres dépenses professionnelles' },
] as const;

const ACTIVE_AGREEMENT_STATUSES = [
  MissionAgreementStatus.PROPOSED,
  MissionAgreementStatus.PAYMENT_REQUIRED,
  MissionAgreementStatus.FUNDS_SECURED,
  MissionAgreementStatus.COMPLETED,
  MissionAgreementStatus.PAYMENT_RELEASED,
];

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async getCandidateWorkspace(user: RequestUser) {
    this.ensureCandidate(user);
    const scope = { ownerType: AccountingOwnerType.CANDIDATE, ownerId: user.id };
    const workspace = await this.ensureWorkspace(scope);
    await this.reconcileCandidateAccounting(user.id, workspace.id);

    const [base, profile, settlements] = await Promise.all([
      this.getWorkspace(scope),
      this.prisma.accountingProfile.findUnique({ where: { workspaceId: workspace.id } }),
      this.prisma.retrocessionSettlement.findMany({
        where: {
          workspaceId: workspace.id,
          agreement: { compensationMode: CompensationMode.RETROCESSION },
        },
        include: {
          agreement: {
            include: { mission: { include: { establishment: true } }, payment: true, invoices: true },
          },
        },
        orderBy: [{ paidAt: 'desc' }, { createdAt: 'desc' }],
      }),
    ]);

    return {
      ...base,
      profile: profile ? this.profilePayload(profile) : null,
      settlements: settlements.map((settlement) => this.settlementPayload(settlement)),
      categories: ACCOUNTING_CATEGORIES,
      rules: this.rulesPayload(),
    };
  }

  async createCandidateEntry(user: RequestUser, dto: CreateAccountingEntryDto) {
    this.ensureCandidate(user);
    return this.createEntry(user, { ownerType: AccountingOwnerType.CANDIDATE, ownerId: user.id }, dto);
  }

  async deleteCandidateEntry(user: RequestUser, entryId: string) {
    this.ensureCandidate(user);
    return this.deleteEntry(user, { ownerType: AccountingOwnerType.CANDIDATE, ownerId: user.id }, entryId);
  }

  async updateCandidateSettings(user: RequestUser, dto: UpdateAccountingSettingsDto) {
    this.ensureCandidate(user);
    return this.updateSettings(user, { ownerType: AccountingOwnerType.CANDIDATE, ownerId: user.id }, dto);
  }

  async updateCandidateProfile(user: RequestUser, dto: UpdateCandidateAccountingProfileDto) {
    this.ensureCandidate(user);
    if (dto.socialScheme === AccountingSocialScheme.RSPM
      && dto.declarationFrequency === AccountingDeclarationFrequency.ANNUAL) {
      throw new BadRequestException("L'offre simplifiée médecin remplaçant se déclare mensuellement ou trimestriellement.");
    }
    const workspace = await this.ensureWorkspace({ ownerType: AccountingOwnerType.CANDIDATE, ownerId: user.id });
    const activityStartDate = dto.activityStartDate ? new Date(dto.activityStartDate) : undefined;
    if (activityStartDate && Number.isNaN(activityStartDate.getTime())) {
      throw new BadRequestException("Date de début d'activité invalide.");
    }

    const data = {
      taxRegime: dto.taxRegime,
      socialScheme: dto.socialScheme,
      activityMode: dto.activityMode,
      declarationFrequency: dto.declarationFrequency,
      activityStartDate,
      exclusiveLocum: dto.exclusiveLocum,
      hasOtherIndependentActivity: dto.hasOtherIndependentActivity,
      onboardingCompletedAt: dto.onboardingCompleted ? new Date() : undefined,
    };
    const profile = await this.prisma.accountingProfile.upsert({
      where: { workspaceId: workspace.id },
      create: { workspaceId: workspace.id, ...data },
      update: data,
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'accounting.profile.updated',
      entityType: 'accounting_profile',
      entityId: profile.id,
    });
    return this.getCandidateWorkspace(user);
  }

  async classifyCandidateRecord(user: RequestUser, dto: SetAccountingClassificationDto) {
    this.ensureCandidate(user);
    return this.setClassification(user, { ownerType: AccountingOwnerType.CANDIDATE, ownerId: user.id }, dto);
  }

  async getEstablishmentWorkspace(user: RequestUser, establishmentId: string) {
    await this.ensureEstablishmentFinanceAccess(user.id, establishmentId);
    return this.getWorkspace({ ownerType: AccountingOwnerType.ESTABLISHMENT, ownerId: establishmentId });
  }

  async createEstablishmentEntry(user: RequestUser, establishmentId: string, dto: CreateAccountingEntryDto) {
    await this.ensureEstablishmentFinanceAccess(user.id, establishmentId);
    if (dto.kind !== AccountingEntryKind.EXPENSE) throw new BadRequestException('Une dépense est attendue pour cet espace.');
    return this.createEntry(user, { ownerType: AccountingOwnerType.ESTABLISHMENT, ownerId: establishmentId }, dto);
  }

  async deleteEstablishmentEntry(user: RequestUser, establishmentId: string, entryId: string) {
    await this.ensureEstablishmentFinanceAccess(user.id, establishmentId);
    return this.deleteEntry(user, { ownerType: AccountingOwnerType.ESTABLISHMENT, ownerId: establishmentId }, entryId);
  }

  async updateEstablishmentSettings(user: RequestUser, establishmentId: string, dto: UpdateAccountingSettingsDto) {
    await this.ensureEstablishmentFinanceAccess(user.id, establishmentId);
    return this.updateSettings(user, { ownerType: AccountingOwnerType.ESTABLISHMENT, ownerId: establishmentId }, dto);
  }

  async classifyEstablishmentRecord(user: RequestUser, establishmentId: string, dto: SetAccountingClassificationDto) {
    await this.ensureEstablishmentFinanceAccess(user.id, establishmentId);
    return this.setClassification(user, { ownerType: AccountingOwnerType.ESTABLISHMENT, ownerId: establishmentId }, dto);
  }

  async recordReleasedRetrocessionTx(
    tx: Prisma.TransactionClient,
    actorUserId: string,
    agreement: ReleasedAgreement,
    input: ReleasedRetrocessionInput,
    validatedAt = new Date(),
  ) {
    const percentage = agreement.retrocessionPercentage || 0;
    const grossHonorariaCents = input.grossHonorariaCents;
    const expectedAmountCents = grossHonorariaCents !== undefined && percentage > 0
      ? Math.round(grossHonorariaCents * percentage / 100)
      : undefined;
    const candidateAmountCents = input.candidateAmountCents
      ?? expectedAmountCents
      ?? (agreement.candidateAmount > 0 ? agreement.candidateAmount * 100 : undefined);

    if (!candidateAmountCents || candidateAmountCents <= 0) {
      throw new BadRequestException('Renseignez le montant réel de la rétrocession avant de la valider.');
    }

    const dueDate = input.dueDate ? new Date(input.dueDate) : undefined;
    if (dueDate && Number.isNaN(dueDate.getTime())) throw new BadRequestException("Date d'échéance invalide.");

    const paidAt = input.paidAt ? new Date(input.paidAt) : validatedAt;
    if (Number.isNaN(paidAt.getTime())) throw new BadRequestException("Date d'encaissement invalide.");
    if (paidAt.toISOString().slice(0, 10) > validatedAt.toISOString().slice(0, 10)) {
      throw new BadRequestException("La date d'encaissement ne peut pas être future.");
    }

    const workspace = await tx.accountingWorkspace.upsert({
      where: { ownerType_ownerId: { ownerType: AccountingOwnerType.CANDIDATE, ownerId: agreement.candidateUserId } },
      create: { ownerType: AccountingOwnerType.CANDIDATE, ownerId: agreement.candidateUserId },
      update: {},
    });
    const [establishment, mission] = await Promise.all([
      tx.establishment.findUnique({ where: { id: agreement.establishmentId }, select: { name: true } }),
      tx.mission.findUnique({ where: { id: agreement.missionId }, select: { title: true } }),
    ]);

    await tx.retrocessionSettlement.upsert({
      where: { agreementId: agreement.id },
      create: {
        workspaceId: workspace.id,
        agreementId: agreement.id,
        status: RetrocessionSettlementStatus.PAID,
        rateBasisPoints: percentage ? percentage * 100 : null,
        grossHonorariaCents,
        expectedAmountCents,
        finalAmountCents: candidateAmountCents,
        currency: agreement.currency,
        dueDate,
        validatedAt,
        paidAt,
        notes: input.notes?.trim() || null,
        updatedById: actorUserId,
      },
      update: {
        status: RetrocessionSettlementStatus.PAID,
        rateBasisPoints: percentage ? percentage * 100 : null,
        grossHonorariaCents,
        expectedAmountCents,
        finalAmountCents: candidateAmountCents,
        currency: agreement.currency,
        dueDate,
        validatedAt,
        paidAt,
        notes: input.notes?.trim() || null,
        updatedById: actorUserId,
      },
    });

    const entry = await tx.accountingEntry.upsert({
      where: {
        workspaceId_sourceKey: {
          workspaceId: workspace.id,
          sourceKey: this.agreementRevenueSourceKey(agreement.id),
        },
      },
      create: {
        workspaceId: workspace.id,
        kind: AccountingEntryKind.REVENUE,
        entryDate: paidAt,
        counterparty: establishment?.name || 'Établissement',
        missionLabel: mission?.title || 'Mission MédiLink',
        amountCents: candidateAmountCents,
        currency: agreement.currency,
        paymentMethod: 'Virement MédiLink',
        notes: input.notes?.trim() || (percentage ? `Rétrocession contractuelle de ${percentage}%` : null),
        hasReceipt: false,
        source: AccountingEntrySource.MEDILINK,
        status: AccountingEntryStatus.VALIDATED,
        categoryCode: percentage ? 'RETROCESSION_HONORAIRES' : 'VACATION_LIBERALE',
        professionalShareBps: 10000,
        agreementId: agreement.id,
        sourceKey: this.agreementRevenueSourceKey(agreement.id),
        validatedAt,
        createdById: actorUserId,
      },
      update: {
        entryDate: paidAt,
        counterparty: establishment?.name || 'Établissement',
        missionLabel: mission?.title || 'Mission MédiLink',
        amountCents: candidateAmountCents,
        currency: agreement.currency,
        paymentMethod: 'Virement MédiLink',
        notes: input.notes?.trim() || (percentage ? `Rétrocession contractuelle de ${percentage}%` : null),
        source: AccountingEntrySource.MEDILINK,
        status: AccountingEntryStatus.VALIDATED,
        categoryCode: percentage ? 'RETROCESSION_HONORAIRES' : 'VACATION_LIBERALE',
        professionalShareBps: 10000,
        agreementId: agreement.id,
        validatedAt,
        voidedAt: null,
      },
    });

    return { candidateAmountCents, legacyAmount: Math.round(candidateAmountCents / 100), entryId: entry.id };
  }

  async markAgreementReceiptAvailableTx(tx: Prisma.TransactionClient, agreementId: string) {
    await tx.accountingEntry.updateMany({
      where: { agreementId, source: AccountingEntrySource.MEDILINK },
      data: { hasReceipt: true },
    });
  }

  private ensureCandidate(user: RequestUser) {
    if (user.role !== UserRole.CANDIDATE) throw new ForbiddenException('Espace comptable réservé aux candidats.');
  }

  private ensureWorkspace(scope: Scope) {
    return this.prisma.accountingWorkspace.upsert({ where: { ownerType_ownerId: scope }, create: scope, update: {} });
  }

  private async getWorkspace(scope: Scope) {
    const workspace = await this.prisma.accountingWorkspace.upsert({
      where: { ownerType_ownerId: scope },
      create: scope,
      update: {},
      include: {
        entries: {
          where: { status: { not: AccountingEntryStatus.VOIDED } },
          orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }],
        },
        classifications: { orderBy: { createdAt: 'asc' } },
      },
    });
    return {
      settings: { provisionRate: workspace.provisionRate, budgetLimit: workspace.budgetLimit },
      entries: workspace.entries.map((entry) => ({
        id: entry.id,
        kind: entry.kind,
        date: entry.entryDate.toISOString(),
        counterparty: entry.counterparty,
        mission: entry.missionLabel,
        amount: entry.amountCents / 100,
        amountCents: entry.amountCents,
        currency: entry.currency,
        paymentMethod: entry.paymentMethod,
        notes: entry.notes,
        hasReceipt: entry.hasReceipt,
        source: entry.source,
        status: entry.status,
        categoryCode: entry.categoryCode,
        professionalShareBps: entry.professionalShareBps,
        agreementId: entry.agreementId,
      })),
      classifiedIds: workspace.classifications.map((item) => item.recordKey),
    };
  }

  private async createEntry(user: RequestUser, scope: Scope, dto: CreateAccountingEntryDto) {
    const workspace = await this.ensureWorkspace(scope);
    const entryDate = new Date(dto.date);
    if (Number.isNaN(entryDate.getTime())) throw new BadRequestException('Date comptable invalide.');
    const category = dto.categoryCode
      ? ACCOUNTING_CATEGORIES.find((item) => item.code === dto.categoryCode && item.kind === dto.kind)
      : undefined;
    if (dto.categoryCode && !category) throw new BadRequestException('Catégorie comptable invalide pour cette écriture.');

    const entry = await this.prisma.accountingEntry.create({
      data: {
        workspaceId: workspace.id,
        kind: dto.kind,
        entryDate,
        counterparty: dto.counterparty.trim(),
        missionLabel: dto.mission.trim(),
        amountCents: dto.amountCents,
        currency: dto.currency || 'EUR',
        paymentMethod: dto.paymentMethod.trim(),
        notes: dto.notes?.trim() || null,
        hasReceipt: Boolean(dto.hasReceipt),
        source: AccountingEntrySource.MANUAL,
        status: AccountingEntryStatus.VALIDATED,
        categoryCode: category?.code || (dto.kind === AccountingEntryKind.REVENUE ? 'OTHER_REVENUE' : 'OTHER_EXPENSE'),
        professionalShareBps: dto.professionalShareBps ?? 10000,
        validatedAt: new Date(),
        createdById: user.id,
      },
    });
    await this.audit.log({ actorUserId: user.id, action: 'accounting.entry.created', entityType: 'accounting_entry', entityId: entry.id, metadata: scope });
    return scope.ownerType === AccountingOwnerType.CANDIDATE ? this.getCandidateWorkspace(user) : this.getWorkspace(scope);
  }

  private async deleteEntry(user: RequestUser, scope: Scope, entryId: string) {
    const workspace = await this.ensureWorkspace(scope);
    const entry = await this.prisma.accountingEntry.findFirst({ where: { id: entryId, workspaceId: workspace.id } });
    if (!entry) throw new NotFoundException('Écriture comptable introuvable.');
    if (entry.source !== AccountingEntrySource.MANUAL) {
      throw new BadRequestException('Une écriture issue de MédiLink ou de la banque doit être corrigée depuis sa source.');
    }
    await this.prisma.$transaction([
      this.prisma.accountingClassification.deleteMany({ where: { workspaceId: workspace.id, recordKey: entryId } }),
      this.prisma.accountingEntry.update({
        where: { id: entry.id },
        data: { status: AccountingEntryStatus.VOIDED, voidedAt: new Date() },
      }),
    ]);
    await this.audit.log({ actorUserId: user.id, action: 'accounting.entry.voided', entityType: 'accounting_entry', entityId: entry.id, metadata: scope });
    return scope.ownerType === AccountingOwnerType.CANDIDATE ? this.getCandidateWorkspace(user) : this.getWorkspace(scope);
  }

  private async updateSettings(user: RequestUser, scope: Scope, dto: UpdateAccountingSettingsDto) {
    await this.prisma.accountingWorkspace.upsert({
      where: { ownerType_ownerId: scope },
      create: { ...scope, provisionRate: dto.provisionRate, budgetLimit: dto.budgetLimit },
      update: { provisionRate: dto.provisionRate, budgetLimit: dto.budgetLimit },
    });
    await this.audit.log({ actorUserId: user.id, action: 'accounting.settings.updated', entityType: 'accounting_workspace', entityId: scope.ownerId, metadata: dto });
    return scope.ownerType === AccountingOwnerType.CANDIDATE ? this.getCandidateWorkspace(user) : this.getWorkspace(scope);
  }

  private async setClassification(user: RequestUser, scope: Scope, dto: SetAccountingClassificationDto) {
    const workspace = await this.ensureWorkspace(scope);
    if (dto.classified) {
      await this.prisma.accountingClassification.upsert({
        where: { workspaceId_recordKey: { workspaceId: workspace.id, recordKey: dto.recordKey } },
        create: { workspaceId: workspace.id, recordKey: dto.recordKey, createdById: user.id },
        update: { createdById: user.id },
      });
    } else {
      await this.prisma.accountingClassification.deleteMany({ where: { workspaceId: workspace.id, recordKey: dto.recordKey } });
    }
    return scope.ownerType === AccountingOwnerType.CANDIDATE ? this.getCandidateWorkspace(user) : this.getWorkspace(scope);
  }

  private async reconcileCandidateAccounting(candidateUserId: string, workspaceId: string) {
    const agreements = await this.prisma.missionAgreement.findMany({
      where: { candidateUserId, status: { in: ACTIVE_AGREEMENT_STATUSES } },
      include: { payment: true, invoices: true },
      orderBy: { createdAt: 'asc' },
    });

    for (const agreement of agreements) {
      const releasedAt = agreement.payment?.releasedAt || undefined;
      const inferredAmountCents = agreement.candidateAmount > 0 ? agreement.candidateAmount * 100 : undefined;
      const hasReceipt = agreement.invoices.some((invoice) => invoice.type === InvoiceType.CANDIDATE_RECEIPT);
      const status = agreement.status === MissionAgreementStatus.PAYMENT_RELEASED
        ? inferredAmountCents ? RetrocessionSettlementStatus.PAID : RetrocessionSettlementStatus.TO_VALIDATE
        : agreement.status === MissionAgreementStatus.COMPLETED
          ? RetrocessionSettlementStatus.TO_VALIDATE
          : RetrocessionSettlementStatus.EXPECTED;

      const existingSettlement = await this.prisma.retrocessionSettlement.findUnique({
        where: { agreementId: agreement.id },
      });
      if (!existingSettlement) {
        await this.prisma.retrocessionSettlement.create({
          data: {
            workspaceId,
            agreementId: agreement.id,
            status,
            rateBasisPoints: agreement.retrocessionPercentage ? agreement.retrocessionPercentage * 100 : null,
            finalAmountCents: inferredAmountCents,
            currency: agreement.currency,
            validatedAt: releasedAt,
            paidAt: releasedAt,
          },
        });
      } else {
        const preserveWorkflowStatus = existingSettlement.status === RetrocessionSettlementStatus.DISPUTED
          || existingSettlement.status === RetrocessionSettlementStatus.VALIDATED
          || existingSettlement.status === RetrocessionSettlementStatus.PAID;
        await this.prisma.retrocessionSettlement.update({
          where: { id: existingSettlement.id },
          data: {
            rateBasisPoints: agreement.retrocessionPercentage ? agreement.retrocessionPercentage * 100 : null,
            currency: agreement.currency,
            ...(!preserveWorkflowStatus ? {
              status,
              ...(releasedAt ? {
                finalAmountCents: inferredAmountCents,
                validatedAt: releasedAt,
                paidAt: releasedAt,
              } : {}),
            } : {}),
          },
        });
      }

      if (releasedAt && inferredAmountCents) {
        await this.materializeLegacyReleasedAgreement(agreement, workspaceId, inferredAmountCents, releasedAt, hasReceipt);
      }
    }
  }

  private async materializeLegacyReleasedAgreement(
    agreement: Awaited<ReturnType<PrismaService['missionAgreement']['findFirst']>> & {
      id: string;
      establishmentId: string;
      missionId: string;
      candidateUserId: string;
      currency: string;
      retrocessionPercentage: number | null;
    },
    workspaceId: string,
    amountCents: number,
    paidAt: Date,
    hasReceipt: boolean,
  ) {
    const [establishment, mission] = await Promise.all([
      this.prisma.establishment.findUnique({ where: { id: agreement.establishmentId }, select: { name: true } }),
      this.prisma.mission.findUnique({ where: { id: agreement.missionId }, select: { title: true } }),
    ]);
    await this.prisma.accountingEntry.upsert({
      where: { workspaceId_sourceKey: { workspaceId, sourceKey: this.agreementRevenueSourceKey(agreement.id) } },
      create: {
        workspaceId,
        kind: AccountingEntryKind.REVENUE,
        entryDate: paidAt,
        counterparty: establishment?.name || 'Établissement',
        missionLabel: mission?.title || 'Mission MédiLink',
        amountCents,
        currency: agreement.currency,
        paymentMethod: 'Virement MédiLink',
        notes: agreement.retrocessionPercentage ? `Rétrocession contractuelle de ${agreement.retrocessionPercentage}%` : null,
        hasReceipt,
        source: AccountingEntrySource.MEDILINK,
        status: AccountingEntryStatus.VALIDATED,
        categoryCode: agreement.retrocessionPercentage ? 'RETROCESSION_HONORAIRES' : 'VACATION_LIBERALE',
        agreementId: agreement.id,
        sourceKey: this.agreementRevenueSourceKey(agreement.id),
        validatedAt: paidAt,
        createdById: agreement.candidateUserId,
      },
      update: { hasReceipt, status: AccountingEntryStatus.VALIDATED, voidedAt: null },
    });
  }

  private agreementRevenueSourceKey(agreementId: string) {
    return `medilink:agreement:${agreementId}:revenue`;
  }

  private profilePayload(profile: {
    taxRegime: string | null;
    socialScheme: string | null;
    activityMode: string | null;
    declarationFrequency: string | null;
    activityStartDate: Date | null;
    exclusiveLocum: boolean | null;
    hasOtherIndependentActivity: boolean | null;
    onboardingCompletedAt: Date | null;
  }) {
    return {
      taxRegime: profile.taxRegime,
      socialScheme: profile.socialScheme,
      activityMode: profile.activityMode,
      declarationFrequency: profile.declarationFrequency,
      activityStartDate: profile.activityStartDate?.toISOString() || null,
      exclusiveLocum: profile.exclusiveLocum,
      hasOtherIndependentActivity: profile.hasOtherIndependentActivity,
      onboardingCompleted: Boolean(profile.onboardingCompletedAt),
    };
  }

  private settlementPayload(settlement: any) {
    const agreement = settlement.agreement;
    return {
      id: settlement.id,
      agreementId: settlement.agreementId,
      conversationId: agreement.conversationId,
      missionId: agreement.missionId,
      mission: agreement.mission.title,
      client: agreement.mission.establishment.name,
      startDate: agreement.startDate?.toISOString() || agreement.mission.startDate?.toISOString() || null,
      endDate: agreement.endDate?.toISOString() || agreement.mission.endDate?.toISOString() || null,
      agreementStatus: agreement.status,
      status: settlement.status,
      retrocessionPercentage: settlement.rateBasisPoints ? settlement.rateBasisPoints / 100 : agreement.retrocessionPercentage,
      grossHonorariaCents: settlement.grossHonorariaCents,
      expectedAmountCents: settlement.expectedAmountCents,
      finalAmountCents: settlement.finalAmountCents,
      amount: settlement.finalAmountCents ? settlement.finalAmountCents / 100 : settlement.expectedAmountCents ? settlement.expectedAmountCents / 100 : 0,
      currency: settlement.currency,
      dueDate: settlement.dueDate?.toISOString() || null,
      validatedAt: settlement.validatedAt?.toISOString() || null,
      paidAt: settlement.paidAt?.toISOString() || agreement.payment?.releasedAt?.toISOString() || null,
      hasReceipt: agreement.invoices.some((invoice: { type: InvoiceType }) => invoice.type === InvoiceType.CANDIDATE_RECEIPT),
      notes: settlement.notes,
    };
  }

  private ensureEstablishmentFinanceAccess(userId: string, establishmentId: string) {
    return this.permissions.ensureEstablishmentMember(userId, establishmentId, [
      EstablishmentMemberRole.OWNER,
      EstablishmentMemberRole.ADMIN,
    ]);
  }

  private rulesPayload() {
    return {
      microBncThresholds: { 2025: 77700, 2026: 83600, 2027: 83600, 2028: 83600 },
      rspmAnnualThreshold: 19000,
      defaultProvisionRate: 45,
    };
  }
}
