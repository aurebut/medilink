import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
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
    const eligible = scored.filter((candidate) => candidate.eligible);
    const excluded = scored.filter((candidate) => !candidate.eligible);

    await this.persistScores(missionId, scored);

    return {
      mission: this.missionSummary(mission),
      thresholds: MATCH_TIERS,
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
    const targetCount = dto.targetCount ?? 5;
    const minimumScore = dto.minimumScore ?? MATCH_TIERS[MATCH_TIERS.length - 1].minimumScore;
    const scored = (await this.scoreCandidatesForMission(mission, 200))
      .filter((candidate) => candidate.eligible && candidate.score >= minimumScore);

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

  private async scoreCandidatesForMission(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, _limit: number) {
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
        ...this.scoreCandidate(mission, candidate),
        alreadyNotified: sentCandidateIds.has(candidate.id),
      }))
      .sort((a, b) => {
        if (a.eligible !== b.eligible) return a.eligible ? -1 : 1;
        return b.score - a.score;
      });
  }

  private scoreCandidate(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, candidate: any): ScoredCandidate {
    const profile = candidate.profile;
    const reasons: string[] = [];
    const exclusionReasons = this.exclusionReasons(mission, profile);
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
      add('requiredLevel', 15, 'niveau candidat compatible');
    }

    const specialtyScore = this.specialtyScore(mission.specialty, [
      profile.specialty,
      profile.verifiedSpecialty,
    ]);
    add('specialty', specialtyScore, specialtyScore >= 24 ? 'specialite tres proche' : specialtyScore ? 'specialite partiellement proche' : undefined);

    const city = this.normalize(mission.city);
    const preferredCities = profile.preferredCities.map((value: string) => this.normalize(value));
    if (city && preferredCities.includes(city)) {
      add('location', 14, 'ville dans les preferences');
    } else if (city && this.normalize(profile.city) === city) {
      add('location', 12, 'meme ville que le profil');
    } else if (this.hasFlexibleMobility(profile)) {
      add('location', 8, 'mobilite compatible');
    }

    if (this.acceptedMissionTypes(profile).includes(mission.missionType)) {
      add('missionType', 10, 'type de mission accepte');
    }

    const missionTimeSlots = this.missionTimeSlots(mission);
    if (missionTimeSlots.length && this.hasIntersection(missionTimeSlots, profile.acceptedTimeSlots || [])) {
      add('timeSlot', 7, 'creneau accepte');
    }

    const missionDuration = this.missionDurationLabel(mission);
    if (missionDuration && profile.preferredDurations?.some((value: string) => this.sameText(value, missionDuration))) {
      add('duration', 5, 'format de duree prefere');
    }

    const practiceSetting = this.practiceSettingForMission(mission);
    if (practiceSetting && profile.acceptedPracticeSettings?.includes(practiceSetting)) {
      add('practiceSetting', 7, "cadre d'exercice accepte");
    }

    if (mission.knownSoftware.length && this.hasIntersection(mission.knownSoftware, profile.knownSoftware)) {
      add('software', 5, 'logiciel connu');
    } else if (mission.softwareUsed && profile.knownSoftware.some((value: string) => this.sameText(value, mission.softwareUsed))) {
      add('software', 5, 'logiciel connu');
    }

    if (mission.acceptedPatientTypes.length && this.hasIntersection(mission.acceptedPatientTypes, profile.acceptedPatientTypes)) {
      add('patientType', 4, 'patientele compatible');
    } else if (mission.patientType && profile.acceptedPatientTypes.some((value: string) => this.sameText(value, mission.patientType))) {
      add('patientType', 4, 'patientele compatible');
    }

    if (mission.requiredActs.length && this.hasIntersection(mission.requiredActs, profile.acceptedActs || [])) {
      add('acts', 7, 'actes attendus acceptes');
    }

    if (mission.hasSecretary === true && profile.secretaryRequired !== false) {
      add('workConditions', 3, 'secretariat compatible');
    }

    if (mission.accommodationProvided && profile.accommodationRequired) {
      add('accommodation', 3, 'logement fourni');
    }

    const score = Object.values(breakdown).reduce((total, value) => total + value, 0);

    return {
      candidateUserId: candidate.id,
      email: candidate.email,
      displayName: this.userDisplayName(candidate),
      profile: this.candidateProfileSummary(profile),
      eligible: true,
      score,
      tier: this.tierForScore(score),
      reasons,
      exclusionReasons: [],
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

  private exclusionReasons(mission: Awaited<ReturnType<MatchingService['getPublishedMission']>>, profile: any) {
    const reasons: string[] = [];
    const requiredLevels = mission.requiredLevels.length ? mission.requiredLevels : [mission.requiredLevel];
    const candidateLevel = this.medicalStatusToRequiredLevel(profile.medicalStatus);

    if ((profile.completionScore || 0) < 40) {
      reasons.push('profil candidat trop incomplet');
    }

    if (!candidateLevel || !this.isLevelCompatible(requiredLevels, candidateLevel)) {
      reasons.push('niveau ou diplome incompatible');
    }

    const acceptedMissionTypes = this.acceptedMissionTypes(profile);
    if (!acceptedMissionTypes.length) {
      reasons.push('preferences mission non renseignees');
    } else if (!acceptedMissionTypes.includes(mission.missionType)) {
      reasons.push('type de mission non accepte');
    }

    if (this.hasInsufficientNotice(mission, profile.minimumNoticeHours)) {
      reasons.push('preavis insuffisant');
    }

    if (this.hasRejectedWeekday(mission, profile.acceptedWeekdays || [], profile.refusedSchedules || [])) {
      reasons.push('jour de mission non accepte');
    }

    if (this.hasRejectedTimeSlot(mission, profile.acceptedTimeSlots || [], profile.refusedSchedules || [])) {
      reasons.push('creneau horaire non accepte');
    }

    if (this.hasImpossibleLocation(mission, profile)) {
      reasons.push('localisation incompatible');
    }

    if (profile.accommodationRequired && !mission.accommodationProvided) {
      reasons.push('logement obligatoire absent');
    }

    if (profile.parkingRequired && mission.parkingAvailable === false) {
      reasons.push('parking obligatoire absent');
    }

    const practiceSetting = this.practiceSettingForMission(mission);
    if (practiceSetting && profile.acceptedPracticeSettings?.length && !profile.acceptedPracticeSettings.includes(practiceSetting)) {
      reasons.push("cadre d'exercice non accepte");
    }

    if (this.refusesPatientType(mission, profile.refusedPatientTypes || [])) {
      reasons.push('patientele refusee');
    }

    if (profile.maxPatientsPerDay && mission.averagePatientsPerDay && mission.averagePatientsPerDay > profile.maxPatientsPerDay) {
      reasons.push('charge patients trop elevee');
    }

    if (mission.requiredActs.length && this.hasIntersection(mission.requiredActs, profile.refusedActs || [])) {
      reasons.push('acte requis refuse');
    }

    return reasons;
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
