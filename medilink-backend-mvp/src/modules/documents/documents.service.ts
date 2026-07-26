import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DocumentType, DocumentVerificationStatus, UserRole } from '@prisma/client';
import { randomUUID } from 'crypto';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUploadUrlDto } from './dto/create-upload-url.dto';
import { StorageService } from './storage.service';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];

const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async listMine(userId: string) {
    return this.prisma.document.findMany({
      where: {
        userId,
        verificationStatus: { not: DocumentVerificationStatus.DELETED },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createUploadUrl(user: RequestUser, dto: CreateUploadUrlDto) {
    this.validateFile(dto);

    const safeFileName =
      dto.fileName
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.{2,}/g, '.')
        .replace(/^\.+/, '') || 'document';
    const storageKey = `quarantine/documents/${user.id}/${randomUUID()}-${safeFileName}`;

    const document = await this.prisma.document.create({
      data: {
        userId: user.id,
        documentType: dto.documentType,
        fileName: safeFileName,
        storageKey,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes,
        verificationStatus: DocumentVerificationStatus.UPLOAD_PENDING,
      },
    });

    const signed = await this.storage.createUploadUrl(
      storageKey,
      dto.mimeType,
      dto.sizeBytes,
    );

    await this.audit.log({
      actorUserId: user.id,
      action: 'document.upload_url_created',
      entityType: 'document',
      entityId: document.id,
      metadata: { documentType: dto.documentType, mimeType: dto.mimeType },
    });

    return {
      documentId: document.id,
      storageKey,
      ...signed,
    };
  }

  async confirmUpload(user: RequestUser, documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });

    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }

    if (document.userId !== user.id) {
      throw new ForbiddenException('Vous ne pouvez confirmer que vos documents.');
    }

    if (document.verificationStatus !== DocumentVerificationStatus.UPLOAD_PENDING) {
      throw new ConflictException('Ce document a deja ete confirme.');
    }

    const finalStorageKey =
      `validated/documents/${document.userId}/${document.id}-${document.fileName}`;

    try {
      await this.storage.promoteUploadedObject(document.storageKey, finalStorageKey);
    } catch {
      // A previous attempt may already have copied the object before failing
      // while deleting the quarantine copy. The final object is authoritative.
    }

    try {
      await this.storage.assertUploadedObject(
        finalStorageKey,
        document.mimeType,
        document.sizeBytes,
      );
    } catch {
      await this.storage.deleteObject(finalStorageKey).catch(() => undefined);
      throw new BadRequestException(
        'Le fichier est absent, incomplet ou ne correspond pas au type declare.',
      );
    }

    const claimed = await this.prisma.document.updateMany({
      where: {
        id: document.id,
        userId: user.id,
        storageKey: document.storageKey,
        verificationStatus: DocumentVerificationStatus.UPLOAD_PENDING,
      },
      data: {
        storageKey: finalStorageKey,
        verificationStatus:
          document.documentType === DocumentType.AVATAR
            ? DocumentVerificationStatus.APPROVED
            : DocumentVerificationStatus.PENDING_VERIFICATION,
      },
    });

    if (claimed.count !== 1) {
      throw new ConflictException('Ce document a deja ete confirme.');
    }

    const updated = await this.prisma.document.findUniqueOrThrow({
      where: { id: document.id },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'document.upload_confirmed',
      entityType: 'document',
      entityId: document.id,
    });

    return updated;
  }

  async getDownloadUrl(user: RequestUser, documentId: string) {
    const document = await this.permissions.ensureCanViewDocument(user, documentId);

    if (document.verificationStatus === DocumentVerificationStatus.DELETED) {
      throw new NotFoundException('Document introuvable.');
    }

    const signed = await this.storage.createDownloadUrl(
      document.storageKey,
      document.fileName,
      document.mimeType,
    );

    await this.audit.log({
      actorUserId: user.id,
      action: 'document.download_url_created',
      entityType: 'document',
      entityId: document.id,
      metadata: { ownerUserId: document.userId },
    });

    return signed;
  }

  async softDelete(user: RequestUser, documentId: string) {
    const document = await this.prisma.document.findUnique({ where: { id: documentId } });

    if (!document) {
      throw new NotFoundException('Document introuvable.');
    }

    const isOwner = document.userId === user.id;
    const isAdmin =
  user.role === UserRole.MEDILINK_ADMIN ||
  user.role === UserRole.MEDILINK_SUPPORT;

    if (!isOwner && !isAdmin) {
      throw new ForbiddenException('Vous ne pouvez pas supprimer ce document.');
    }

    await this.storage.deleteObject(document.storageKey);

    const updated = await this.prisma.document.update({
      where: { id: document.id },
      data: { verificationStatus: DocumentVerificationStatus.DELETED },
    });

    await this.audit.log({
      actorUserId: user.id,
      action: 'document.deleted',
      entityType: 'document',
      entityId: document.id,
    });

    return updated;
  }

  private validateFile(dto: CreateUploadUrlDto) {
    if (!ALLOWED_MIME_TYPES.includes(dto.mimeType)) {
      throw new BadRequestException('Type de fichier non autorisé.');
    }

    if (
      dto.documentType === DocumentType.AVATAR &&
      !ALLOWED_AVATAR_MIME_TYPES.includes(dto.mimeType)
    ) {
      throw new BadRequestException('La photo de profil doit etre une image.');
    }

    if (dto.documentType === DocumentType.AVATAR && dto.sizeBytes > 3 * 1024 * 1024) {
      throw new BadRequestException('Avatar limité à 3 Mo.');
    }

    if (dto.documentType !== DocumentType.AVATAR && dto.sizeBytes > 25 * 1024 * 1024) {
      throw new BadRequestException('Document limité à 25 Mo.');
    }
  }
}
