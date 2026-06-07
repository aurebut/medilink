import type { Conversation, MissionAgreement } from './types';

export function getMissionPublicPath(missionId: string) {
  return `/missions/${missionId}`;
}

export function getMissionApplyPath(missionId: string) {
  return `/app/missions/${missionId}/apply`;
}

export function getCandidateMissionPath(missionId: string) {
  return `/app/missions/${missionId}`;
}

export function getCandidateConversationPath(conversationId?: string | null) {
  return conversationId ? `/app/messages?id=${conversationId}` : '/app/messages';
}

export function getEstablishmentConversationPath(conversationId?: string | null) {
  return conversationId ? `/establishment/messages?id=${conversationId}` : '/establishment/messages';
}

export function getMissionBillingRowId(
  conversation?: Pick<Conversation, 'id' | 'applicationId'> | null,
  agreement?: Pick<MissionAgreement, 'id'> | null,
) {
  const id = agreement?.id || conversation?.applicationId || conversation?.id;
  return id ? `medilink-${id}` : null;
}

export function getCandidateBillingMissionPath(
  conversation?: Pick<Conversation, 'id' | 'applicationId'> | null,
  agreement?: Pick<MissionAgreement, 'id'> | null,
) {
  const rowId = getMissionBillingRowId(conversation, agreement);
  return rowId ? `/app/billing/${encodeURIComponent(rowId)}` : '/app/billing';
}

export function getEstablishmentBillingMissionPath(
  conversation?: Pick<Conversation, 'id' | 'applicationId'> | null,
  agreement?: Pick<MissionAgreement, 'id'> | null,
) {
  const rowId = getMissionBillingRowId(conversation, agreement);
  return rowId ? `/establishment/billing/${encodeURIComponent(rowId)}` : '/establishment/billing';
}

export function getMissionPublicUrl(missionId: string, origin?: string) {
  const path = getMissionPublicPath(missionId);
  return origin ? `${origin}${path}` : path;
}
