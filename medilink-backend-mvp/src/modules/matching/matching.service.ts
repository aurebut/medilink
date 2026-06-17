import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  CompensationMode,
  HealthVerificationStatus,
  MedicalStatus,
  MatchingDispatchJobStatus,
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

// Score cache: a fresh preview/dispatch within this window reuses persisted scores
// instead of re-scanning the candidate pool.
const SCORE_CACHE_TTL_MS = 5 * 60 * 1000;

// Pagination: scan candidates in batches (cursor-based) up to this safety ceiling.
const CANDIDATE_BATCH_SIZE = 500;
const MAX_CANDIDATES_SCAN = 5000;

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
    const scored = await this.computeScoredCandidates(mission, config, { forceRescore: true });
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

    // Reuse persisted scores when fresh enough (avoid re-scanning the whole pool).
    const scored = (await this.computeScoredCandidates(mission, config, { forceRescore: false }))
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
        accepted: 0,
        sent: 0,
        jobId: null,
        selectedTier: null,
        minimumScore,
        items: [],
      };
    }

    // Enqueue an async dispatch job: notification/email sends happen in the background
    // worker, the admin response returns immediately with the accepted count.
    const job = await this.prisma.matchingDispatchJob.create({
      data: {
        missionId,
        actorUserId: admin.id,
        status: MatchingDispatchJobStatus.QUEUED,
        targetCount,
        minimumScore,
        candidateUserIds: selected.map((candidate) => candidate.candidateUserId),
        selectedTier: selected[selected.length - 1]?.tier ?? null,
        acceptedCount: selected.length,
      },
    });

    await this.audit.log({
      actorUserId: admin.id,
      action: 'matching.dispatch.queued',
      entityType: 'mission',
      entityId: missionId,
      metadata: {
        jobId: job.id,
        targetCount,
        minimumScore,
        accepted: selected.length,
        selectedTier: job.selectedTier,
      },
    });

    return {
      mission: this.missionSummary(mission),
      accepted: selected.length,
      sent: 0,
      jobId: job.id,
      selectedTier: job.selectedTier,
      minimumScore,
      items: selected,
    };
  }

  async getDispatchJob(jobId: string) {
    const job = await this.prisma.matchingDispatchJob.findUnique({
      where: { id: jobId },
      include: { mission: { include: { establishment: { select: { name: true } } } } },
    });
    if (!job) throw new NotFoundException('Job de dispatch introuvable.');
    return job;
  }

  async listDispatchJobsForMission(missionId: string) {
    return this.prisma.matchingDispatchJob.findMany({
      where: { missionId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
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

  /**
   * Resolve the scored candidate list for a mission.
   *
   * When `forceRescore` is false (dispatch path) and persisted scores are fresher
   * than SCORE_CACHE_TTL_MS, reuse them instead of re-scanning the candidate pool.
   * Otherwise, scan candidates with SQL pre-filtering + cursor pagination and score in JS.
   */
  private async computeScoredCandidates(
    mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>,
    config: MatchingConfig,
    opts: { forceRescore: boolean },
  ): Promise<ScoredCandidate[]> {
    if (!opts.forceRescore) {
      const cached = await this.loadCachedScores(mission.id, config);
      if (cached) return cached;
    }

    return this.scoreCandidatesForMission(mission, config);
  }

  /**
   * Load persisted MissionCandidateMatch rows when fresh enough and rebuild
   * ScoredCandidate objects. Returns null when no fresh cache is available.
   */
  private async loadCachedScores(missionId: string, config: MatchingConfig): Promise<ScoredCandidate[] | null> {
    const cacheThreshold = new Date(Date.now() - SCORE_CACHE_TTL_MS);
    const freshCount = await this.prisma.missionCandidateMatch.count({
      where: { missionId, lastScoredAt: { gt: cacheThreshold } },
    });
    if (freshCount === 0) return null;

    const rows = await this.prisma.missionCandidateMatch.findMany({
      where: { missionId },
      include: {
        candidate: {
          select: { id: true, email: true, profile: true },
        },
      },
    });

    const sentIds = new Set(
      rows
        .filter((row) => row.notificationStatus === MissionMatchNotificationStatus.SENT)
        .map((row) => row.candidateUserId),
    );

    return rows
      .map((row) => {
        const profile = row.candidate.profile;
        return {
          candidateUserId: row.candidateUserId,
          email: row.candidate.email,
          displayName: [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || row.candidate.email,
          profile: profile
            ? {
                firstName: profile.firstName,
                lastName: profile.lastName,
                city: profile.city,
                medicalStatus: profile.medicalStatus,
                specialty: profile.specialty,
                verifiedSpecialty: profile.verifiedSpecialty,
                completionScore: profile.completionScore || 0,
              }
            : { completionScore: 0 },
          eligible: row.eligible,
          score: row.score,
          tier: row.tier,
          reasons: (row.reasons as string[]) || [],
          exclusionReasons: (row.exclusionReasons as string[]) || [],
          risks: [],
          missingData: [],
          confidence: 0,
          breakdown: (row.breakdown as MatchBreakdown) || {},
          alreadyNotified: sentIds.has(row.candidateUserId),
        } satisfies ScoredCandidate;
      })
      .sort((a, b) => {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        return b.score - a.score;
      });
  }

  /**
   * Build the Prisma where-clause that pushes hard exclusions into SQL so the JS
   * scoring engine only processes a small, mostly-eligible candidate set.
   *
   * Conservative by design: a criterion is only pushed down when it cannot produce
   * false exclusions. Remaining exclusions (mission type legacy strings, time-slot
   * derivation, accommodation/parking, patient load, refused acts...) stay in JS.
   */
  private buildCandidateWhere(
    mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>,
    config: MatchingConfig,
    appliedCandidateIds: string[],
  ): Prisma.UserWhereInput {
    const requiredLevels = mission.requiredLevels.length ? mission.requiredLevels : [mission.requiredLevel];
    const acceptableStatuses = this.acceptableMedicalStatuses(requiredLevels);
    const minimumCompletion = Number(config.exclusions.minimumProfileCompletion || 35);
    const hoursUntilStart = (mission.startDate.getTime() - Date.now()) / 36e5;
    const missionCity = mission.city;
    const useMissionTypeFilter = config.exclusions.excludeRejectedMissionType !== false;
    const useLocationFilter = config.exclusions.excludeImpossibleLocation !== false;
    const useNoticeFilter = config.exclusions.excludeInsufficientNotice !== false;

    const profileWhere: Prisma.ProfileWhereInput = {
      // Hard exclusion 1: profile completion
      completionScore: { gte: minimumCompletion },
      // Hard exclusion 2: medical status compatible with required levels
      ...(acceptableStatuses.length ? { medicalStatus: { in: acceptableStatuses } } : {}),
    };

    // Hard exclusion 3: minimum notice hours (only excludes when a notice is set and too short).
    if (useNoticeFilter) {
      profileWhere.OR = [
        { minimumNoticeHours: null },
        { minimumNoticeHours: { lte: Math.floor(hoursUntilStart) } },
      ];
    }

    // Hard exclusion 4 (conservative): impossible location — only excludes LOCAL_ONLY
    // profiles whose city/preferredCities do not contain the mission city.
    // The full housing-based check remains in JS.
    if (useLocationFilter && missionCity) {
      profileWhere.AND = [
        {
          OR: [
            { city: missionCity },
            { preferredCities: { has: missionCity } },
            { mobilityRangeType: { not: 'LOCAL_ONLY' } },
            { mobilityRangeType: null },
          ],
        },
      ];
    }

    // Hard exclusion 5 (conservative): mission type overlap — only applied when the
    // candidate has explicitly listed accepted types. Legacy free-text values that
    // don't match the enum are handled in JS, so we also keep candidates whose
    // accepted list is empty to avoid false exclusions.
    if (useMissionTypeFilter) {
      profileWhere.AND = [
        ...(profileWhere.AND as Prisma.ProfileWhereInput[] | undefined) || [],
        {
          OR: [
            { acceptedMissionTypes: { isEmpty: true } },
            { acceptedMissionTypes: { has: mission.missionType } },
          ],
        },
      ];
    }

    return {
      role: UserRole.CANDIDATE,
      status: UserStatus.ACTIVE,
      emailVerified: true,
      id: { notIn: appliedCandidateIds },
      NOT: { profile: null },
      profile: profileWhere,
    };
  }

  private async scoreCandidatesForMission(
    mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>,
    config: MatchingConfig,
  ): Promise<ScoredCandidate[]> {
    const existingMatches = await this.prisma.missionCandidateMatch.findMany({
      where: { missionId: mission.id },
      select: { candidateUserId: true, notificationStatus: true },
    });
    const sentCandidateIds = new Set(
      existingMatches
        .filter((match) => match.notificationStatus === MissionMatchNotificationStatus.SENT)
        .map((match) => match.candidateUserId),
    );
    const appliedCandidateIds = Array.from(new Set(mission.applications.map((application) => application.candidateUserId)));

    const where = this.buildCandidateWhere(mission, config, appliedCandidateIds);

    // Cursor-paginated scan: pull CANDIDATE_BATCH_SIZE at a time, score, accumulate,
    // stop early when MAX_CANDIDATES_SCAN is reached or no more rows.
    const scored: ScoredCandidate[] = [];
    let cursor: { createdAt: Date; id: string } | null = null;
    let scanned = 0;

    while (scanned < MAX_CANDIDATES_SCAN) {
      const batch = await this.prisma.user.findMany({
        where,
        include: { profile: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: CANDIDATE_BATCH_SIZE,
        ...(cursor
          ? {
              skip: 1,
              cursor: { id: cursor.id },
            }
          : {}),
      });

      if (!batch.length) break;

      for (const candidate of batch) {
        scored.push({
          ...this.scoreCandidate(mission, candidate, config),
          alreadyNotified: sentCandidateIds.has(candidate.id),
        });
      }

      scanned += batch.length;
      const last = batch[batch.length - 1];
      cursor = { createdAt: last.createdAt, id: last.id };

      if (batch.length < CANDIDATE_BATCH_SIZE) break;
    }

    return scored.sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
      return b.score - a.score;
    });
  }

  /**
   * Map required levels to the set of MedicalStatus values that satisfy them
   * (mirrors `isLevelCompatible` + `medicalStatusToRequiredLevel`).
   */
  private acceptableMedicalStatuses(requiredLevels: RequiredLevel[]): MedicalStatus[] {
    const compatible: Record<RequiredLevel, MedicalStatus[]> = {
      STUDENT: [MedicalStatus.STUDENT, MedicalStatus.INTERN, MedicalStatus.JUNIOR_DOCTOR, MedicalStatus.DOCTOR, MedicalStatus.REGULAR_LOCUM],
      INTERN: [MedicalStatus.INTERN, MedicalStatus.JUNIOR_DOCTOR, MedicalStatus.DOCTOR, MedicalStatus.REGULAR_LOCUM],
      JUNIOR_DOCTOR: [MedicalStatus.JUNIOR_DOCTOR, MedicalStatus.DOCTOR, MedicalStatus.REGULAR_LOCUM],
      DOCTOR: [MedicalStatus.DOCTOR, MedicalStatus.REGULAR_LOCUM],
      NURSE: [MedicalStatus.NURSE],
      OPERATING_ROOM_ASSISTANT: [MedicalStatus.OPERATING_ROOM_ASSISTANT],
      OTHER: [MedicalStatus.OTHER],
    };
    const set = new Set<MedicalStatus>();
    for (const level of requiredLevels) {
      for (const status of compatible[level] || []) set.add(status);
    }
    return Array.from(set);
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
