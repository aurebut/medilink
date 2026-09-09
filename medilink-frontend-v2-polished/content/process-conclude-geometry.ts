// One curve drives both the payment connection and the travelling banknotes.
export const paymentRoute = [86, 215, 172, 125, 348, 125, 434, 215];
export const conclusionActors = { establishment: [86, 215], doctor: [434, 215] } as const;
export const conclusionSheets = [
  { x: 251, y: 215, width: 380, height: 316, angle: -3 },
  { x: 269, y: 215, width: 388, height: 322, angle: 3 },
  { x: 260, y: 211, width: 408, height: 334, angle: 0 },
];
