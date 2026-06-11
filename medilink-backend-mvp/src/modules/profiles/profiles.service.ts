import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { AnsDirectoryService } from './ans-directory.service';
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
    const completionScore = this.computeCompletionScore({ ...existing, ...dto });

    const profile = await this.prisma.profile.update({
      where: { userId },
      data: {
        ...dto,
        completionScore,
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
      throw new BadRequestException('Numero RPPS invalide.');
    }

    await this.prisma.profile.update({
      where: { userId: user.id },
      data: {
        rpps,
        healthVerificationStatus: HealthVerificationStatus.PENDING,
        healthVerificationCheckedAt: new Date(),
      },
    });

    try {
      const result = await this.ansDirectory.verifyPractitioner({
        rpps,
        firstName: profile.firstName,
        lastName: profile.lastName,
      });
      const status = result.notFound
        ? HealthVerificationStatus.NOT_FOUND
        : result.matched
          ? HealthVerificationStatus.VERIFIED
          : HealthVerificationStatus.MISMATCH;
      const checkedAt = new Date();
      const updated = await this.prisma.profile.update({
        where: { userId: user.id },
        data: {
          rpps,
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

      await this.audit.log({
        actorUserId: user.id,
        action:
          status === HealthVerificationStatus.VERIFIED
            ? 'profile.health_verified'
            : 'profile.health_verification_failed',
        entityType: 'profile',
        entityId: updated.id,
        metadata: { rpps, status, bundleTotal: result.bundleTotal },
      });

      return updated;
    } catch (error) {
      const updated = await this.prisma.profile.update({
        where: { userId: user.id },
        data: {
          rpps,
          healthVerificationStatus: HealthVerificationStatus.ERROR,
          healthVerificationCheckedAt: new Date(),
        },
      });

      await this.audit.log({
        actorUserId: user.id,
        action: 'profile.health_verification_error',
        entityType: 'profile',
        entityId: updated.id,
        metadata: { rpps },
      });

      throw error;
    }
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
}
