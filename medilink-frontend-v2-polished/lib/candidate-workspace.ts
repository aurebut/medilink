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

export function sortByMissionDate<T extends { date?: string | null }>(items: T[]) {
  return [...items].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : Number.MAX_SAFE_INTEGER;
    const bTime = b.date ? new Date(b.date).getTime() : Number.MAX_SAFE_INTEGER;
    return aTime - bTime;
  });
}

export function dateKey(value?: string | Date | null) {
  if (!value) return 'undated';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return 'undated';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
