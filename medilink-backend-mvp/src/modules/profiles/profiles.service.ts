import { Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfilesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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

    return profile;
  }

  async updateMyProfile(userId: string, dto: UpdateProfileDto) {
    await this.ensureProfile(userId);
    const completionScore = this.computeCompletionScore(dto);

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
    if (!profile || profile.completionScore < minimum) {
      throw new NotFoundException(
        `Profil incomplet. Score minimum requis : ${minimum}%.`,
      );
    }
    return profile;
  }

  private computeCompletionScore(data: Partial<UpdateProfileDto>) {
    const fields = [
      data.firstName,
      data.lastName,
      data.city,
      data.medicalStatus,
      data.specialty,
      data.hospitalOrFaculty,
      data.availabilityNotes,
    ];

    const filled = fields.filter(Boolean).length;
    return Math.round((filled / fields.length) * 100);
  }
}
