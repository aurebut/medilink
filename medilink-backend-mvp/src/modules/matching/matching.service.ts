import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CompensationMode,
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
import { UpdateMatchingConfigDto } from './dto/update-matching-config.dto';

const MATCH_TIERS = [
  { label: 'excellent', minimumScore: 85 },
  { label: 'strong', minimumScore: 75 },
  { label: 'good', minimumScore: 65 },
  { label: 'exploratory', minimumScore: 55 },
];

const MAX_MATCH_SCORE = 100;

type MatchBreakdown = Record<string, number>;

type MatchingConfig = {
  version: number;
  weights: Record<string, number>;
  thresholds: Record<string, number>;
  exclusions: Record<string, boolean | number>;
  dispatch: Record<string, number | boolean>;
};

type ScoredCandidate = {
  candidateUserId: string;
  email: string;
  displayName: string;
  profile: {
    firstName?: string | null;
    lastName?: string | null;
    city?: string | null;
    medicalStatus?: MedicalStatus | null;
    specialty?: string | null;
    verifiedSpecialty?: string | null;
    completionScore: number;
  };
  eligible: boolean;
  score: number;
  tier: string;
  reasons: string[];
  exclusionReasons: string[];
  risks: string[];
  missingData: string[];
  confidence: number;
  breakdown: MatchBreakdown;
  alreadyNotified: boolean;
};

const DEFAULT_MATCHING_CONFIG: MatchingConfig = {
  version: 1,
  weights: {
    requiredLevel: 15,
    specialtyExact: 20,
    specialtyPartial: 12,
    locationPreferredCity: 14,
    locationSameCity: 12,
    locationFlexibleMobility: 8,
    missionType: 10,
    timeSlot: 7,
    duration: 5,
    practiceSetting: 7,
    software: 5,
    patientType: 4,
    acts: 7,
    workConditionsSecretary: 3,
    accommodation: 3,
    compensationMet: 8,
    compensationNear: 4,
    compensationUnknownPreference: 2,
    retrocessionStrong: 4,
    workloadCompatible: 4,
    workloadNear: 1,
    workloadUnknown: 2,
    paymentFixed: 3,
    paymentRetrocession: 1,
    profileCompletionStrong: 4,
    profileCompletionGood: 2,
    profileVerified: 4,
    profileIdentitySignal: 2,
  },
  thresholds: {
    excellent: 85,
    strong: 75,
    good: 65,
    exploratory: 55,
  },
  exclusions: {
    minimumProfileCompletion: 35,
    requireCompatibleLevel: true,
    excludeRejectedMissionType: true,
    excludeInsufficientNotice: true,
    excludeRejectedWeekday: true,
    excludeRejectedTimeSlot: true,
    excludeImpossibleLocation: true,
    excludeMissingAccommodation: true,
    excludeMissingParking: true,
    excludeRejectedPracticeSetting: true,
    excludeRejectedPatientType: true,
    excludeExcessivePatientLoad: true,
    excludeRejectedActs: true,
  },
  dispatch: {
    targetCount: 5,
    minimumScore: 55,
    maxAlreadyNotifiedPerWave: 0,
  },
};

