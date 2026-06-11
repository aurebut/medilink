import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  HealthVerificationStatus,
  MedicalStatus,
  MissionMatchNotificationStatus,
  MissionStatus,
  NotificationType,
  Prisma,
  RequiredLevel,
  UserRole,
  UserStatus,
} from '@prisma/client';
import { RequestUser } from '../../common/types/request-user.type';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../notifications/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { DispatchMissionMatchesDto } from './dto/dispatch-mission-matches.dto';

const MATCH_TIERS = [
  { label: 'excellent', minimumScore: 85 },
  { label: 'strong', minimumScore: 75 },
  { label: 'good', minimumScore: 65 },
  { label: 'exploratory', minimumScore: 55 },
];

type MatchBreakdown = Record<string, number>;

type ScoredCandidate = {
  candidateUserId: string;
  email: string;
  displayName: string;
  score: number;
  tier: string;
  reasons: string[];
  breakdown: MatchBreakdown;
  alreadyNotified: boolean;
};

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  async previewMissionMatches(missionId: string, limit = 50) {
    const mission = await this.getPublishedMission(missionId);
    const scored = await this.scoreCandidatesForMission(mission, Math.min(limit, 200));

    await this.persistScores(missionId, scored);

    return {
      mission: this.missionSummary(mission),
      thresholds: MATCH_TIERS,
      total: scored.length,
      items: scored,
    };
  }

  async dispatchMissionMatches(
    admin: RequestUser,
    missionId: string,
    dto: DispatchMissionMatchesDto,
  ) {
    const mission = await this.getPublishedMission(missionId);
    const targetCount = dto.targetCount ?? 5;
    const minimumScore = dto.minimumScore ?? MATCH_TIERS[MATCH_TIERS.length - 1].minimumScore;
    const scored = (await this.scoreCandidatesForMission(mission, 200))
      .filter((candidate) => candidate.score >= minimumScore);

    await this.persistScores(missionId, scored);

    const unsent = scored.filter((candidate) => !candidate.alreadyNotified);
    const selected = this.selectGradualBatch(unsent, targetCount, minimumScore);

    if (!selected.length) {
      await this.audit.log({
        actorUserId: admin.id,
        action: 'matching.dispatch.empty',
        entityType: 'mission',
        entityId: missionId,
        metadata: { targetCount, minimumScore },
      });

      return {
        mission: this.missionSummary(mission),
        sent: 0,
        selectedTier: null,
        minimumScore,
        items: [],
      };
    }

    const sent: ScoredCandidate[] = [];
    const failed: Array<{ candidateUserId: string; error: string }> = [];

    for (const candidate of selected) {
      try {
        await this.notifications.create({
          userId: candidate.candidateUserId,
          type: NotificationType.MISSION_RECOMMENDATION,
          title: 'Mission recommandee',
          body: `${mission.title} correspond fortement a votre profil.`,
          data: {
            missionId: mission.id,
            score: candidate.score,
            tier: candidate.tier,
            reasons: candidate.reasons,
          },
        });

        await this.email.sendMissionRecommendationEmail(candidate.candidateUserId, candidate.email, {
          missionTitle: mission.title,
          establishmentName: mission.establishment.name,
          city: mission.city,
          startDate: mission.startDate,
          endDate: mission.endDate,
          startTime: mission.startTime,
          endTime: mission.endTime,
          score: candidate.score,
          reasons: candidate.reasons,
          missionId: mission.id,
        });

        await this.prisma.missionCandidateMatch.update({
          where: {
            missionId_candidateUserId: {
              missionId,
              candidateUserId: candidate.candidateUserId,
            },
          },
          data: {
            notificationStatus: MissionMatchNotificationStatus.SENT,
            notifiedAt: new Date(),
          },
        });

        sent.push(candidate);
      } catch (error: any) {
        failed.push({
          candidateUserId: candidate.candidateUserId,
          error: error?.message || 'Erreur inconnue',
        });

        await this.prisma.missionCandidateMatch.update({
          where: {
            missionId_candidateUserId: {
              missionId,
              candidateUserId: candidate.candidateUserId,
            },
          },
          data: { notificationStatus: MissionMatchNotificationStatus.FAILED },
        });
      }
    }

    await this.audit.log({
      actorUserId: admin.id,
      action: 'matching.dispatch.sent',
      entityType: 'mission',
      entityId: missionId,
      metadata: {
        targetCount,
        minimumScore,
        sent: sent.length,
        failed: failed.length,
        selectedTier: selected[selected.length - 1]?.tier,
      },
    });

    return {
      mission: this.missionSummary(mission),
      sent: sent.length,
      failed,
      selectedTier: selected[selected.length - 1]?.tier ?? null,
      minimumScore,
      items: sent,
    };
  }

  private async getPublishedMission(missionId: string) {
    const mission = await this.prisma.mission.findUnique({
      where: { id: missionId },
      include: {
        establishment: true,
        applications: { select: { candidateUserId: true } },
      },
    });

    if (!mission) throw new NotFoundException('Mission introuvable.');
    if (mission.status !== MissionStatus.PUBLISHED) {
      throw new BadRequestException('Le matching ne peut etre lance que sur une mission publiee.');
    }

    return mission;
  }

  private async scoreCandidatesForMission(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, limit: number) {
    const existingMatches = await this.prisma.missionCandidateMatch.findMany({
      where: { missionId: mission.id },
      select: { candidateUserId: true, notificationStatus: true },
    });
    const sentCandidateIds = new Set(
      existingMatches
        .filter((match) => match.notificationStatus === MissionMatchNotificationStatus.SENT)
        .map((match) => match.candidateUserId),
    );
    const appliedCandidateIds = new Set(mission.applications.map((application) => application.candidateUserId));

    const candidates = await this.prisma.user.findMany({
      where: {
        role: UserRole.CANDIDATE,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        id: { notIn: Array.from(appliedCandidateIds) },
        profile: {
          is: {
            completionScore: { gte: 40 },
          },
        },
      },
      include: {
        profile: {
          include: {
            userSkills: { include: { skill: true } },
          },
        },
        documents: {
          where: { verificationStatus: 'APPROVED' },
          select: { id: true },
          take: 1,
        },
      },
      take: 500,
    });

    return candidates
      .map((candidate) => ({
        ...this.scoreCandidate(mission, candidate),
        alreadyNotified: sentCandidateIds.has(candidate.id),
      }))
      .filter((candidate) => candidate.score >= MATCH_TIERS[MATCH_TIERS.length - 1].minimumScore)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }

  private scoreCandidate(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, candidate: any): ScoredCandidate {
    const profile = candidate.profile;
    const reasons: string[] = [];
    const breakdown: MatchBreakdown = {};

    const add = (key: string, points: number, reason?: string) => {
      if (points <= 0) return;
      breakdown[key] = (breakdown[key] || 0) + points;
      if (reason) reasons.push(reason);
    };

    const requiredLevels = mission.requiredLevels.length ? mission.requiredLevels : [mission.requiredLevel];
    const candidateLevel = this.medicalStatusToRequiredLevel(profile.medicalStatus);
    if (candidateLevel && requiredLevels.includes(candidateLevel)) {
      add('requiredLevel', 25, 'niveau candidat compatible');
    }

    const specialtyScore = this.specialtyScore(mission.specialty, [
      profile.specialty,
      profile.verifiedSpecialty,
      ...profile.userSkills.map((userSkill: any) => userSkill.skill.name),
    ]);
    add('specialty', specialtyScore, specialtyScore >= 20 ? 'specialite tres proche' : specialtyScore ? 'specialite partiellement proche' : undefined);

    const city = this.normalize(mission.city);
    const preferredCities = profile.preferredCities.map((value: string) => this.normalize(value));
    if (city && preferredCities.includes(city)) {
      add('location', 15, 'ville dans les preferences');
    } else if (city && this.normalize(profile.city) === city) {
      add('location', 12, 'meme ville que le profil');
    } else if (profile.maxTravelRadiusKm || profile.mobilityOptions.length) {
      add('location', 6, 'mobilite renseignee');
    }

    if (profile.acceptedMissionTypes.includes(mission.missionType)) {
      add('missionType', 12, 'type de mission accepte');
    }

    if (mission.knownSoftware.length && this.hasIntersection(mission.knownSoftware, profile.knownSoftware)) {
      add('software', 6, 'logiciel connu');
    } else if (mission.softwareUsed && profile.knownSoftware.some((value: string) => this.sameText(value, mission.softwareUsed))) {
      add('software', 6, 'logiciel connu');
    }

    if (mission.acceptedPatientTypes.length && this.hasIntersection(mission.acceptedPatientTypes, profile.acceptedPatientTypes)) {
      add('patientType', 5, 'patientele compatible');
    } else if (mission.patientType && profile.acceptedPatientTypes.some((value: string) => this.sameText(value, mission.patientType))) {
      add('patientType', 5, 'patientele compatible');
    }

    if (mission.hasSecretary === true && profile.secretaryRequired !== false) {
      add('workConditions', 4, 'secretariat compatible');
    }

    if (mission.accommodationProvided && profile.accommodationRequired) {
      add('accommodation', 4, 'logement fourni');
    }

    add('profileCompletion', Math.min(8, Math.floor((profile.completionScore || 0) / 12)), 'profil renseigne');

    if (profile.healthVerificationStatus === HealthVerificationStatus.VERIFIED) {
      add('verification', 5, 'professionnel de sante verifie');
    }

    if (candidate.documents.length) {
      add('documents', 3, 'document valide');
    }

    const score = Math.min(100, Object.values(breakdown).reduce((total, value) => total + value, 0));

    return {
      candidateUserId: candidate.id,
      email: candidate.email,
      displayName: this.userDisplayName(candidate),
      score,
      tier: this.tierForScore(score),
      reasons,
      breakdown,
      alreadyNotified: false,
    };
  }

  private async persistScores(missionId: string, scored: ScoredCandidate[]) {
    for (const candidate of scored) {
      await this.prisma.missionCandidateMatch.upsert({
        where: {
          missionId_candidateUserId: {
            missionId,
            candidateUserId: candidate.candidateUserId,
          },
        },
        create: {
          missionId,
          candidateUserId: candidate.candidateUserId,
          score: candidate.score,
          tier: candidate.tier,
          reasons: candidate.reasons as Prisma.InputJsonValue,
          breakdown: candidate.breakdown as Prisma.InputJsonValue,
          notificationStatus: candidate.alreadyNotified
            ? MissionMatchNotificationStatus.SENT
            : MissionMatchNotificationStatus.PENDING,
        },
        update: {
          score: candidate.score,
          tier: candidate.tier,
          reasons: candidate.reasons as Prisma.InputJsonValue,
          breakdown: candidate.breakdown as Prisma.InputJsonValue,
          lastScoredAt: new Date(),
          notificationStatus: candidate.alreadyNotified
            ? MissionMatchNotificationStatus.SENT
            : undefined,
        },
      });
    }
  }

  private selectGradualBatch(candidates: ScoredCandidate[], targetCount: number, minimumScore: number) {
    const selected: ScoredCandidate[] = [];

    for (const tier of MATCH_TIERS) {
      if (tier.minimumScore < minimumScore) continue;

      const tierCandidates = candidates.filter(
        (candidate) => candidate.score >= tier.minimumScore && !selected.some((item) => item.candidateUserId === candidate.candidateUserId),
      );
      selected.push(...tierCandidates.slice(0, targetCount - selected.length));

      if (selected.length >= targetCount) break;
    }

    if (selected.length < targetCount) {
      const fallbackCandidates = candidates.filter(
        (candidate) => candidate.score >= minimumScore && !selected.some((item) => item.candidateUserId === candidate.candidateUserId),
      );
      selected.push(...fallbackCandidates.slice(0, targetCount - selected.length));
    }

    return selected;
  }

  private tierForScore(score: number) {
    return MATCH_TIERS.find((tier) => score >= tier.minimumScore)?.label || 'below_threshold';
  }

  private medicalStatusToRequiredLevel(status?: MedicalStatus | null): RequiredLevel | null {
    const mapping: Partial<Record<MedicalStatus, RequiredLevel>> = {
      STUDENT: RequiredLevel.STUDENT,
      INTERN: RequiredLevel.INTERN,
      JUNIOR_DOCTOR: RequiredLevel.JUNIOR_DOCTOR,
      DOCTOR: RequiredLevel.DOCTOR,
      REGULAR_LOCUM: RequiredLevel.DOCTOR,
      NURSE: RequiredLevel.NURSE,
      OPERATING_ROOM_ASSISTANT: RequiredLevel.OPERATING_ROOM_ASSISTANT,
      OTHER: RequiredLevel.OTHER,
    };
    return status ? mapping[status] || null : null;
  }

  private specialtyScore(missionSpecialty: string, candidateValues: Array<string | null | undefined>) {
    const mission = this.normalize(missionSpecialty);
    if (!mission) return 0;

    for (const value of candidateValues) {
      const candidate = this.normalize(value);
      if (!candidate) continue;
      if (candidate === mission) return 20;
      if (candidate.includes(mission) || mission.includes(candidate)) return 12;
    }

    return 0;
  }

  private hasIntersection(left: string[], right: string[]) {
    const rightSet = new Set(right.map((value) => this.normalize(value)).filter(Boolean));
    return left.some((value) => rightSet.has(this.normalize(value)));
  }

  private sameText(left?: string | null, right?: string | null) {
    return this.normalize(left) === this.normalize(right);
  }

  private normalize(value?: string | null) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private userDisplayName(user: { email: string; profile?: { firstName?: string | null; lastName?: string | null } | null }) {
    return [user.profile?.firstName, user.profile?.lastName].filter(Boolean).join(' ') || user.email;
  }

  private missionSummary(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>) {
    return {
      id: mission.id,
      title: mission.title,
      city: mission.city,
      specialty: mission.specialty,
      missionType: mission.missionType,
      startDate: mission.startDate,
      establishmentName: mission.establishment.name,
    };
  }
}
