export function getMissionPublicPath(missionId: string) {
  return `/missions/${missionId}`;
}

export function getMissionApplyPath(missionId: string) {
  return `/app/missions/${missionId}/apply`;
}

export function getMissionPublicUrl(missionId: string, origin?: string) {
  const path = getMissionPublicPath(missionId);
  return origin ? `${origin}${path}` : path;
}
