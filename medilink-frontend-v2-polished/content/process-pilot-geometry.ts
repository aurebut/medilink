// The visible connections and the travelling sheets share these exact curves.
// Endpoints meet the rounded faces; labels sit outside the triangle.
export const pilotActors = {
  order: { x: 260, y: 69 },
  holder: { x: 65, y: 267 },
  locum: { x: 455, y: 267 },
};

export const pilotLinks = {
  left: [89, 238, 120, 160, 185, 114, 236, 98],
  right: [284, 98, 335, 114, 400, 160, 431, 238],
  bottom: [98, 276, 178, 342, 342, 342, 422, 276],
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
