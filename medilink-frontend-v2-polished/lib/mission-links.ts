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

export function getMissionPublicUrl(missionId: string, origin?: string) {
  const path = getMissionPublicPath(missionId);
  return origin ? `${origin}${path}` : path;
}
