// Both outlines use eight cubic segments, so the same SVG path can become a tile.
const pinCenterY = 20 - Math.sqrt(28 ** 2 - 20 ** 2);
const startAngle = Math.atan2(20 - pinCenterY, -20);
const endAngle = Math.PI * 2 + Math.atan2(20 - pinCenterY, 20);

function makePinOutline() {
  const points = [0, 40, -20 / 3, 100 / 3, -40 / 3, 80 / 3, -20, 20];
  let from = startAngle;
  for (const to of [Math.PI, Math.PI * 1.25, Math.PI * 1.5, Math.PI * 1.75, Math.PI * 2, endAngle]) {
    const k = 4 / 3 * Math.tan((to - from) / 4);
    const x1 = 28 * Math.cos(from);
    const y1 = pinCenterY + 28 * Math.sin(from);
    const x2 = 28 * Math.cos(to);
    const y2 = pinCenterY + 28 * Math.sin(to);
    points.push(x1 - k * 28 * Math.sin(from), y1 + k * 28 * Math.cos(from), x2 + k * 28 * Math.sin(to), y2 - k * 28 * Math.cos(to), x2, y2);
    from = to;
  }
  points.push(40 / 3, 80 / 3, 20 / 3, 100 / 3, 0, 40);
  return points;
}

export const pinOutline = makePinOutline();
const corner = 21 * .5522847498;
export const tileOutline = [
  13, 34,
  13 / 3, 34, -13 / 3, 34, -13, 34,
  -13 - corner, 34, -34, 13 + corner, -34, 13,
  -34, 13 / 3, -34, -13 / 3, -34, -13,
  -34, -13 - corner, -13 - corner, -34, -13, -34,
  -13 / 3, -34, 13 / 3, -34, 13, -34,
  13 + corner, -34, 34, -13 - corner, 34, -13,
  34, -13 / 3, 34, 13 / 3, 34, 13,
  34, 13 + corner, 13 + corner, 34, 13, 34,
];

export const mapRoute = [112, 188, 151, 188, 178, 155, 219, 167, 260, 179, 261, 230, 301, 238, 341, 246, 365, 282, 407, 293];
export const straightRoute = [52, 206, 98, 206, 144, 206, 190, 206, 236, 206, 284, 206, 330, 206, 376, 206, 422, 206, 468, 206];
export const discussionRoute = [52, 94, 98, 94, 128, 92, 202, 92, 282, 92, 238, 218, 318, 218, 374, 218, 422, 218, 468, 218];

export function curvePath(points: readonly number[], closed = false) {
  const rounded = points.map(value => Math.round(value * 1000) / 1000);
  return `M${rounded.slice(0, 2).join(' ')}C${rounded.slice(2).join(' ')}${closed ? 'Z' : ''}`;
}

export function morphPath(from: readonly number[], to: readonly number[], progress: number, closed = false) {
  return curvePath(from.map((value, index) => value + (to[index] - value) * progress), closed);
}
