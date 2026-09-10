// Invisible delivery trajectories for the envelopes between the three actors.
// Endpoints meet the rounded faces; no connecting lines are rendered.
export const pilotActors = {
  order: { x: 260, y: 69 },
  holder: { x: 70, y: 285 },
  locum: { x: 450, y: 285 },
};

export const pilotInformationActors = { holder: { x: 70, y: 251 }, locum: { x: 450, y: 140 } };

// Keep the same two doctors as the practical information becomes a conversation.
export const pilotContactActors = { holder: { x: 104, y: 291 }, locum: { x: 416, y: 291 } };
export const pilotContactOrigin = { x: 260, y: 162 };
export const pilotContactRoute = [139, 291, 196, 339, 324, 339, 381, 291];

export const pilotLinks = {
  left: [90, 264, 120, 185, 185, 118, 239, 90],
  right: [281, 90, 335, 118, 400, 185, 430, 264],
  bottom: [99, 292, 178, 351, 342, 351, 421, 292],
};

function reverse(points: number[]) {
  return [points[6], points[7], points[4], points[5], points[2], points[3], points[0], points[1]];
}

export const pilotDeliveries = [
  { route: pilotLinks.bottom, recipient: 'locum' },
  { route: reverse(pilotLinks.right), recipient: 'order' },
  { route: pilotLinks.right, recipient: 'locum' },
  { route: reverse(pilotLinks.bottom), recipient: 'holder' },
  { route: pilotLinks.left, recipient: 'order' },
] as const;
