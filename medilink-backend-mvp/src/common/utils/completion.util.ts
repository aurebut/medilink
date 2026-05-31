export function calculateCompletionScore(fields: unknown[]) {
  const filled = fields.filter(isFilled).length;
  return Math.round((filled / fields.length) * 100);
}

function isFilled(value: unknown) {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'string') return value.trim().length > 0;
  return value !== null && value !== undefined;
}
