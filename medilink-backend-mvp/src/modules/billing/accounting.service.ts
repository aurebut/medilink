import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountingEntryKind, AccountingOwnerType, UserRole } from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAccountingEntryDto, SetAccountingClassificationDto, UpdateAccountingSettingsDto } from './dto/accounting.dto';

type Scope = { ownerType: AccountingOwnerType; ownerId: string };

@Injectable()
export class AccountingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async getCandidateWorkspace(user: RequestUser) {
    this.ensureCandidate(user);
    return this.getWorkspace({ ownerType: AccountingOwnerType.CANDIDATE, ownerId: user.id });
  }

  async createCandidateEntry(user: RequestUser, dto: CreateAccountingEntryDto) {
    this.ensureCandidate(user);
    if (dto.kind !== AccountingEntryKind.REVENUE) throw new BadRequestException('Une recette est attendue pour cet espace.');
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

  async classifyCandidateRecord(user: RequestUser, dto: SetAccountingClassificationDto) {
    this.ensureCandidate(user);
    return this.setClassification(user, { ownerType: AccountingOwnerType.CANDIDATE, ownerId: user.id }, dto);
  }

  async getEstablishmentWorkspace(user: RequestUser, establishmentId: string) {
    await this.permissions.ensureEstablishmentMember(user.id, establishmentId);
    return this.getWorkspace({ ownerType: AccountingOwnerType.ESTABLISHMENT, ownerId: establishmentId });
  }

  async createEstablishmentEntry(user: RequestUser, establishmentId: string, dto: CreateAccountingEntryDto) {
    await this.permissions.ensureEstablishmentMember(user.id, establishmentId);
    if (dto.kind !== AccountingEntryKind.EXPENSE) throw new BadRequestException('Une depense est attendue pour cet espace.');
    return this.createEntry(user, { ownerType: AccountingOwnerType.ESTABLISHMENT, ownerId: establishmentId }, dto);
  }

  async deleteEstablishmentEntry(user: RequestUser, establishmentId: string, entryId: string) {
    await this.permissions.ensureEstablishmentMember(user.id, establishmentId);
    return this.deleteEntry(user, { ownerType: AccountingOwnerType.ESTABLISHMENT, ownerId: establishmentId }, entryId);
  }

  async updateEstablishmentSettings(user: RequestUser, establishmentId: string, dto: UpdateAccountingSettingsDto) {
    await this.permissions.ensureEstablishmentMember(user.id, establishmentId);
    return this.updateSettings(user, { ownerType: AccountingOwnerType.ESTABLISHMENT, ownerId: establishmentId }, dto);
  }

  async classifyEstablishmentRecord(user: RequestUser, establishmentId: string, dto: SetAccountingClassificationDto) {
    await this.permissions.ensureEstablishmentMember(user.id, establishmentId);
    return this.setClassification(user, { ownerType: AccountingOwnerType.ESTABLISHMENT, ownerId: establishmentId }, dto);
  }

  private ensureCandidate(user: RequestUser) {
    if (user.role !== UserRole.CANDIDATE) throw new ForbiddenException('Espace comptable reserve aux candidats.');
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
        entries: { orderBy: [{ entryDate: 'desc' }, { createdAt: 'desc' }] },
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
        currency: entry.currency,
        paymentMethod: entry.paymentMethod,
        notes: entry.notes,
        hasReceipt: entry.hasReceipt,
      })),
      classifiedIds: workspace.classifications.map((item) => item.recordKey),
    };
  }

  private async createEntry(user: RequestUser, scope: Scope, dto: CreateAccountingEntryDto) {
    const workspace = await this.ensureWorkspace(scope);
    const entryDate = new Date(dto.date);
    if (Number.isNaN(entryDate.getTime())) throw new BadRequestException('Date comptable invalide.');
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
        createdById: user.id,
      },
    });
    await this.audit.log({ actorUserId: user.id, action: 'accounting.entry.created', entityType: 'accounting_entry', entityId: entry.id, metadata: scope });
    return this.getWorkspace(scope);
  }

  private async deleteEntry(user: RequestUser, scope: Scope, entryId: string) {
    const workspace = await this.ensureWorkspace(scope);
    const entry = await this.prisma.accountingEntry.findFirst({ where: { id: entryId, workspaceId: workspace.id } });
    if (!entry) throw new NotFoundException('Ecriture comptable introuvable.');
    await this.prisma.$transaction([
      this.prisma.accountingClassification.deleteMany({ where: { workspaceId: workspace.id, recordKey: entryId } }),
      this.prisma.accountingEntry.delete({ where: { id: entry.id } }),
    ]);
    await this.audit.log({ actorUserId: user.id, action: 'accounting.entry.deleted', entityType: 'accounting_entry', entityId: entry.id, metadata: scope });
    return this.getWorkspace(scope);
  }

  private async updateSettings(user: RequestUser, scope: Scope, dto: UpdateAccountingSettingsDto) {
    await this.prisma.accountingWorkspace.upsert({
      where: { ownerType_ownerId: scope },
      create: { ...scope, provisionRate: dto.provisionRate, budgetLimit: dto.budgetLimit },
      update: { provisionRate: dto.provisionRate, budgetLimit: dto.budgetLimit },
    });
    await this.audit.log({ actorUserId: user.id, action: 'accounting.settings.updated', entityType: 'accounting_workspace', entityId: scope.ownerId, metadata: dto });
    return this.getWorkspace(scope);
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
    return this.getWorkspace(scope);
  }
}
