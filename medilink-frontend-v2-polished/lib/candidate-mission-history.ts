import { conversationForApplication, latestAgreement, missionDateValue } from './candidate-workspace';
import type { Application, Conversation, MissionAgreement } from './types';

export type CandidateMissionHistoryRow = {
  application: Application;
  conversation?: Conversation | null;
  agreement?: MissionAgreement | null;
  date?: string | null;
};

export function applicationTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED' || status === 'WITHDRAWN' || status === 'CANCELLED') return 'danger';
  if (status === 'VIEWED') return 'warning';
  return 'neutral';
}

function isMissionHistoryRow(application: Application, agreement?: MissionAgreement | null) {
  if (application.status === 'ACCEPTED') return true;
  return [
    'PROPOSED',
    'PAYMENT_REQUIRED',
    'FUNDS_SECURED',
    'COMPLETED',
    'PAYMENT_RELEASED',
  ].includes(agreement?.status || '');
}

export function buildCandidateMissionHistoryRows(
  applications: Application[],
  conversations: Conversation[],
): CandidateMissionHistoryRow[] {
  return applications.flatMap((application) => {
    const conversation = conversationForApplication(application, conversations);
    const agreement = latestAgreement(conversation);
    if (!isMissionHistoryRow(application, agreement)) return [];

    return [{
      application,
      conversation,
      agreement,
      date: missionDateValue(application, agreement),
    }];
  }).sort((a, b) => new Date(b.application.updatedAt || b.application.createdAt).getTime() - new Date(a.application.updatedAt || a.application.createdAt).getTime());
}
