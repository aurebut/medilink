import type { Application, Conversation, MissionAgreement, MissionAgreementStatus } from './types';

export const weekDayLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function latestAgreement(conversation?: Conversation | null) {
  return conversation?.agreements?.[0] || null;
}

export function agreementTone(status?: MissionAgreementStatus | null): 'neutral' | 'success' | 'warning' | 'danger' {
  if (!status) return 'neutral';
  if (['FUNDS_SECURED', 'COMPLETED', 'PAYMENT_RELEASED'].includes(status)) return 'success';
  if (['PROPOSED', 'PAYMENT_REQUIRED'].includes(status)) return 'warning';
  if (['REJECTED', 'CANCELLED', 'DISPUTED', 'EXPIRED'].includes(status)) return 'danger';
  return 'neutral';
}

export function agreementLabel(status?: MissionAgreementStatus | null) {
  const labels: Record<MissionAgreementStatus, string> = {
    PROPOSED: 'Proposition reçue',
    PAYMENT_REQUIRED: 'Accord accepté',
    FUNDS_SECURED: 'Mission confirmée',
    COMPLETED: 'Mission terminée',
    PAYMENT_RELEASED: 'Rétrocession validée',
    REJECTED: 'Proposition refusée',
    CANCELLED: 'Annulée',
    DISPUTED: 'Litige',
    EXPIRED: 'Expirée',
  };
  return status ? labels[status] : 'Discussion';
}

export function agreementNextStep(status?: MissionAgreementStatus | null) {
  if (status === 'PROPOSED') return 'Répondre à la proposition';
  if (status === 'PAYMENT_REQUIRED') return 'Attente confirmation établissement';
  if (status === 'FUNDS_SECURED') return 'Mission à réaliser';
  if (status === 'COMPLETED') return 'Attente validation rétrocession';
  if (status === 'PAYMENT_RELEASED') return 'Justificatif disponible';
  if (status === 'REJECTED') return 'Reprendre l’échange';
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'Clôturée';
  if (status === 'DISPUTED') return 'Suivi MediLink requis';
  return 'Continuer la discussion';
}

export function conversationForApplication(application: Application, conversations: Conversation[]) {
  return conversations.find((conversation) => conversation.applicationId === application.id) || application.conversation || null;
}

export function candidateAmountLabel(agreement?: MissionAgreement | null) {
  if (!agreement) return 'Aucun justificatif';
  if (agreement.compensationMode === 'RETROCESSION') {
    return agreement.retrocessionPercentage
      ? `${agreement.retrocessionPercentage}% de rétrocession`
      : 'Rétrocession';
  }
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: agreement.currency || 'EUR',
    maximumFractionDigits: 0,
  }).format(agreement.candidateAmount || agreement.amount || 0);
}

export function missionDateValue(application: Application, agreement?: MissionAgreement | null) {
  return agreement?.startDate || application.mission?.startDate || null;
}

export function missionEndDateValue(application: Application, agreement?: MissionAgreement | null) {
  return agreement?.endDate || application.mission?.endDate || null;
}

export function sortByMissionDate<T extends { date?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

function calendarDate(value: string | Date) {
  if (typeof value === 'string') {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    }
  }
  return typeof value === 'string' ? new Date(value) : value;
}

function dayDiff(start: Date, end: Date) {
  const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endDate.getTime() - startDate.getTime()) / 86400000);
}

export function dateKey(value?: string | Date | null) {
  if (!value) return 'undated';
  const date = calendarDate(value);
  if (Number.isNaN(date.getTime())) return 'undated';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function dateRangeKeys(start?: string | Date | null, end?: string | Date | null) {
  const startDate = start ? calendarDate(start) : null;
  if (!startDate || Number.isNaN(startDate.getTime())) return ['undated'];

  const endDate = end ? calendarDate(end) : startDate;
  const normalizedEnd = endDate && !Number.isNaN(endDate.getTime()) && endDate >= startDate ? endDate : startDate;
  const keys: string[] = [];
  const cursor = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  const last = new Date(normalizedEnd.getFullYear(), normalizedEnd.getMonth(), normalizedEnd.getDate());

  while (cursor <= last) {
    keys.push(dateKey(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return keys;
}

export function startOfWeek(value: Date) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const mondayOffset = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - mondayOffset);
  return date;
}

export function addDays(value: Date, count: number) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  date.setDate(date.getDate() + count);
  return date;
}

export function buildWeek(start: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function buildWeekCarousel(anchor = new Date(), weekCount = 8) {
  const firstWeek = startOfWeek(anchor);
  return Array.from({ length: weekCount }, (_, index) => {
    const start = addDays(firstWeek, index * 7);
    return {
      key: dateKey(start),
      start,
      days: buildWeek(start),
    };
  });
}

export function weekRangeLabel(start: Date) {
  const end = addDays(start, 6);
  const dayFormatter = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });
  return `${dayFormatter.format(start)} - ${dayFormatter.format(end)}`;
}

export type CalendarEventSegment<T> = {
  item: T;
  key: string;
  lane: number;
  startIndex: number;
  endIndex: number;
  isStart: boolean;
  isEnd: boolean;
};

export type CalendarEventWeek<T> = {
  key: string;
  start: Date;
  days: Date[];
  segments: CalendarEventSegment<T>[];
  hiddenCount: number;
};

export function buildCalendarEventWeeks<T>(
  weeks: Date[][],
  items: T[],
  options: {
    getKey: (item: T) => string;
    getStart: (item: T) => string | Date | null | undefined;
    getEnd: (item: T) => string | Date | null | undefined;
    maxLanes?: number;
  },
): CalendarEventWeek<T>[] {
  const maxLanes = options.maxLanes ?? 3;

  return weeks.map((days) => {
    const weekStart = days[0];
    const weekEnd = days[days.length - 1];
    const candidateSegments = items
      .map((item) => {
        const start = options.getStart(item);
        if (!start) return null;
        const startDate = calendarDate(start);
        if (Number.isNaN(startDate.getTime())) return null;

        const end = options.getEnd(item);
        const endDate = end ? calendarDate(end) : startDate;
        const normalizedEnd = !Number.isNaN(endDate.getTime()) && endDate >= startDate ? endDate : startDate;
        if (normalizedEnd < weekStart || startDate > weekEnd) return null;

        return {
          item,
          key: options.getKey(item),
          startIndex: Math.max(0, dayDiff(weekStart, startDate)),
          endIndex: Math.min(6, dayDiff(weekStart, normalizedEnd)),
          isStart: startDate >= weekStart,
          isEnd: normalizedEnd <= weekEnd,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        if (!a || !b) return 0;
        if (a.startIndex !== b.startIndex) return a.startIndex - b.startIndex;
        return b.endIndex - b.startIndex - (a.endIndex - a.startIndex);
      }) as Array<Omit<CalendarEventSegment<T>, 'lane'>>;

    const laneEnds: number[] = [];
    const segments: CalendarEventSegment<T>[] = [];
    let hiddenCount = 0;

    candidateSegments.forEach((segment) => {
      const lane = laneEnds.findIndex((endIndex) => endIndex < segment.startIndex);
      const nextLane = lane === -1 ? laneEnds.length : lane;
      if (nextLane >= maxLanes) {
        hiddenCount += 1;
        return;
      }
      laneEnds[nextLane] = segment.endIndex;
      segments.push({ ...segment, lane: nextLane });
    });

    return {
      key: dateKey(weekStart),
      start: weekStart,
      days,
      segments,
      hiddenCount,
    };
  });
}
