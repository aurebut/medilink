import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DocumentType,
  DocumentVerificationStatus,
  HealthVerificationStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { calculateCompletionScore } from '../../common/utils/completion.util';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../documents/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnsDirectoryService, HealthVerificationResult } from './ans-directory.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly ansDirectory: AnsDirectoryService,
  ) {}

  async getMyProfile(userId: string) {
    let profile = await this.prisma.profile.findUnique({
      where: { userId },
      include: { userSkills: { include: { skill: true } } },
    });

    if (!profile) {
      profile = await this.prisma.profile.create({
        data: { userId },
        include: { userSkills: { include: { skill: true } } },
      });
    }

    const completionScore = this.computeCompletionScore(profile);
    if (profile.completionScore !== completionScore) {
      await this.prisma.profile.update({
        where: { id: profile.id },
        data: { completionScore },
      });
      profile = { ...profile, completionScore };
    }

    const avatar = await this.prisma.document.findFirst({
      where: {
        userId,
        documentType: DocumentType.AVATAR,
        verificationStatus: DocumentVerificationStatus.APPROVED,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!avatar) return profile;

    const signed = await this.storage.createDownloadUrl(
      avatar.storageKey,
      avatar.fileName,
      avatar.mimeType,
    );

    return {
      ...profile,
      avatarUrl: signed.downloadUrl,
    };
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    const existing = await this.ensureProfile(userId);
    const normalizedDto = {
      ...dto,
      firstName: dto.firstName?.trim(),
      lastName: dto.lastName?.trim(),
    };
    const completionScore = this.computeCompletionScore({ ...existing, ...normalizedDto });
    const identityChanged =
      (normalizedDto.firstName !== undefined &&
        this.identityValue(normalizedDto.firstName) !== this.identityValue(existing.firstName)) ||
      (normalizedDto.lastName !== undefined &&
        this.identityValue(normalizedDto.lastName) !== this.identityValue(existing.lastName));

    const profile = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...normalizedDto,
        completionScore,
        ...(identityChanged
          ? {
              rpps: null,
              healthVerificationStatus: HealthVerificationStatus.NOT_SUBMITTED,
              healthVerifiedAt: null,
              healthVerificationCheckedAt: null,
              ansPractitionerId: null,
              ansPractitionerLastUpdated: null,
              verifiedProfession: null,
              verifiedSpecialty: null,
              healthVerificationPayload: Prisma.DbNull,
            }
          : {}),
      },
    });

    await this.audit.log({
      actorUserId: userId,
      action: 'profile.updated',
      entityType: 'profile',
      entityId: profile.id,
    });

    return profile;
  }

  async verifyHealthProfessional(user: RequestUser, rppsInput: string) {
    if (user.role !== UserRole.CANDIDATE) {
      throw new ForbiddenException('Verification reservee aux candidats.');
    }

    const profile = await this.ensureProfile(user.id);
    const rpps = this.ansDirectory.normalizeRpps(rppsInput);
    if (rpps.length < 8 || rpps.length > 14) {
      throw new BadRequestException('Numéro RPPS invalide.');
    }

    if (!this.hasVerifiableName(profile.firstName) || !this.hasVerifiableName(profile.lastName)) {
      throw new BadRequestException(
        'Un prénom et un nom complets sont requis pour vérifier le RPPS.',
      );
    }

    const pendingProfile = await this.prisma.profile.update({
      where: { userId: user.id },
      data: {
        rpps: profile.rpps && profile.rpps !== rpps ? null : undefined,
        healthVerificationStatus: HealthVerificationStatus.PENDING,
        healthVerifiedAt: null,
        healthVerificationCheckedAt: new Date(),
        ansPractitionerId: null,
        ansPractitionerLastUpdated: null,
        verifiedProfession: null,
        verifiedSpecialty: null,
        healthVerificationPayload: { pendingRpps: rpps },
      },
    });

    let result: HealthVerificationResult;
    try {
      result = await this.ansDirectory.verifyPractitioner({
        rpps,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
    } catch (error) {
      await this.prisma.profile.updateMany({
        where: {
          userId: user.id,
          updatedAt: pendingProfile.updatedAt,
          healthVerificationStatus: HealthVerificationStatus.PENDING,
        },
        data: {
          rpps: null,
          healthVerificationStatus: HealthVerificationStatus.ERROR,
          healthVerificationCheckedAt: new Date(),
        },
      });

      await this.audit.log({
        actorUserId: user.id,
        action: 'profile.health_verification_error',
        entityType: 'profile',
        entityId: pendingProfile.id,
        metadata: { rppsLast4: rpps.slice(-4) },
      });

      throw error;
    }

    const status = result.notFound
      ? HealthVerificationStatus.NOT_FOUND
      : result.matched
        ? HealthVerificationStatus.VERIFIED
        : HealthVerificationStatus.MISMATCH;
    const checkedAt = new Date();

    try {
      const applied = await this.prisma.profile.updateMany({
        where: {
          userId: user.id,
          updatedAt: pendingProfile.updatedAt,
          healthVerificationStatus: HealthVerificationStatus.PENDING,
        },
        data: {
          rpps: status === HealthVerificationStatus.VERIFIED ? rpps : null,
          healthVerificationStatus: status,
          healthVerifiedAt: status === HealthVerificationStatus.VERIFIED ? checkedAt : null,
          healthVerificationCheckedAt: checkedAt,
          ansPractitionerId: result.practitioner?.id,
          ansPractitionerLastUpdated: result.practitioner?.lastUpdated
            ? new Date(result.practitioner.lastUpdated)
            : null,
          verifiedProfession: result.practitioner?.profession,
          verifiedSpecialty: result.practitioner?.specialty,
          healthVerificationPayload: result.rawSummary as Prisma.InputJsonValue,
        },
      });

      if (applied.count !== 1) {
        throw new ConflictException(
          'Le profil a été modifié pendant la vérification. Veuillez recommencer.',
        );
      }
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        await this.prisma.profile.updateMany({
          where: {
            userId: user.id,
            updatedAt: pendingProfile.updatedAt,
            healthVerificationStatus: HealthVerificationStatus.PENDING,
          },
          data: {
            rpps: null,
            healthVerificationStatus: HealthVerificationStatus.MISMATCH,
            healthVerificationCheckedAt: checkedAt,
          },
        });
        throw new ConflictException('Ce numéro RPPS est déjà associé à un autre compte.');
      }
      throw error;
    }

    const updated = await this.prisma.profile.findUniqueOrThrow({
      where: { userId: user.id },
    });

    await this.audit.log({
      actorUserId: user.id,
      action:
        status === HealthVerificationStatus.VERIFIED
          ? 'profile.health_verified'
          : 'profile.health_verification_failed',
      entityType: 'profile',
      entityId: updated.id,
      metadata: {
        rppsLast4: rpps.slice(-4),
        status,
        bundleTotal: result.bundleTotal,
      },
    });

    return updated;
  }

  async ensureProfile(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    if (profile) return profile;
    return this.prisma.profile.create({ data: { userId } });
  }

  async assertMinimumCompletion(userId: string, minimum = 40) {
    const profile = await this.prisma.profile.findUnique({ where: { userId } });
    const completionScore = profile ? this.computeCompletionScore(profile) : 0;

    if (!profile || completionScore < minimum) {
      throw new NotFoundException(
        `Profil incomplet. Score minimum requis : ${minimum}%.`,
      );
    }

    if (profile.completionScore !== completionScore) {
      return this.prisma.profile.update({
        where: { id: profile.id },
        data: { completionScore },
      });
    }

    return profile;
  }

  private computeCompletionScore(data: Partial<UpdateProfileDto>) {
    const fields = [
      data.firstName,
      data.lastName,
      data.candidateGender,
      data.city,
      data.medicalStatus,
      data.specialty,
      data.orientation,
      data.hospitalOrFaculty,
      data.bio,
      data.experienceYears,
      data.actsPerformed,
      data.availabilityNotes,
      data.preferredCities,
      data.maxTravelRadiusKm,
      data.mobilityOptions,
      data.acceptedWeekdays,
      data.acceptedTimeSlots,
      data.minimumNoticeHours,
      data.mobilityRangeType,
      data.housingRequiredBeyondKm,
      data.acceptedPracticeSettings,
      data.acceptedMissionTypes,
      data.minimumCompensation,
      data.preferredDurations,
      data.knownSoftware,
      data.acceptedPatientTypes,
      data.refusedPatientTypes,
      data.maxPatientsPerDay,
      data.parkingRequired,
      data.acceptedActs,
      data.refusedActs,
      data.secretaryRequired,
      data.accommodationRequired,
      data.fastPaymentImportant,
      data.acceptedPressureLevel,
    ];

    if (data.medicalStatus === 'OTHER') {
      fields.push(data.medicalStatusOther);
    }

    return calculateCompletionScore(fields);
  }

  private identityValue(value?: string | null) {
    return (value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private hasVerifiableName(value?: string | null) {
    return this.identityValue(value)
      .split(/[^a-z]+/)
      .some((token) => token.length >= 2);
  }
}