@Injectable()
export class MatchingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  async getMatchingConfig() {
    return this.resolveMatchingConfig();
  }

  async updateMatchingConfig(admin: RequestUser, dto: UpdateMatchingConfigDto) {
    const current = await this.resolveMatchingConfig();
    const next: MatchingConfig = {
      version: current.version,
      weights: this.mergeNumberRecord(current.weights, dto.weights),
      thresholds: this.mergeNumberRecord(current.thresholds, dto.thresholds),
      exclusions: { ...current.exclusions, ...(dto.exclusions || {}) },
      dispatch: { ...current.dispatch, ...(dto.dispatch || {}) },
    };

    const saved = await this.prisma.matchingConfiguration.upsert({
      where: { id: 'default' },
      create: {
        id: 'default',
        version: next.version,
        weights: next.weights as Prisma.InputJsonValue,
        thresholds: next.thresholds as Prisma.InputJsonValue,
        exclusions: next.exclusions as Prisma.InputJsonValue,
        dispatch: next.dispatch as Prisma.InputJsonValue,
        updatedById: admin.id,
      },
      update: {
        version: next.version,
        weights: next.weights as Prisma.InputJsonValue,
        thresholds: next.thresholds as Prisma.InputJsonValue,
        exclusions: next.exclusions as Prisma.InputJsonValue,
        dispatch: next.dispatch as Prisma.InputJsonValue,
        updatedById: admin.id,
      },
    });

    await this.audit.log({
      actorUserId: admin.id,
      action: 'matching.config.updated',
      entityType: 'matching_configuration',
      entityId: saved.id,
      metadata: next,
    });

    return next;
  }

  async previewMissionMatches(missionId: string, limit = 50) {
    const mission = await this.getPublishedMission(missionId);
    const config = await this.resolveMatchingConfig();
    const scored = await this.scoreCandidatesForMission(mission, Math.min(limit, 200), config);
    const eligible = scored.filter((candidate) => candidate.eligible);
    const excluded = scored.filter((candidate) => !candidate.eligible);

    await this.persistScores(missionId, scored);

    return {
      mission: this.missionSummary(mission),
      config,
      thresholds: this.thresholdTiers(config),
      total: eligible.length,
      excludedTotal: excluded.length,
      items: eligible.slice(0, limit),
      excluded: excluded.slice(0, limit),
    };
  }

  async dispatchMissionMatches(
    admin: RequestUser,
    missionId: string,
    dto: DispatchMissionMatchesDto,
  ) {
    const mission = await this.getPublishedMission(missionId);
    const config = await this.resolveMatchingConfig();
    const targetCount = dto.targetCount ?? (Number(config.dispatch.targetCount) || 5);
    const minimumScore = dto.minimumScore ?? (Number(config.dispatch.minimumScore) || Number(config.thresholds.exploratory) || 55);
    const scored = (await this.scoreCandidatesForMission(mission, 200, config))
      .filter((candidate) => candidate.eligible && candidate.score >= minimumScore);

    await this.persistScores(missionId, scored);

    const unsent = scored.filter((candidate) => !candidate.alreadyNotified);
    const selected = this.selectGradualBatch(unsent, targetCount, minimumScore, config);

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
          title: 'Mission recommandée',
          body: `${mission.title} correspond fortement à votre profil.`,
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

  private async scoreCandidatesForMission(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, _limit: number, config: MatchingConfig) {
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
          isNot: null,
        },
      },
      include: {
        profile: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 500,
    });

    return candidates
      .map((candidate) => ({
        ...this.scoreCandidate(mission, candidate, config),
        alreadyNotified: sentCandidateIds.has(candidate.id),
      }))
      .sort((a, b) => {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        return b.score - a.score;
      });
  }

  private scoreCandidate(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, candidate: any, config: MatchingConfig): ScoredCandidate {
    const profile = candidate.profile;
    const reasons: string[] = [];
    const missingData = this.missingDataReasons(profile);
    const risks = this.riskReasons(mission, profile);
    const exclusionReasons = this.exclusionReasons(mission, profile, config);
    const breakdown: MatchBreakdown = {};

    if (exclusionReasons.length) {
      return {
        candidateUserId: candidate.id,
        email: candidate.email,
        displayName: this.userDisplayName(candidate),
        profile: this.candidateProfileSummary(profile),
        eligible: false,
        score: 0,
        tier: 'excluded',
        reasons: [],
        exclusionReasons,
        risks,
        missingData,
        confidence: this.confidenceScore(profile, missingData),
        breakdown,
        alreadyNotified: false,
      };
    }

    const add = (key: string, points: number, reason?: string) => {
      if (points <= 0) return;
      breakdown[key] = (breakdown[key] || 0) + points;
      if (reason) reasons.push(reason);
    };

    const requiredLevels = mission.requiredLevels.length ? mission.requiredLevels : [mission.requiredLevel];
    const candidateLevel = this.medicalStatusToRequiredLevel(profile.medicalStatus);
    if (candidateLevel && this.isLevelCompatible(requiredLevels, candidateLevel)) {
      add('requiredLevel', config.weights.requiredLevel, 'niveau candidat compatible');
    }

    const specialtyScore = this.specialtyScore(mission.specialty, [
      profile.specialty,
      profile.verifiedSpecialty,
    ], config);
    add('specialty', specialtyScore, specialtyScore >= 24 ? 'specialite tres proche' : specialtyScore ? 'specialite partiellement proche' : undefined);

    const city = this.normalize(mission.city);
    const preferredCities = (profile.preferredCities || []).map((value: string) => this.normalize(value));
    if (city && preferredCities.includes(city)) {
      add('location', config.weights.locationPreferredCity, 'ville dans les preferences');
    } else if (city && this.normalize(profile.city) === city) {
      add('location', config.weights.locationSameCity, 'meme ville que le profil');
    } else if (this.hasFlexibleMobility(profile)) {
      add('location', config.weights.locationFlexibleMobility, 'mobilite compatible');
    }

    if (this.acceptedMissionTypes(profile).includes(mission.missionType)) {
      add('missionType', config.weights.missionType, 'type de mission accepte');
    }

    const missionTimeSlots = this.missionTimeSlots(mission);
    if (missionTimeSlots.length && this.hasIntersection(missionTimeSlots, profile.acceptedTimeSlots || [])) {
      add('timeSlot', config.weights.timeSlot, 'creneau accepte');
    }

    const missionDuration = this.missionDurationLabel(mission);
    if (missionDuration && profile.preferredDurations?.some((value: string) => this.sameText(value, missionDuration))) {
      add('duration', config.weights.duration, 'format de duree prefere');
    }

    const practiceSetting = this.practiceSettingForMission(mission);
    if (practiceSetting && profile.acceptedPracticeSettings?.includes(practiceSetting)) {
      add('practiceSetting', config.weights.practiceSetting, "cadre d'exercice accepte");
    }

    if (mission.knownSoftware.length && this.hasIntersection(mission.knownSoftware, profile.knownSoftware)) {
      add('software', config.weights.software, 'logiciel connu');
    } else if (mission.softwareUsed && profile.knownSoftware.some((value: string) => this.sameText(value, mission.softwareUsed))) {
      add('software', config.weights.software, 'logiciel connu');
    }

    if (mission.acceptedPatientTypes.length && this.hasIntersection(mission.acceptedPatientTypes, profile.acceptedPatientTypes)) {
      add('patientType', config.weights.patientType, 'patientele compatible');
    } else if (mission.patientType && profile.acceptedPatientTypes.some((value: string) => this.sameText(value, mission.patientType))) {
      add('patientType', config.weights.patientType, 'patientele compatible');
    }

    if (mission.requiredActs.length && this.hasIntersection(mission.requiredActs, profile.acceptedActs || [])) {
      add('acts', config.weights.acts, 'actes attendus acceptes');
    }

    if (mission.hasSecretary === true && profile.secretaryRequired !== false) {
      add('workConditions', config.weights.workConditionsSecretary, 'secretariat compatible');
    }

    if (mission.accommodationProvided && profile.accommodationRequired) {
      add('accommodation', config.weights.accommodation, 'logement fourni');
    }

    add('compensation', this.compensationScore(mission, profile, config), 'remuneration compatible');
    add('workload', this.workloadScore(mission, profile, config), 'charge patient compatible');
    add('payment', this.paymentScore(mission, profile, config), 'mode de paiement rassurant');
    add('profileQuality', this.profileQualityScore(profile, config), 'profil renseigne et verifie');

    const score = Math.min(
      MAX_MATCH_SCORE,
      Object.values(breakdown).reduce((total, value) => total + value, 0),
    );

    return {
      candidateUserId: candidate.id,
      email: candidate.email,
      displayName: this.userDisplayName(candidate),
      profile: this.candidateProfileSummary(profile),
      eligible: true,
      score,
      tier: this.tierForScore(score, config),
      reasons,
      exclusionReasons: [],
      risks,
      missingData,
      confidence: this.confidenceScore(profile, missingData),
      breakdown,
      alreadyNotified: false,
    };
  }

  private async persistScores(missionId: string, scored: ScoredCandidate[]) {
    for (const candidate of scored) {
      const notificationStatus = candidate.alreadyNotified
        ? MissionMatchNotificationStatus.SENT
        : candidate.eligible
          ? MissionMatchNotificationStatus.PENDING
          : MissionMatchNotificationStatus.SKIPPED;

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
          eligible: candidate.eligible,
          score: candidate.score,
          tier: candidate.tier,
          reasons: candidate.reasons as Prisma.InputJsonValue,
          exclusionReasons: candidate.exclusionReasons as Prisma.InputJsonValue,
          breakdown: candidate.breakdown as Prisma.InputJsonValue,
          notificationStatus,
        },
        update: {
          eligible: candidate.eligible,
          score: candidate.score,
          tier: candidate.tier,
          reasons: candidate.reasons as Prisma.InputJsonValue,
          exclusionReasons: candidate.exclusionReasons as Prisma.InputJsonValue,
          breakdown: candidate.breakdown as Prisma.InputJsonValue,
          lastScoredAt: new Date(),
          notificationStatus,
        },
      });
    }
  }

  private selectGradualBatch(candidates: ScoredCandidate[], targetCount: number, minimumScore: number, config: MatchingConfig) {
    const selected: ScoredCandidate[] = [];

    for (const tier of this.thresholdTiers(config)) {
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

  private tierForScore(score: number, config: MatchingConfig) {
    return this.thresholdTiers(config).find((tier) => score >= tier.minimumScore)?.label || 'below_threshold';
  }

  private exclusionReasons(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, profile: any, config: MatchingConfig) {
    const reasons: string[] = [];
    const requiredLevels = mission.requiredLevels.length ? mission.requiredLevels : [mission.requiredLevel];
    const candidateLevel = this.medicalStatusToRequiredLevel(profile.medicalStatus);
    const exclusions = config.exclusions;

    if ((profile.completionScore || 0) < Number(exclusions.minimumProfileCompletion || 35)) {
      reasons.push('Profil candidat trop incomplet');
    }

    if (exclusions.requireCompatibleLevel !== false && (!candidateLevel || !this.isLevelCompatible(requiredLevels, candidateLevel))) {
      reasons.push('Niveau ou diplôme incompatible');
    }

    const acceptedMissionTypes = this.acceptedMissionTypes(profile);
    if (exclusions.excludeRejectedMissionType !== false && acceptedMissionTypes.length && !acceptedMissionTypes.includes(mission.missionType)) {
      reasons.push('Type de mission non accepté');
    }

    if (exclusions.excludeInsufficientNotice !== false && this.hasInsufficientNotice(mission, profile.minimumNoticeHours)) {
      reasons.push('Préavis insuffisant');
    }

    if (exclusions.excludeRejectedWeekday !== false && this.hasRejectedWeekday(mission, profile.acceptedWeekdays || [], profile.refusedSchedules || [])) {
      reasons.push('Jour de mission non accepté');
    }

    if (exclusions.excludeRejectedTimeSlot !== false && this.hasRejectedTimeSlot(mission, profile.acceptedTimeSlots || [], profile.refusedSchedules || [])) {
      reasons.push('Créneau horaire non accepté');
    }

    if (exclusions.excludeImpossibleLocation !== false && this.hasImpossibleLocation(mission, profile)) {
      reasons.push('Localisation incompatible');
    }

    if (exclusions.excludeMissingAccommodation !== false && profile.accommodationRequired && !mission.accommodationProvided) {
      reasons.push('Logement obligatoire absent');
    }

    if (exclusions.excludeMissingParking !== false && profile.parkingRequired && mission.parkingAvailable === false) {
      reasons.push('Parking obligatoire absent');
    }

    const practiceSetting = this.practiceSettingForMission(mission);
    if (exclusions.excludeRejectedPracticeSetting !== false && practiceSetting && profile.acceptedPracticeSettings?.length && !profile.acceptedPracticeSettings.includes(practiceSetting)) {
      reasons.push("Cadre d'exercice non accepté");
    }

    if (exclusions.excludeRejectedPatientType !== false && this.refusesPatientType(mission, profile.refusedPatientTypes || [])) {
      reasons.push('Patientèle refusée');
    }

    if (exclusions.excludeExcessivePatientLoad !== false && profile.maxPatientsPerDay && mission.averagePatientsPerDay && mission.averagePatientsPerDay > profile.maxPatientsPerDay) {
      reasons.push('Charge patients trop élevée');
    }

    if (exclusions.excludeRejectedActs !== false && mission.requiredActs.length && this.hasIntersection(mission.requiredActs, profile.refusedActs || [])) {
      reasons.push('Acte requis refusé');
    }

    return reasons;
  }

  private compensationScore(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, profile: any, config: MatchingConfig) {
    const minimum = profile.minimumCompensation;
    if (!minimum || minimum <= 0) return config.weights.compensationUnknownPreference;

    if (mission.compensationMode === CompensationMode.FIXED_AMOUNT) {
      if (!mission.compensationAmount) return 0;
      if (mission.compensationAmount >= minimum) return config.weights.compensationMet;
      if (mission.compensationAmount >= minimum * 0.9) return config.weights.compensationNear;
      return 0;
    }

    if (mission.minimumCompensation && mission.minimumCompensation >= minimum) return config.weights.compensationMet;
    if (mission.retrocessionPercentage && mission.retrocessionPercentage >= 40) return config.weights.retrocessionStrong;
    return 0;
  }

  private workloadScore(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, profile: any, config: MatchingConfig) {
    if (!profile.maxPatientsPerDay || !mission.averagePatientsPerDay) return config.weights.workloadUnknown;
    if (mission.averagePatientsPerDay <= profile.maxPatientsPerDay) return config.weights.workloadCompatible;
    if (mission.averagePatientsPerDay <= profile.maxPatientsPerDay + 5) return config.weights.workloadNear;
    return 0;
  }

  private paymentScore(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, profile: any, config: MatchingConfig) {
    if (!profile.fastPaymentImportant) return 0;
    return mission.compensationMode === CompensationMode.FIXED_AMOUNT ? config.weights.paymentFixed : config.weights.paymentRetrocession;
  }

  private profileQualityScore(profile: any, config: MatchingConfig) {
    let score = 0;
    const completionScore = profile.completionScore || 0;

    if (completionScore >= 80) score += config.weights.profileCompletionStrong;
    else if (completionScore >= 60) score += config.weights.profileCompletionGood;

    if (profile.healthVerificationStatus === HealthVerificationStatus.VERIFIED) score += config.weights.profileVerified;
    else if (profile.rpps || profile.ansPractitionerId) score += config.weights.profileIdentitySignal;

    return score;
  }

  private async resolveMatchingConfig(): Promise<MatchingConfig> {
    const stored = await this.prisma.matchingConfiguration.findUnique({ where: { id: 'default' } });
    if (!stored) return DEFAULT_MATCHING_CONFIG;

    return {
      version: stored.version || DEFAULT_MATCHING_CONFIG.version,
      weights: this.mergeNumberRecord(DEFAULT_MATCHING_CONFIG.weights, stored.weights as Record<string, number>),
      thresholds: this.mergeNumberRecord(DEFAULT_MATCHING_CONFIG.thresholds, stored.thresholds as Record<string, number>),
      exclusions: { ...DEFAULT_MATCHING_CONFIG.exclusions, ...((stored.exclusions || {}) as Record<string, boolean | number>) },
      dispatch: { ...DEFAULT_MATCHING_CONFIG.dispatch, ...((stored.dispatch || {}) as Record<string, number | boolean>) },
    };
  }

  private mergeNumberRecord(base: Record<string, number>, override?: Record<string, unknown>) {
    const next = { ...base };
    Object.entries(override || {}).forEach(([key, value]) => {
      const numberValue = Number(value);
      if (Number.isFinite(numberValue) && numberValue >= 0) next[key] = numberValue;
    });
    return next;
  }

  private thresholdTiers(config: MatchingConfig) {
    return Object.entries(config.thresholds)
      .map(([label, minimumScore]) => ({ label, minimumScore: Number(minimumScore) || 0 }))
      .sort((left, right) => right.minimumScore - left.minimumScore);
  }

  private missingDataReasons(profile: any) {
    const reasons: string[] = [];

    if (!profile.specialty && !profile.verifiedSpecialty) reasons.push('Spécialité non renseignée');
    if (!profile.city && !profile.preferredCities?.length) reasons.push('Localisation préférée absente');
    if (!profile.acceptedMissionTypes?.length) reasons.push('Types de missions acceptées non renseignés');
    if (!profile.acceptedTimeSlots?.length) reasons.push('Créneaux acceptés non renseignés');
    if (!profile.minimumCompensation) reasons.push('Rémunération minimale non renseignée');
    if (!profile.acceptedPatientTypes?.length) reasons.push('Patientèle acceptée non renseignée');

    return reasons;
  }

  private riskReasons(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, profile: any) {
    const risks: string[] = [];

    if ((profile.completionScore || 0) < 60) risks.push('Profil encore peu complété');
    if (profile.healthVerificationStatus !== HealthVerificationStatus.VERIFIED) risks.push('Statut santé non vérifié');
    if (profile.minimumCompensation && mission.compensationAmount && mission.compensationAmount < profile.minimumCompensation) {
      risks.push('Rémunération sous le minimum déclaré');
    }
    if (profile.maxPatientsPerDay && mission.averagePatientsPerDay && mission.averagePatientsPerDay > profile.maxPatientsPerDay) {
      risks.push('Charge patient au-dessus de la préférence');
    }
    if (profile.fastPaymentImportant && mission.compensationMode !== CompensationMode.FIXED_AMOUNT) {
      risks.push('Paiement rapide important pour le candidat');
    }

    return risks;
  }

  private confidenceScore(profile: any, missingData: string[]) {
    let confidence = 45;
    const completionScore = profile.completionScore || 0;

    if (completionScore >= 80) confidence += 25;
    else if (completionScore >= 60) confidence += 15;
    else if (completionScore >= 40) confidence += 5;

    if (profile.healthVerificationStatus === HealthVerificationStatus.VERIFIED) confidence += 15;
    else if (profile.rpps || profile.ansPractitionerId) confidence += 8;

    confidence -= Math.min(30, missingData.length * 5);

    return Math.max(0, Math.min(100, Math.round(confidence)));
  }

  private isLevelCompatible(requiredLevels: RequiredLevel[], candidateLevel: RequiredLevel) {
    const compatible: Record<RequiredLevel, RequiredLevel[]> = {
      STUDENT: [RequiredLevel.STUDENT, RequiredLevel.INTERN, RequiredLevel.JUNIOR_DOCTOR, RequiredLevel.DOCTOR],
      INTERN: [RequiredLevel.INTERN, RequiredLevel.JUNIOR_DOCTOR, RequiredLevel.DOCTOR],
      JUNIOR_DOCTOR: [RequiredLevel.JUNIOR_DOCTOR, RequiredLevel.DOCTOR],
      DOCTOR: [RequiredLevel.DOCTOR],
      NURSE: [RequiredLevel.NURSE],
      OPERATING_ROOM_ASSISTANT: [RequiredLevel.OPERATING_ROOM_ASSISTANT],
      OTHER: [RequiredLevel.OTHER],
    };

    return requiredLevels.some((requiredLevel) => compatible[requiredLevel]?.includes(candidateLevel));
  }

  private acceptedMissionTypes(profile: any) {
    const legacyMap: Record<string, string> = {
      garde: 'GARDE',
      remplacement: 'REMPLACEMENT',
      vacation: 'VACATION',
      stage: 'STAGE',
      'aide op': 'AIDE_OP',
      'aide op.': 'AIDE_OP',
    };

    return (profile.acceptedMissionTypes || [])
      .map((value: string) => legacyMap[this.normalize(value)] || value)
      .filter(Boolean);
  }

  private hasInsufficientNotice(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, minimumNoticeHours?: number | null) {
    if (minimumNoticeHours == null || minimumNoticeHours <= 0) return false;
    const hoursUntilStart = (mission.startDate.getTime() - Date.now()) / 36e5;
    return hoursUntilStart < minimumNoticeHours;
  }

  private hasRejectedWeekday(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, acceptedWeekdays: string[], refusedSchedules: string[]) {
    const missionWeekdays = this.missionWeekdays(mission);
    const refused = refusedSchedules.map((value) => this.normalize(value));

    if (missionWeekdays.includes('SATURDAY') && refused.includes('week-ends')) return true;
    if (missionWeekdays.includes('SUNDAY') && refused.includes('week-ends')) return true;

    if (!acceptedWeekdays.length) return false;
    return missionWeekdays.some((weekday) => !acceptedWeekdays.includes(weekday));
  }

  private hasRejectedTimeSlot(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, acceptedTimeSlots: string[], refusedSchedules: string[]) {
    const slots = this.missionTimeSlots(mission);
    const refused = refusedSchedules.map((value) => this.normalize(value));

    if (slots.includes('NIGHT') && refused.includes('nuits')) return true;
    if (slots.includes('TWENTY_FOUR_HOURS') && refused.includes('gardes 24 h')) return true;
    if (slots.includes('MORNING') && refused.includes('matins tres tot')) return true;

    if (!slots.length || !acceptedTimeSlots.length) return false;
    if (slots.includes('TWENTY_FOUR_HOURS') && acceptedTimeSlots.includes('TWENTY_FOUR_HOURS')) return false;

    return slots.some((slot) => !acceptedTimeSlots.includes(slot));
  }

  private hasImpossibleLocation(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, profile: any) {
    const city = this.normalize(mission.city);
    const profileCity = this.normalize(profile.city);
    const preferredCities = (profile.preferredCities || []).map((value: string) => this.normalize(value));
    const sameOrPreferredCity = city && (city === profileCity || preferredCities.includes(city));

    if (sameOrPreferredCity) return false;
    if (profile.mobilityRangeType === 'LOCAL_ONLY') return true;
    if (profile.mobilityRangeType === 'NATIONAL_WITH_HOUSING' && !mission.accommodationProvided) return true;
    if (profile.housingRequiredBeyondKm != null && !mission.accommodationProvided) return true;

    return false;
  }

  private hasFlexibleMobility(profile: any) {
    return Boolean(
      profile.maxTravelRadiusKm ||
      profile.mobilityOptions?.length ||
      ['NEARBY_WITH_CAR', 'REGIONAL', 'NATIONAL_WITH_HOUSING'].includes(profile.mobilityRangeType),
    );
  }

  private refusesPatientType(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, refusedPatientTypes: string[]) {
    if (!refusedPatientTypes.length) return false;
    const missionPatientTypes = [
      mission.patientType,
      ...(mission.acceptedPatientTypes || []),
    ].filter(Boolean) as string[];

    return missionPatientTypes.some((patientType) =>
      refusedPatientTypes.some((refused) => this.sameText(refused, patientType)),
    );
  }

  private practiceSettingForMission(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>) {
    if (mission.practiceSetting) return mission.practiceSetting;

    const department = this.normalize(mission.departmentInfo);
    if (department.includes('urgence')) return 'EMERGENCY_DEPARTMENT';
    if (department.includes('ehpad')) return 'EHPAD';
    if (department.includes('clinique')) return 'CLINIC';
    if (department.includes('hopital') || department.includes('hospitalier')) return 'HOSPITAL';
    if (department.includes('cabinet de groupe')) return 'GROUP_PRACTICE';
    if (department.includes('cabinet')) return 'CABINET';
    if (department.includes('centre') || department.includes('maison de sante')) return 'MEDICAL_CENTER';

    const establishmentTypeMap: Record<string, string> = {
      HOSPITAL: 'HOSPITAL',
      CLINIC: 'CLINIC',
      CABINET: 'CABINET',
      MEDICAL_SERVICE: 'MEDICAL_CENTER',
    };

    return establishmentTypeMap[mission.establishment.type] || null;
  }

  private missionWeekdays(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>) {
    const start = new Date(mission.startDate);
    const end = mission.endDate ? new Date(mission.endDate) : start;
    const days: string[] = [];
    const cursor = new Date(start);

    for (let index = 0; index < 31 && cursor <= end; index += 1) {
      const day = cursor.getDay();
      if (day === 0) days.push('SUNDAY');
      else if (day === 6) days.push('SATURDAY');
      else days.push('WEEKDAYS');
      cursor.setDate(cursor.getDate() + 1);
    }

    return Array.from(new Set(days));
  }

  private missionTimeSlots(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>) {
    const slots: string[] = [];
    const startHour = this.hourFromTime(mission.startTime);
    const endHour = this.hourFromTime(mission.endTime);

    if ((mission.durationHours || 0) >= 24) slots.push('TWENTY_FOUR_HOURS');
    if (startHour == null) return slots;
    if (startHour < 6 || startHour >= 20 || (endHour != null && endHour <= 8)) slots.push('NIGHT');
    else if (startHour < 12) slots.push('MORNING');
    else if (startHour < 18) slots.push('DAY');
    else slots.push('EVENING');

    return Array.from(new Set(slots));
  }

  private missionDurationLabel(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>) {
    if (!mission.durationHours) return null;
    if (mission.durationHours <= 4) return 'Demi-journee';
    if (mission.durationHours < 12) return 'Journee';
    if (mission.durationHours >= 24) return '24 h';
    return null;
  }

  private hourFromTime(value?: string | null) {
    if (!value) return null;
    const hour = Number(value.slice(0, 2));
    return Number.isFinite(hour) ? hour : null;
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

  private specialtyScore(missionSpecialty: string, candidateValues: Array<string | null | undefined>, config: MatchingConfig) {
    const mission = this.normalize(missionSpecialty);
    if (!mission) return 0;

    for (const value of candidateValues) {
      const candidate = this.normalize(value);
      if (!candidate) continue;
      if (candidate === mission) return config.weights.specialtyExact;
      if (candidate.includes(mission) || mission.includes(candidate)) return config.weights.specialtyPartial;
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

  private candidateProfileSummary(profile: any) {
    return {
      firstName: profile.firstName,
      lastName: profile.lastName,
      city: profile.city,
      medicalStatus: profile.medicalStatus,
      specialty: profile.specialty,
      verifiedSpecialty: profile.verifiedSpecialty,
      completionScore: profile.completionScore || 0,
    };
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
