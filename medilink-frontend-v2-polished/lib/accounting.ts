export type AccountingEntryKind = 'REVENUE' | 'EXPENSE';
export type AccountingEntrySource = 'MANUAL' | 'MEDILINK' | 'BANK' | 'IMPORT';
export type AccountingEntryStatus = 'DRAFT' | 'TO_REVIEW' | 'VALIDATED' | 'VOIDED';

export type AccountingEntry = {
  id: string;
  kind: AccountingEntryKind;
  date: string;
  counterparty: string;
  mission: string;
  amount: number;
  amountCents: number;
  currency: string;
  paymentMethod: string;
  notes?: string | null;
  hasReceipt: boolean;
  source: AccountingEntrySource;
  status: AccountingEntryStatus;
  categoryCode?: string | null;
  professionalShareBps: number;
  agreementId?: string | null;
};

export type AccountingProfile = {
  taxRegime: 'MICRO_BNC' | 'CONTROLLED_DECLARATION' | null;
  socialScheme: 'RSPM' | 'PAMC' | 'OTHER' | null;
  activityMode: 'LIBERAL' | 'SALARIED' | 'MIXED' | null;
  declarationFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | null;
  activityStartDate: string | null;
  exclusiveLocum: boolean | null;
  hasOtherIndependentActivity: boolean | null;
  onboardingCompleted: boolean;
};

export type RetrocessionSettlement = {
  id: string;
  agreementId: string;
  conversationId: string;
  missionId: string;
  mission: string;
  client: string;
  startDate?: string | null;
  endDate?: string | null;
  agreementStatus: string;
  status: 'EXPECTED' | 'TO_VALIDATE' | 'VALIDATED' | 'PAID' | 'DISPUTED';
  retrocessionPercentage?: number | null;
  grossHonorariaCents?: number | null;
  expectedAmountCents?: number | null;
  finalAmountCents?: number | null;
  amount: number;
  currency: string;
  dueDate?: string | null;
  validatedAt?: string | null;
  paidAt?: string | null;
  hasReceipt: boolean;
  notes?: string | null;
};

export type AccountingCategory = {
  code: string;
  kind: AccountingEntryKind;
  label: string;
};

export type AccountingWorkspacePayload = {
  settings: { provisionRate?: number | null; budgetLimit?: number | null };
  entries: AccountingEntry[];
  classifiedIds: string[];
  profile?: AccountingProfile | null;
  settlements?: RetrocessionSettlement[];
  categories?: AccountingCategory[];
  rules?: {
    microBncThresholds: Record<string, number>;
    rspmAnnualThreshold: number;
    defaultProvisionRate: number;
  };
};

export function accountingYear(date?: string | null, fallback = new Date().getFullYear()) {
  if (!date) return fallback;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.getFullYear();
}

export function effectiveAmount(entry: AccountingEntry) {
  return entry.amount * ((entry.professionalShareBps ?? 10000) / 10000);
}

export function settlementStatusLabel(status: RetrocessionSettlement['status']) {
  return {
    EXPECTED: 'À venir',
    TO_VALIDATE: 'À régulariser',
    VALIDATED: 'Validée',
    PAID: 'Encaissée',
    DISPUTED: 'Contestée',
  }[status];
}

export function settlementStatusTone(status: RetrocessionSettlement['status']): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'PAID') return 'success';
  if (status === 'TO_VALIDATE') return 'warning';
  if (status === 'DISPUTED') return 'danger';
  return 'neutral';
}

export function buildAccountingCsv(entries: AccountingEntry[], categories: AccountingCategory[]) {
  const labels = new Map(categories.map((category) => [category.code, category.label]));
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const header = ['Date', 'Type', 'Source', 'Tiers', 'Libellé', 'Catégorie', 'Montant', 'Part professionnelle', 'Devise', 'Paiement', 'Justificatif', 'Notes'];
  const lines = entries.map((entry) => [
    new Date(entry.date).toISOString().slice(0, 10),
    entry.kind === 'REVENUE' ? 'Recette' : 'Dépense',
    entry.source,
    entry.counterparty,
    entry.mission,
    labels.get(entry.categoryCode || '') || entry.categoryCode || '',
    entry.amount,
    `${(entry.professionalShareBps ?? 10000) / 100}%`,
    entry.currency,
    entry.paymentMethod,
    entry.hasReceipt ? 'Oui' : 'Non',
    entry.notes || '',
  ].map(escape).join(';'));
  return [header.map(escape).join(';'), ...lines].join('\n');
}
