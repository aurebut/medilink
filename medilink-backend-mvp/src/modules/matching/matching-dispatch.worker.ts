import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  MatchingDispatchJobStatus,
  MissionMatchNotificationStatus,
  NotificationType,
  Prisma,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { EmailService } from '../notifications/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';

const POLL_INTERVAL_MS = 5_000;
const MAX_CONCURRENT_JOBS = 3;
const MAX_FAILURES_PER_JOB = 50;

type DispatchCandidate = {
  candidateUserId: string;
  email: string;
  score: number;
  tier: string;
  reasons: string[];
};

/**
 * DB-backed async dispatch worker.
 *
 * Consumes `MatchingDispatchJob` rows in `QUEUED` status and performs the actual
 * notification + email sends for each selected candidate, updating the
 * `MissionCandidateMatch` rows and the job progress along the way.
 *
 * This keeps the admin-facing dispatch endpoint non-blocking: it returns
 * immediately with `accepted: N` and a `jobId`, while this worker processes the
 * sends in the background. Swap for BullMQ/SQS later by replacing the poll loop
 * with a queue consumer; the job table stays the source of truth.
 */
@Injectable()
export class MatchingDispatchWorker implements OnModuleInit {
  private readonly logger = new Logger(MatchingDispatchWorker.name);
  private timer: NodeJS.Timeout | null = null;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly email: EmailService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    this.timer = setInterval(() => {
      this.tick().catch((error) => this.logger.error(`Dispatch poll failed: ${error?.message ?? error}`));
    }, POLL_INTERVAL_MS);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.processQueuedJobs();
    } finally {
      this.running = false;
    }
  }

  private async processQueuedJobs() {
    const jobs = await this.prisma.matchingDispatchJob.findMany({
      where: { status: MatchingDispatchJobStatus.QUEUED },
      orderBy: { createdAt: 'asc' },
      take: MAX_CONCURRENT_JOBS,
    });

    await Promise.all(jobs.map((job) => this.processJob(job.id).catch((error) => {
      this.logger.error(`Job ${job.id} crashed: ${error?.message ?? error}`);
    })));
  }

  private async processJob(jobId: string) {
    const claimed = await this.prisma.matchingDispatchJob.updateMany({
      where: { id: jobId, status: MatchingDispatchJobStatus.QUEUED },
      data: { status: MatchingDispatchJobStatus.RUNNING, startedAt: new Date() },
    });
    if (claimed.count === 0) return; // already picked up by another tick / cancelled

    const job = await this.prisma.matchingDispatchJob.findUnique({
      where: { id: jobId },
      include: { mission: { include: { establishment: { select: { name: true } } } } },
    });
    if (!job) return;

    const candidateUserIds = job.candidateUserIds || [];
    if (!candidateUserIds.length) {
      await this.finalizeJob(jobId, MatchingDispatchJobStatus.COMPLETED, 0, 0, [], null);
      return;
    }

    // Load candidate match rows + user emails for the selected candidates.
    const rows = await this.prisma.missionCandidateMatch.findMany({
      where: { missionId: job.missionId, candidateUserId: { in: candidateUserIds } },
      include: { candidate: { select: { id: true, email: true } } },
    });

    const candidates: DispatchCandidate[] = candidateUserIds
      .map((id) => {
        const row = rows.find((r) => r.candidateUserId === id);
        if (!row) return null;
        return {
          candidateUserId: id,
          email: row.candidate.email,
          score: row.score,
          tier: row.tier,
          reasons: (row.reasons as string[]) || [],
        };
      })
      .filter((c): c is DispatchCandidate => c !== null);

    const failures: Array<{ candidateUserId: string; error: string }> = [];
    let sentCount = 0;

    for (const candidate of candidates) {
      try {
        await this.notifications.create({
          userId: candidate.candidateUserId,
          type: NotificationType.MISSION_RECOMMENDATION,
          title: 'Mission recommandée',
          body: `${job.mission.title} correspond fortement à votre profil.`,
          data: {
            missionId: job.missionId,
            score: candidate.score,
            tier: candidate.tier,
            reasons: candidate.reasons,
            dispatchJobId: jobId,
          },
        });

        await this.email.sendMissionRecommendationEmail(candidate.candidateUserId, candidate.email, {
          missionTitle: job.mission.title,
          establishmentName: job.mission.establishment.name,
          city: job.mission.city,
          startDate: job.mission.startDate,
          endDate: job.mission.endDate,
          startTime: job.mission.startTime,
          endTime: job.mission.endTime,
          score: candidate.score,
          reasons: candidate.reasons,
          missionId: job.missionId,
        });

        await this.prisma.missionCandidateMatch.update({
          where: { missionId_candidateUserId: { missionId: job.missionId, candidateUserId: candidate.candidateUserId } },
          data: {
            notificationStatus: MissionMatchNotificationStatus.SENT,
            notifiedAt: new Date(),
          },
        });

        sentCount += 1;
      } catch (error: any) {
        const message = error?.message || 'Erreur inconnue';
        failures.push({ candidateUserId: candidate.candidateUserId, error: message });

        await this.prisma.missionCandidateMatch.update({
          where: { missionId_candidateUserId: { missionId: job.missionId, candidateUserId: candidate.candidateUserId } },
          data: { notificationStatus: MissionMatchNotificationStatus.FAILED },
        }).catch(() => undefined);

        if (failures.length >= MAX_FAILURES_PER_JOB) break;
      }
    }

    const finalStatus = failures.length === 0
      ? MatchingDispatchJobStatus.COMPLETED
      : sentCount === 0
        ? MatchingDispatchJobStatus.FAILED
        : MatchingDispatchJobStatus.PARTIAL;

    await this.finalizeJob(jobId, finalStatus, sentCount, failures.length, failures, null);

    await this.audit.log({
      actorUserId: job.actorUserId,
      action: 'matching.dispatch.sent',
      entityType: 'mission',
      entityId: job.missionId,
      metadata: {
        jobId,
        targetCount: job.targetCount,
        minimumScore: job.minimumScore,
        sent: sentCount,
        failed: failures.length,
        selectedTier: job.selectedTier,
        status: finalStatus,
      },
    });
  }

  private async finalizeJob(
    jobId: string,
    status: MatchingDispatchJobStatus,
    sentCount: number,
    failedCount: number,
    failures: Array<{ candidateUserId: string; error: string }>,
    error: string | null,
  ) {
    await this.prisma.matchingDispatchJob.update({
      where: { id: jobId },
      data: {
        status,
        sentCount,
        failedCount,
        failures: failures.length ? (failures as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        error,
        completedAt: new Date(),
      },
    });
  }
}
