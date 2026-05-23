import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  DocumentType,
  DocumentVerificationStatus,
  MissionStatus,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  listUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        emailVerified: true,
        phone: true,
        createdAt: true,
        profile: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async suspendUser(admin: RequestUser, userId: string) {
    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: UserStatus.SUSPENDED },
    });

    await this.audit.log({
      actorUserId: admin.id,
      action: 'admin.user_suspended',
      entityType: 'user',
      entityId: userId,
    });

    return updated;
  }

  listDocuments(status?: DocumentVerificationStatus) {
    return this.prisma.document.findMany({
      where: {
        documentType: { not: DocumentType.AVATAR },
        ...(status ? { verificationStatus: status } : {}),
      },
      include: { owner: { select: { id: true, email: true, profile: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async approveDocument(admin: RequestUser, documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document introuvable.');
    if (document.documentType === DocumentType.AVATAR) {
      throw new BadRequestException('La photo de profil ne passe pas par la validation admin.');
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        verificationStatus: DocumentVerificationStatus.APPROVED,
        verifiedById: admin.id,
        verifiedAt: new Date(),
        rejectionReason: null,
      },
    });

    await this.notifications.notifyDocumentStatus(document.userId, 'APPROVED');

    await this.audit.log({
      actorUserId: admin.id,
      action: 'admin.document_approved',
      entityType: 'document',
      entityId: documentId,
      metadata: { ownerUserId: document.userId },
    });

    return updated;
  }

  async rejectDocument(admin: RequestUser, documentId: string, reason: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!document) throw new NotFoundException('Document introuvable.');
    if (document.documentType === DocumentType.AVATAR) {
      throw new BadRequestException('La photo de profil ne passe pas par la validation admin.');
    }

    const updated = await this.prisma.document.update({
      where: { id: documentId },
      data: {
        verificationStatus: DocumentVerificationStatus.REJECTED,
        verifiedById: admin.id,
        verifiedAt: new Date(),
        rejectionReason: reason,
      },
    });

    await this.notifications.notifyDocumentStatus(document.userId, 'REJECTED', reason);

    await this.audit.log({
      actorUserId: admin.id,
      action: 'admin.document_rejected',
      entityType: 'document',
      entityId: documentId,
      metadata: { ownerUserId: document.userId, reason },
    });

    return updated;
  }

  listEstablishments() {
    return this.prisma.establishment.findMany({
      include: { members: { include: { user: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async verifyEstablishment(admin: RequestUser, establishmentId: string) {
    const updated = await this.prisma.establishment.update({
      where: { id: establishmentId },
      data: { verificationStatus: VerificationStatus.VERIFIED },
    });

    await this.audit.log({
      actorUserId: admin.id,
      action: 'admin.establishment_verified',
      entityType: 'establishment',
      entityId: establishmentId,
    });

    return updated;
  }

  listMissions() {
    return this.prisma.mission.findMany({
      include: { establishment: true, tags: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async unpublishMission(admin: RequestUser, missionId: string) {
    const updated = await this.prisma.mission.update({
      where: { id: missionId },
      data: { status: MissionStatus.PAUSED },
    });

    await this.audit.log({
      actorUserId: admin.id,
      action: 'admin.mission_unpublished',
      entityType: 'mission',
      entityId: missionId,
    });

    return updated;
  }
}
