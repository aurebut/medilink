import { Injectable, NotFoundException } from '@nestjs/common';
import { DocumentType, DocumentVerificationStatus } from '@prisma/client';
import { calculateCompletionScore } from '../../common/utils/completion.util';
import { AuditService } from '../audit/audit.service';
import { StorageService } from '../documents/storage.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
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
      data.acceptedMissionTypes,
      data.minimumCompensation,
      data.preferredDurations,
      data.knownSoftware,
      data.acceptedPatientTypes,
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
