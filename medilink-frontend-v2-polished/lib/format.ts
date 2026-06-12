export function formatDate(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'medium' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

export function formatMoney(amount?: number | null, currency = 'EUR') {
  if (amount === undefined || amount === null) return 'Rémunération non précisée';
  const hasDecimals = amount % 1 !== 0;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(amount);
}

export function formatCompensation({
  compensationMode,
  retrocessionPercentage,
  compensationAmount,
  compensationCurrency,
}: {
  compensationMode?: string | null;
  retrocessionPercentage?: number | null;
  compensationAmount?: number | null;
  compensationCurrency?: string | null;
}) {
  if (compensationMode === 'RETROCESSION') {
    return retrocessionPercentage ? `${retrocessionPercentage}% de rétrocession d'honoraires` : 'Rétrocession d\'honoraires';
  }

  return formatMoney(compensationAmount, compensationCurrency || 'EUR');
}

export function initials(first?: string | null, last?: string | null, fallback = 'ML') {
  const a = first?.[0] || '';
  const b = last?.[0] || '';
  return (a + b || fallback).toUpperCase();
}
