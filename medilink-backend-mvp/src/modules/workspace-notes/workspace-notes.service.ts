import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { EstablishmentMemberRole, UserRole } from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { PermissionsService } from '../permissions/permissions.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListWorkspaceNotesDto } from './dto/list-workspace-notes.dto';
import { SaveWorkspaceNoteDto } from './dto/save-workspace-note.dto';

const ALL_ESTABLISHMENT_ROLES = [
  EstablishmentMemberRole.OWNER,
  EstablishmentMemberRole.ADMIN,
  EstablishmentMemberRole.RECRUITER,
  EstablishmentMemberRole.VIEWER,
];

const WRITABLE_ESTABLISHMENT_ROLES = [
  EstablishmentMemberRole.OWNER,
  EstablishmentMemberRole.ADMIN,
  EstablishmentMemberRole.RECRUITER,
];

const NOTE_KEY_PATTERN =
  /^(agenda:\d{4}-\d{2}-\d{2}|mission:[A-Za-z0-9_-]{1,100})$/;

@Injectable()
export class WorkspaceNotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly permissions: PermissionsService,
    private readonly audit: AuditService,
  ) {}

  async list(user: RequestUser, dto: ListWorkspaceNotesDto) {
    const owner = await this.resolveOwner(
      user,
      dto.establishmentId,
      false,
    );

    return this.prisma.workspaceNote.findMany({
      where: {
        ...owner,
        ...(dto.prefix ? { key: { startsWith: dto.prefix } } : {}),
      },
      select: {
        key: true,
        content: true,
        updatedAt: true,
        updatedById: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async save(user: RequestUser, rawKey: string, dto: SaveWorkspaceNoteDto) {
    const key = rawKey.trim();
    if (!NOTE_KEY_PATTERN.test(key)) {
      throw new BadRequestException('Clé de note invalide.');
    }

    const owner = await this.resolveOwner(
      user,
      dto.establishmentId,
      true,
    );
    const content = dto.content.trim();
    const existing = await this.prisma.workspaceNote.findFirst({
      where: { ...owner, key },
      select: { id: true },
    });

    if (!content) {
      if (existing) {
        await this.prisma.workspaceNote.delete({ where: { id: existing.id } });
      }
      await this.logChange(user, key, owner, 'workspace_note.deleted');
      return { key, content: '', updatedAt: new Date().toISOString() };
    }

    const note = existing
      ? await this.prisma.workspaceNote.update({
          where: { id: existing.id },
          data: { content, updatedById: user.id },
        })
      : await this.prisma.workspaceNote.create({
          data: {
            key,
            content,
            updatedById: user.id,
            ...owner,
          },
        });

    await this.logChange(user, key, owner, 'workspace_note.saved');
    return {
      key: note.key,
      content: note.content,
      updatedAt: note.updatedAt,
      updatedById: note.updatedById,
    };
  }

  private async resolveOwner(
    user: RequestUser,
    establishmentId: string | undefined,
    writable: boolean,
  ) {
    if (user.role === UserRole.CANDIDATE) {
      if (establishmentId) {
        throw new ForbiddenException(
          'Un candidat ne peut pas modifier les notes d’un établissement.',
        );
      }
      return { ownerUserId: user.id, establishmentId: null };
    }

    if (!user.role.startsWith('ESTABLISHMENT_') || !establishmentId) {
      throw new ForbiddenException('Contexte de notes non autorisé.');
    }

    await this.permissions.ensureEstablishmentMember(
      user.id,
      establishmentId,
      writable ? WRITABLE_ESTABLISHMENT_ROLES : ALL_ESTABLISHMENT_ROLES,
    );
    return { ownerUserId: null, establishmentId };
  }

  private async logChange(
    user: RequestUser,
    key: string,
    owner: { ownerUserId: string | null; establishmentId: string | null },
    action: string,
  ) {
    await this.audit.log({
      actorUserId: user.id,
      action,
      entityType: 'workspace_note',
      entityId: key,
      metadata: {
        scope: owner.establishmentId ? 'establishment' : 'candidate',
        establishmentId: owner.establishmentId,
      },
    });
  }
}
