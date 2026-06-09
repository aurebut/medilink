'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, getApiUrl, getAuthToken } from '@/lib/api';
import { agreementTone } from '@/lib/candidate-workspace';
import { formatDate, formatMoney } from '@/lib/format';
import { getEstablishmentConversationPath } from '@/lib/mission-links';
import type { Conversation, EstablishmentBillingStatus, MissionAgreement, Application } from '@/lib/types';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LinkButton, LoadingCard, PageHeader, Select } from '@/components/ui';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { candidateNounCapitalized } from '@/lib/grammar';
import { statusLabel } from '@/lib/labels';

type ManualExpense = {
  id: string;
  date: string;
  remplacant: string;
  mission: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
  hasReceipt?: boolean;
};

type AccountingRow = {
  id: string;
  source: 'MEDILINK' | 'MANUAL';
  date?: string | null;
  remplacant: string;
  mission: string;
  amount: number;
  currency: string;
  status: 'AVAILABLE' | 'PENDING' | 'COMPLETED' | 'MANUAL' | 'PROPOSED';
  paymentMethod: string;
  conversationId?: string;
  agreement?: MissionAgreement | null;
  notes?: string;
  hasReceipt: boolean;
  classified: boolean;
};

type DashboardData = {
  totalExpenses: number;
  platformFees: number;
  netRemuneration: number;
  budgetProgress: number;
  remainingBudget: number;
  paidRows: AccountingRow[];
  pendingRows: AccountingRow[];
  completedRows: AccountingRow[];
  missingInvoiceRows: AccountingRow[];
  unclassifiedRows: AccountingRow[];
  alerts: Array<{ tone: 'neutral' | 'success' | 'warning' | 'danger'; title: string; row: AccountingRow | null }>;
};

type BillingTab = 'overview' | 'subscription' | 'missions' | 'expenses' | 'documents' | 'budget' | 'exports';

const STORAGE_KEY = 'medilink_establishment_billing_v2';
const DEFAULT_BUDGET_LIMIT = 150000;

const tabs: Array<{ id: BillingTab; label: string }> = [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'subscription', label: 'Abonnement' },
  { id: 'missions', label: 'Historique de missions' },
  { id: 'expenses', label: 'Dépenses' },
  { id: 'documents', label: 'Factures' },
  { id: 'budget', label: 'Suivi budget' },
  { id: 'exports', label: 'Exports' },
];

function safeNumber(value: FormDataEntryValue | null) {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function amountFromAgreement(agreement?: MissionAgreement | null) {
  if (!agreement) return 0;
  return agreement.amount || 0;
}

function platformFeeFromAgreement(agreement?: MissionAgreement | null) {
  if (!agreement) return 0;
  return agreement.platformFee || 0;
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function readStoredState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        manualRows: [] as ManualExpense[],
        budgetLimit: DEFAULT_BUDGET_LIMIT,
        classifiedIds: [] as string[],
      };
    }
    const parsed = JSON.parse(stored);
    return {
      manualRows: Array.isArray(parsed.manualRows) ? parsed.manualRows as ManualExpense[] : [],
      budgetLimit: typeof parsed.budgetLimit === 'number' ? parsed.budgetLimit : DEFAULT_BUDGET_LIMIT,
      classifiedIds: Array.isArray(parsed.classifiedIds) ? parsed.classifiedIds as string[] : [],
    };
  } catch {
    return {
      manualRows: [] as ManualExpense[],
      budgetLimit: DEFAULT_BUDGET_LIMIT,
      classifiedIds: [] as string[],
    };
  }
}

function rowYear(row: Pick<AccountingRow, 'date'>, fallback: number) {
  return row.date ? new Date(row.date).getFullYear() : fallback;
}

function rowStatusFromAgreement(agreement?: MissionAgreement | null): AccountingRow['status'] {
  if (!agreement) return 'PENDING';
  if (agreement.status === 'PAYMENT_RELEASED') return 'AVAILABLE';
  if (agreement.status === 'COMPLETED') return 'COMPLETED';
  if (agreement.status === 'PROPOSED') return 'PROPOSED';
  return 'PENDING';
}

function agreementLabelRecruiter(status?: string | null) {
  const labels: Record<string, string> = {
    PROPOSED: 'Proposition envoyée',
    PAYMENT_REQUIRED: 'Règlement requis',
    FUNDS_SECURED: 'Fonds sécurisés',
    COMPLETED: 'Mission terminée',
    PAYMENT_RELEASED: 'Versement libéré',
    REJECTED: 'Proposition refusée',
    CANCELLED: 'Annulée',
    DISPUTED: 'Litige',
    EXPIRED: 'Expirée',
  };
  return status ? (labels[status] || status) : 'Discussion';
}

function agreementNextStepRecruiter(status?: string | null) {
  if (status === 'PROPOSED') return 'Attente réponse candidat';
  if (status === 'PAYMENT_REQUIRED') return 'Procéder au paiement';
  if (status === 'FUNDS_SECURED') return 'Mission en cours / à réaliser';
  if (status === 'COMPLETED') return 'Valider et libérer le versement';
  if (status === 'PAYMENT_RELEASED') return 'Facture disponible';
  if (status === 'REJECTED') return 'Reprendre l’échange';
  if (status === 'CANCELLED' || status === 'EXPIRED') return 'Clôturée';
  if (status === 'DISPUTED') return 'Suivi MediLink requis';
  return 'Continuer la discussion';
}

function statusCopy(row: AccountingRow) {
  if (row.source === 'MANUAL') return row.hasReceipt ? 'Hors MediLink classable' : 'Facture manquante';
  if (row.agreement?.status === 'PAYMENT_RELEASED') return 'Facture disponible';
  return agreementNextStepRecruiter(row.agreement?.status);
}

function latestAgreement(conversation?: Conversation | null) {
  return conversation?.agreements?.[0] || null;
}

function candidateName(application?: Application | null) {
  if (!application) return 'Candidat';
  const name = [application.candidate?.profile?.firstName, application.candidate?.profile?.lastName].filter(Boolean).join(' ');
  return name || application.candidate?.email || `${candidateNounCapitalized(application.candidate?.profile)} à identifier`;
}

function buildCsv(rows: AccountingRow[]) {
  const header = ['Date', 'Source', 'Remplacant', 'Mission', 'Montant', 'Devise', 'Statut', 'Paiement', 'Facture', 'Notes'];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((row) => [
    row.date ? new Date(row.date).toISOString().slice(0, 10) : '',
    row.source,
    row.remplacant,
    row.mission,
    row.amount,
    row.currency,
    row.source === 'MEDILINK' ? agreementLabelRecruiter(row.agreement?.status) : 'Hors MediLink',
    row.paymentMethod,
    row.hasReceipt ? 'Oui' : 'Non',
    row.notes || '',
  ].map(escape).join(';'));
  return [header.map(escape).join(';'), ...lines].join('\n');
}

function downloadTextFile(fileName: string, content: string, mimeType = 'text/csv;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function timelineSteps(row: AccountingRow) {
  const status = row.agreement?.status;
  return [
    { key: 'proposal', label: 'Proposition', done: Boolean(status), active: status === 'PROPOSED' },
    { key: 'agreement', label: 'Accord', done: Boolean(status && !['PROPOSED', 'REJECTED', 'CANCELLED', 'EXPIRED'].includes(status)), active: status === 'PAYMENT_REQUIRED' },
    { key: 'confirmed', label: 'Sécurisée', done: Boolean(status && ['FUNDS_SECURED', 'COMPLETED', 'PAYMENT_RELEASED'].includes(status)), active: status === 'FUNDS_SECURED' },
    { key: 'completed', label: 'Réalisée', done: Boolean(status && ['COMPLETED', 'PAYMENT_RELEASED'].includes(status)), active: status === 'COMPLETED' },
    { key: 'released', label: 'Versement', done: status === 'PAYMENT_RELEASED', active: false },
    { key: 'classified', label: 'Classée', done: row.classified, active: row.hasReceipt && !row.classified },
  ];
}

export default function RecruiterBillingPage() {
  const { primary, loading: establishmentLoading } = useEstablishments();
  const [activeTab, setActiveTab] = useState<BillingTab>('overview');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [manualRows, setManualRows] = useState<ManualExpense[]>([]);
  const [classifiedIds, setClassifiedIds] = useState<string[]>([]);
  const [budgetLimit, setBudgetLimit] = useState(DEFAULT_BUDGET_LIMIT);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'PENDING' | 'COMPLETED' | 'MANUAL' | 'PROPOSED'>('ALL');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [billingStatus, setBillingStatus] = useState<EstablishmentBillingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const queryTab = new URLSearchParams(window.location.search).get('tab');
    if (queryTab === 'subscription') setActiveTab('subscription');

    const stored = readStoredState();
    setManualRows(stored.manualRows);
    setBudgetLimit(stored.budgetLimit);
    setClassifiedIds(stored.classifiedIds);

    api.get<Conversation[]>('/conversations')
      .then((data) => {
        if (primary) {
          setConversations(data.filter((c) => c.establishmentId === primary.id));
        } else {
          setConversations([]);
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [primary]);

  useEffect(() => {
    if (!primary) {
      setBillingStatus(null);
      return;
    }

    api.reload<EstablishmentBillingStatus>(`/billing/establishments/${primary.id}/status`)
      .then(setBillingStatus)
      .catch((e: any) => setError(e.message));
  }, [primary]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ manualRows, budgetLimit, classifiedIds }));
  }, [manualRows, budgetLimit, classifiedIds]);

  const accountingRows = useMemo<AccountingRow[]>(() => {
    const medilinkRowMap = new Map<string, AccountingRow>();

    conversations
      .map((conversation) => ({ conversation, agreement: latestAgreement(conversation) }))
      .filter((row) => row.agreement)
      .forEach(({ conversation, agreement }) => {
        const releasedOrSecured = ['FUNDS_SECURED', 'COMPLETED', 'PAYMENT_RELEASED'].includes(agreement?.status || '');
        const rowId = `medilink-${agreement?.id || conversation.applicationId || conversation.id}`;
        const amount = amountFromAgreement(agreement);
        const row = {
          id: rowId,
          source: 'MEDILINK' as const,
          date: agreement?.payment?.releasedAt || agreement?.completedAt || agreement?.startDate || conversation.mission?.startDate,
          remplacant: candidateName(conversation.application),
          mission: conversation.mission?.title || 'Mission MediLink',
          amount: releasedOrSecured ? amount : 0,
          currency: agreement?.currency || 'EUR',
          status: rowStatusFromAgreement(agreement),
          paymentMethod: releasedOrSecured ? 'Prélèvement MediLink' : 'À régler',
          conversationId: conversation.id,
          agreement,
          hasReceipt: agreement?.status === 'PAYMENT_RELEASED' || Boolean(agreement?.invoices?.some((invoice) => invoice.type === 'RECRUITER_INVOICE')),
          classified: classifiedIds.includes(rowId),
        };

        const existing = medilinkRowMap.get(rowId);
        if (!existing || new Date(row.date || 0).getTime() >= new Date(existing.date || 0).getTime()) {
          medilinkRowMap.set(rowId, row);
        }
      });

    const medilinkRows = medilinkRowMap.values() ? [...medilinkRowMap.values()] : [];

    const manualAccountingRows = manualRows.map((row) => ({
      id: row.id,
      source: 'MANUAL' as const,
      date: row.date,
      remplacant: row.remplacant,
      mission: row.mission,
      amount: row.amount,
      currency: 'EUR',
      status: 'MANUAL' as const,
      paymentMethod: row.paymentMethod,
      notes: row.notes,
      hasReceipt: Boolean(row.hasReceipt),
      classified: classifiedIds.includes(row.id),
    }));

    return [...medilinkRows, ...manualAccountingRows].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    });
  }, [classifiedIds, conversations, manualRows]);

  const availableYears = useMemo(() => {
    const years = new Set([getCurrentYear()]);
    accountingRows.forEach((row) => {
      if (row.date) years.add(new Date(row.date).getFullYear());
    });
    return [...years].sort((a, b) => b - a);
  }, [accountingRows]);

  const yearRows = useMemo(() => accountingRows.filter((row) => rowYear(row, selectedYear) === selectedYear), [accountingRows, selectedYear]);

  const filteredRows = useMemo(() => yearRows.filter((row) => {
    return statusFilter === 'ALL' || row.status === statusFilter;
  }), [statusFilter, yearRows]);

  const dashboard = useMemo<DashboardData>(() => {
    const paidRows = yearRows.filter((row) => row.amount > 0 && row.status !== 'PENDING' && row.status !== 'PROPOSED');
    const pendingRows = yearRows.filter((row) => row.status === 'PENDING' || row.status === 'PROPOSED');
    const completedRows = yearRows.filter((row) => row.status === 'COMPLETED');
    const missingInvoiceRows = yearRows.filter((row) => !row.hasReceipt);
    const unclassifiedRows = yearRows.filter((row) => row.hasReceipt && !row.classified);
    
    const totalExpenses = paidRows.reduce((sum, row) => sum + row.amount, 0);
    const platformFees = paidRows.reduce((sum, row) => {
      if (row.source === 'MEDILINK') {
        return sum + platformFeeFromAgreement(row.agreement);
      }
      return sum;
    }, 0);
    const netRemuneration = totalExpenses - platformFees;

    const budgetProgress = Math.min(100, Math.round((totalExpenses / budgetLimit) * 100));
    const remainingBudget = Math.max(0, budgetLimit - totalExpenses);
    
    const alerts = [
      ...yearRows.filter(row => row.source === 'MEDILINK' && row.agreement?.status === 'PAYMENT_REQUIRED').map((row) => ({ tone: 'danger' as const, title: 'Règlement requis pour confirmer l’accord', row })),
      ...completedRows.map((row) => ({ tone: 'warning' as const, title: 'Mission réalisée, versement à libérer', row })),
      ...unclassifiedRows.slice(0, 4).map((row) => ({ tone: 'success' as const, title: 'Facture disponible à classer', row })),
      ...missingInvoiceRows.filter((row) => row.source === 'MANUAL').map((row) => ({ tone: 'warning' as const, title: 'Dépense hors MediLink sans justificatif', row })),
      ...(budgetProgress >= 85 ? [{ tone: 'warning' as const, title: 'Budget cible annuel presque atteint', row: null }] : []),
    ].slice(0, 8);

    return {
      totalExpenses,
      platformFees,
      netRemuneration,
      budgetProgress,
      remainingBudget,
      paidRows,
      pendingRows,
      completedRows,
      missingInvoiceRows,
      unclassifiedRows,
      alerts,
    };
  }, [budgetLimit, yearRows]);

  async function downloadRecruiterInvoice(conversationId: string) {
    setBusyId(conversationId);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`/conversations/${conversationId}/invoices/recruiter.pdf`), {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Téléchargement de la facture impossible.');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      link.href = url;
      link.download = match?.[1] || 'facture-etablissement.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  function addManualExpense(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = safeNumber(form.get('amount'));
    const date = String(form.get('date') || '');
    const remplacant = String(form.get('remplacant') || '').trim();
    const mission = String(form.get('mission') || '').trim();
    if (!date || !remplacant || !mission || amount <= 0) {
      setError('Renseignez au minimum une date, un remplaçant, une mission et un montant positif.');
      return;
    }

    setError(null);
    setManualRows((rows) => [{
      id: `manual-${Date.now()}`,
      date,
      remplacant,
      mission,
      amount,
      paymentMethod: String(form.get('paymentMethod') || 'Virement'),
      notes: String(form.get('notes') || '').trim(),
      hasReceipt: form.get('hasReceipt') === 'on',
    }, ...rows]);
    event.currentTarget.reset();
  }

  function removeManualExpense(id: string) {
    setManualRows((rows) => rows.filter((row) => row.id !== id));
    setClassifiedIds((ids) => ids.filter((item) => item !== id));
  }

  function toggleClassified(id: string) {
    setClassifiedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  function exportCsv(scope: 'year' | 'filtered') {
    const rows = scope === 'year' ? yearRows : filteredRows;
    downloadTextFile(`medilink-etablissement-compta-${selectedYear}${scope === 'filtered' ? '-filtre' : ''}.csv`, buildCsv(rows));
  }

  async function openBillingPortal() {
    if (!primary) return;

    setBusyId('billing-portal');
    setError(null);
    try {
      const response = await api.post<{ url: string }>('/billing/portal', { establishmentId: primary.id });
      window.location.href = response.url;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (establishmentLoading || loading) return <LoadingCard />;

  if (!primary) {
    return (
      <>
        <PageHeader title="Ma compta" description="Factures, dépenses et budget de vos recrutements." />
        <Card className="card-highlight">
          <h2>Aucun établissement rattaché</h2>
          <p>Créez une fiche établissement pour gérer vos factures et suivre votre budget.</p>
          <LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Ma compta"
        description="Cockpit de dépenses, suivi des paiements, factures établissement et exports pour vos missions."
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="billing-nav-row">
        <Select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} aria-label="Année">
          {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
        </Select>
        <div className="billing-tabs" role="tablist" aria-label="Sections comptables">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
              role="tab"
              aria-selected={activeTab === tab.id}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' ? (
        <OverviewTab
          dashboard={dashboard}
          budgetLimit={budgetLimit}
          selectedYear={selectedYear}
          setBudgetLimit={setBudgetLimit}
          openMissions={() => setActiveTab('missions')}
          openDocuments={() => setActiveTab('documents')}
        />
      ) : null}

      {activeTab === 'subscription' ? (
        <SubscriptionTab
          billingStatus={billingStatus}
          busy={busyId === 'billing-portal'}
          onOpenPortal={() => void openBillingPortal()}
        />
      ) : null}

      {activeTab === 'missions' ? (
        <MissionsTab rows={yearRows} busyId={busyId} onDownload={downloadRecruiterInvoice} onClassify={toggleClassified} />
      ) : null}

      {activeTab === 'expenses' ? (
        <ExpensesTab
          rows={filteredRows}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          busyId={busyId}
          onDownload={downloadRecruiterInvoice}
          onRemoveManual={removeManualExpense}
          onAddManual={addManualExpense}
          onExportFiltered={() => exportCsv('filtered')}
        />
      ) : null}

      {activeTab === 'documents' ? (
        <DocumentsTab rows={yearRows} busyId={busyId} onDownload={downloadRecruiterInvoice} onClassify={toggleClassified} />
      ) : null}

      {activeTab === 'budget' ? (
        <BudgetTab dashboard={dashboard} selectedYear={selectedYear} budgetLimit={budgetLimit} setBudgetLimit={setBudgetLimit} />
      ) : null}

      {activeTab === 'exports' ? (
        <ExportsTab
          dashboard={dashboard}
          selectedYear={selectedYear}
          yearRows={yearRows}
          onExportYear={() => exportCsv('year')}
          onExportFiltered={() => exportCsv('filtered')}
        />
      ) : null}
    </>
  );
}

function SubscriptionTab({
  billingStatus,
  busy,
  onOpenPortal,
}: {
  billingStatus: EstablishmentBillingStatus | null;
  busy: boolean;
  onOpenPortal: () => void;
}) {
  if (!billingStatus) return <LoadingCard label="Chargement de l'abonnement..." />;

  const status = billingStatus.subscription?.status;
  const renewsAt = billingStatus.subscription?.currentPeriodEnd;

  return (
    <div className="billing-tax-grid">
      <Card className="dashboard-panel billing-tax-card">
        <div>
          <span>Acces publication</span>
          <h2>{billingStatus.hasActiveSubscription ? 'Abonnement actif' : billingStatus.availableCredits > 0 ? 'Credit disponible' : 'Paiement requis'}</h2>
          <p>
            {billingStatus.hasActiveSubscription
              ? 'Les annonces peuvent etre creees en brouillon ou publiees sans paiement unitaire.'
              : billingStatus.availableCredits > 0
                ? "Un credit deja paye est disponible. Il sera debite quand un candidat acceptera une mission."
                : 'Choisissez un abonnement ou un paiement unique avant de creer une nouvelle annonce.'}
          </p>
        </div>
        <div className="billing-provision-grid">
          <div><span>Credits disponibles</span><strong>{billingStatus.availableCredits}</strong></div>
          <div><span>Publications utilisees</span><strong>{billingStatus.consumedCredits}</strong></div>
          <div><span>Abonnement</span><strong>{status || 'Inactif'}</strong></div>
          <div><span>Renouvellement</span><strong>{renewsAt ? formatDate(renewsAt) : '-'}</strong></div>
        </div>
        <div className="actions">
          <LinkButton href="/establishment/missions/new">Creer une annonce</LinkButton>
          <Button type="button" variant="light" disabled={!billingStatus.stripeConfigured || busy} onClick={onOpenPortal}>
            {busy ? 'Ouverture...' : 'Gerer sur Stripe'}
          </Button>
        </div>
      </Card>

      <Card className="dashboard-panel">
        <div className="toolbar compact">
          <div>
            <h2>Tarifs de publication</h2>
            <p className="small">Le paiement est demande avant le formulaire pour garder une experience transparente.</p>
          </div>
        </div>
        <div className="billing-provision-grid">
          <div><span>Abonnement</span><strong>{formatCents(billingStatus.prices.monthlySubscription.amount, billingStatus.prices.monthlySubscription.currency)} / mois</strong></div>
          <div><span>Annonce unique</span><strong>{formatCents(billingStatus.prices.publicationCredit.amount, billingStatus.prices.publicationCredit.currency)}</strong></div>
        </div>
        {!billingStatus.stripeConfigured ? (
          <Alert type="error">Stripe n'est pas encore configure sur le serveur Render.</Alert>
        ) : null}
      </Card>
    </div>
  );
}

function formatCents(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function OverviewTab({
  dashboard,
  budgetLimit,
  selectedYear,
  setBudgetLimit,
  openMissions,
  openDocuments,
}: {
  dashboard: DashboardData;
  budgetLimit: number;
  selectedYear: number;
  setBudgetLimit: (value: number) => void;
  openMissions: () => void;
  openDocuments: () => void;
}) {
  return (
    <>
      <div className="billing-overview-summary">
        <Card className="billing-hero-card">
          <div className="billing-hero-copy">
            <span>Exercice {selectedYear}</span>
            <h2>{formatMoney(dashboard.totalExpenses)}</h2>
            <p>Dépenses engagées connues dans MediLink et ajoutées manuellement.</p>
          </div>
          <div className="billing-overview-kpis">
            <div>
              <span>Réglées</span>
              <strong>{dashboard.paidRows.length}</strong>
              <small>{formatMoney(dashboard.totalExpenses)} sur l'exercice</small>
            </div>
            <div>
              <span>En attente</span>
              <strong>{dashboard.pendingRows.length}</strong>
              <small>Accords ou propositions en cours</small>
            </div>
            <div>
              <span>À finaliser</span>
              <strong>{dashboard.completedRows.length}</strong>
              <small>Missions terminées à solder</small>
            </div>
          </div>
        </Card>

        <Card className="billing-overview-side">
          <div className="billing-side-row">
            <div>
              <span>Frais de service MediLink</span>
              <strong>{formatMoney(dashboard.platformFees)}</strong>
            </div>
          </div>
          <div className="billing-side-row">
            <div>
              <span>Rémunération candidats</span>
              <strong>{formatMoney(dashboard.netRemuneration)}</strong>
            </div>
          </div>
          <div className="billing-side-progress">
            <div>
              <span>Budget consommé</span>
              <Badge tone={dashboard.budgetProgress >= 85 ? 'warning' : 'success'}>{dashboard.budgetProgress}%</Badge>
            </div>
            <div className="billing-progress"><span style={{ width: `${dashboard.budgetProgress}%` }} /></div>
            <small>{formatMoney(dashboard.remainingBudget)} disponible avant seuil {formatMoney(budgetLimit)}</small>
          </div>
          <input
            className="billing-slider"
            type="range"
            min="50000"
            max="500000"
            step="10000"
            value={budgetLimit}
            onChange={(event) => setBudgetLimit(Number(event.target.value))}
            aria-label="Budget annuel cible"
          />
        </Card>
      </div>

      <div className="billing-overview-grid">
        <Card className="dashboard-panel">
          <div className="toolbar">
            <div>
              <h2>Alertes d’action</h2>
              <p className="small">Sujets comptables et financiers à traiter en priorité.</p>
            </div>
            <Button type="button" variant="light" onClick={openMissions}>Voir les missions</Button>
          </div>
          {dashboard.alerts.length > 0 ? (
            <div className="billing-alert-list">
              {dashboard.alerts.map((alert, index) => (
                <div key={`${alert.title}-${alert.row?.id || index}`}>
                  <Badge tone={alert.tone}>{alert.title}</Badge>
                  <strong>{alert.row?.mission || 'Budget annuel'}</strong>
                  <span>{alert.row ? `${alert.row.remplacant} · ${statusCopy(alert.row)}` : `Consommation budget: ${dashboard.budgetProgress}%`}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Aucune alerte prioritaire" description="Toutes les factures et règlements sont à jour." />
          )}
        </Card>

        <Card className="dashboard-panel">
          <div className="toolbar">
            <div>
              <h2>Factures à classer</h2>
              <p className="small">Factures disponibles non encore marquées comme classées.</p>
            </div>
            <Button type="button" variant="light" onClick={openDocuments}>Coffre</Button>
          </div>
          <div className="dashboard-mini-list">
            {dashboard.unclassifiedRows.slice(0, 5).map((row) => (
              <div key={row.id}>
                <span>{row.mission}</span>
                <Badge tone="success">À classer</Badge>
              </div>
            ))}
            {dashboard.unclassifiedRows.length === 0 ? (
              <div>
                <span>Aucune facture en attente</span>
                <Badge>À jour</Badge>
              </div>
            ) : null}
          </div>
        </Card>
      </div>
    </>
  );
}

function MissionsTab({
  rows,
  busyId,
  onDownload,
  onClassify,
}: {
  rows: AccountingRow[];
  busyId: string | null;
  onDownload: (conversationId: string) => Promise<void>;
  onClassify: (id: string) => void;
}) {
  const missionRows = rows.filter((row) => row.source === 'MEDILINK');

  if (missionRows.length === 0) {
    return <EmptyState title="Aucune mission comptable" description="Les accords MediLink apparaîtront ici dès qu'un recrutement sera validé." action={<LinkButton href="/establishment/messages">Ouvrir la messagerie</LinkButton>} />;
  }

  return (
    <div className="billing-missions-workspace">
      <div className="billing-mission-list">
        {missionRows.map((row) => (
          <section
            key={row.id}
            className="card billing-mission-card"
          >
            <div className="billing-mission-head">
              <div>
                <Badge tone={agreementTone(row.agreement?.status)}>{agreementLabelRecruiter(row.agreement?.status)}</Badge>
                <h2>{row.mission}</h2>
                <p>{row.remplacant} · {formatDate(row.date)}</p>
              </div>
              <div className="billing-mission-amount">
                <span>Montant facturé</span>
                <strong>{row.amount > 0 ? formatMoney(row.amount, row.currency) : 'À régulariser'}</strong>
              </div>
            </div>

            <div className="billing-timeline">
              {timelineSteps(row).map((step) => (
                <div key={step.key} className={`${step.done ? 'done' : ''} ${step.active ? 'active' : ''}`}>
                  <span aria-hidden="true" />
                  <strong>{step.label}</strong>
                </div>
              ))}
            </div>

            <div className="billing-mission-meta">
              <div><span>Prochaine action</span><strong>{statusCopy(row)}</strong></div>
              <div><span>Facture</span><strong>{row.hasReceipt ? 'Disponible' : 'Non disponible'}</strong></div>
              <div><span>Classement</span><strong>{row.classified ? 'Classé' : 'À classer'}</strong></div>
            </div>

            <div className="actions" onClick={(event) => event.stopPropagation()}>
              <LinkButton href={`/establishment/billing/${encodeURIComponent(row.id)}`} variant="secondary">Voir le détail</LinkButton>
              {row.conversationId && row.hasReceipt ? (
                <Button variant="light" disabled={busyId === row.conversationId} onClick={() => void onDownload(row.conversationId!)}>
                  {busyId === row.conversationId ? 'Téléchargement...' : 'Facture PDF'}
                </Button>
              ) : (
                <LinkButton href={getEstablishmentConversationPath(row.conversationId)} variant="light">Suivre</LinkButton>
              )}
              {row.hasReceipt ? (
                <Button type="button" variant={row.classified ? 'secondary' : 'light'} onClick={() => onClassify(row.id)}>
                  {row.classified ? 'Classé' : 'Marquer classée'}
                </Button>
              ) : null}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function ExpensesTab({
  rows,
  statusFilter,
  setStatusFilter,
  busyId,
  onDownload,
  onRemoveManual,
  onAddManual,
  onExportFiltered,
}: {
  rows: AccountingRow[];
  statusFilter: 'ALL' | 'AVAILABLE' | 'PENDING' | 'COMPLETED' | 'MANUAL' | 'PROPOSED';
  setStatusFilter: (value: 'ALL' | 'AVAILABLE' | 'PENDING' | 'COMPLETED' | 'MANUAL' | 'PROPOSED') => void;
  busyId: string | null;
  onDownload: (conversationId: string) => Promise<void>;
  onRemoveManual: (id: string) => void;
  onAddManual: (event: React.FormEvent<HTMLFormElement>) => void;
  onExportFiltered: () => void;
}) {
  return (
    <div className="billing-workspace">
      <Card className="dashboard-panel billing-register-card">
        <div className="toolbar">
          <div>
            <h2>Registre des dépenses</h2>
            <p className="small">Base exportable avec les factures MediLink et les dépenses hors plateforme.</p>
          </div>
          <div className="billing-filters">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filtre statut">
              <option value="ALL">Toutes</option>
              <option value="AVAILABLE">Réglées</option>
              <option value="COMPLETED">À valider</option>
              <option value="PENDING">À régler / En cours</option>
              <option value="PROPOSED">Propositions</option>
              <option value="MANUAL">Hors MediLink</option>
            </Select>
            <Button type="button" variant="light" onClick={onExportFiltered}>Exporter la vue</Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Aucune dépense sur cette vue"
            description="Ajoutez une dépense hors MediLink ou attendez qu'une mission facturée apparaisse ici."
            action={<LinkButton href="/establishment/messages">Voir les échanges</LinkButton>}
          />
        ) : (
          <ExpenseTable rows={rows} busyId={busyId} onDownload={onDownload} onRemoveManual={onRemoveManual} />
        )}
      </Card>

      <div className="billing-side">
        <ManualExpenseCard onAddManual={onAddManual} />
      </div>
    </div>
  );
}

function ExpenseTable({
  rows,
  busyId,
  onDownload,
  onRemoveManual,
}: {
  rows: AccountingRow[];
  busyId: string | null;
  onDownload: (conversationId: string) => Promise<void>;
  onRemoveManual: (id: string) => void;
}) {
  return (
    <div className="table-wrap billing-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Remplaçant</th>
            <th>Mission</th>
            <th>Montant</th>
            <th>Statut</th>
            <th>Facture</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.status === 'PENDING' || row.status === 'PROPOSED' ? 'billing-row-pending' : undefined}>
              <td>{formatDate(row.date)}</td>
              <td>
                <strong>{row.remplacant}</strong>
                <div className="small">{row.source === 'MEDILINK' ? 'MediLink' : row.paymentMethod}</div>
              </td>
              <td>
                <strong>{row.mission}</strong>
                <div className="small">{row.notes || statusCopy(row)}</div>
              </td>
              <td>
                {row.amount > 0 ? formatMoney(row.amount, row.currency) : <span className="muted">À compléter</span>}
              </td>
              <td>
                {row.source === 'MEDILINK'
                  ? <Badge tone={agreementTone(row.agreement?.status)}>{agreementLabelRecruiter(row.agreement?.status)}</Badge>
                  : <Badge tone={row.hasReceipt ? 'neutral' : 'warning'}>Hors MediLink</Badge>}
              </td>
              <td className="actions">
                {row.conversationId && row.hasReceipt ? (
                  <Button variant="light" disabled={busyId === row.conversationId} onClick={() => void onDownload(row.conversationId!)}>
                    {busyId === row.conversationId ? 'Téléchargement...' : 'PDF'}
                  </Button>
                ) : row.source === 'MANUAL' ? (
                  <Button type="button" variant="light" onClick={() => onRemoveManual(row.id)}>Retirer</Button>
                ) : (
                  <LinkButton href={getEstablishmentConversationPath(row.conversationId)} variant="light">Suivre</LinkButton>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManualExpenseCard({ onAddManual }: { onAddManual: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <Card className="dashboard-panel billing-manual-card">
      <div className="toolbar compact">
        <div>
          <h2>Ajouter hors MediLink</h2>
          <p className="small">Vacation, remplacement ou garde géré en dehors de la plateforme.</p>
        </div>
      </div>
      <form className="form" onSubmit={onAddManual}>
        <Field label="Date d'encaissement/facturation"><Input name="date" type="date" required /></Field>
        <Field label="Nom du remplaçant"><Input name="remplacant" placeholder="Dr. Dupont" required /></Field>
        <Field label="Mission"><Input name="mission" placeholder="Vacation Pédiatrie" required /></Field>
        <div className="form-row">
          <Field label="Montant total"><Input name="amount" type="number" min="1" step="1" placeholder="950" required /></Field>
          <Field label="Paiement">
            <Select name="paymentMethod" defaultValue="Virement">
              <option>Virement</option>
              <option>Chèque</option>
              <option>Espèces</option>
              <option>Autre</option>
            </Select>
          </Field>
        </div>
        <Field label="Note"><Input name="notes" placeholder="Facture directe, virement fait le..." /></Field>
        <label className="billing-checkbox">
          <input name="hasReceipt" type="checkbox" />
          <span>Justificatif/facture déjà disponible</span>
        </label>
        <Button type="submit" variant="secondary" block>Ajouter au registre</Button>
      </form>
    </Card>
  );
}

function DocumentsTab({
  rows,
  busyId,
  onDownload,
  onClassify,
}: {
  rows: AccountingRow[];
  busyId: string | null;
  onDownload: (conversationId: string) => Promise<void>;
  onClassify: (id: string) => void;
}) {
  const documentRows = rows.filter((row) => row.hasReceipt || row.source === 'MANUAL');
  return (
    <Card className="dashboard-panel">
      <div className="toolbar">
        <div>
          <h2>Factures et pièces</h2>
          <p className="small">Coffre des factures MediLink et des pièces justificatives hors plateforme.</p>
        </div>
      </div>
      {documentRows.length === 0 ? (
        <EmptyState title="Aucune facture connue" description="Les PDF de facture d'établissement et documents manuels apparaîtront ici." />
      ) : (
        <div className="billing-doc-grid">
          {documentRows.map((row) => (
            <div key={row.id} className="billing-doc-card">
              <div>
                <Badge tone={row.hasReceipt ? 'success' : 'warning'}>{row.hasReceipt ? 'Disponible' : 'Manquant'}</Badge>
                <h3>{row.mission}</h3>
                <p>{row.remplacant} · {formatDate(row.date)}</p>
              </div>
              <div className="billing-doc-meta">
                <span>{row.source === 'MEDILINK' ? 'Facture MediLink' : 'Pièce hors MediLink'}</span>
                <strong>{row.amount > 0 ? formatMoney(row.amount, row.currency) : 'Montant à régulariser'}</strong>
              </div>
              <div className="actions">
                {row.conversationId && row.hasReceipt ? (
                  <Button variant="light" disabled={busyId === row.conversationId} onClick={() => void onDownload(row.conversationId!)}>
                    {busyId === row.conversationId ? 'Téléchargement...' : 'Télécharger'}
                  </Button>
                ) : null}
                {row.hasReceipt ? (
                  <Button type="button" variant={row.classified ? 'secondary' : 'light'} onClick={() => onClassify(row.id)}>
                    {row.classified ? 'Classé' : 'Marquer classée'}
                  </Button>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function BudgetTab({
  dashboard,
  selectedYear,
  budgetLimit,
  setBudgetLimit,
}: {
  dashboard: DashboardData;
  selectedYear: number;
  budgetLimit: number;
  setBudgetLimit: (value: number) => void;
}) {
  return (
    <div className="billing-tax-grid">
      <Card className="dashboard-panel billing-tax-card">
        <div>
          <span>Suivi budget {selectedYear}</span>
          <h2>{formatMoney(dashboard.totalExpenses)}</h2>
          <p>Dépenses engagées validées ou en attente pour l'exercice en cours.</p>
        </div>
        <div className="billing-threshold">
          <div className="toolbar compact">
            <div>
              <h3>Limite budgétaire</h3>
              <p className="small">{formatMoney(dashboard.remainingBudget)} restant avant seuil de {formatMoney(budgetLimit)}</p>
            </div>
            <Badge tone={dashboard.budgetProgress >= 85 ? 'warning' : 'success'}>{dashboard.budgetProgress}%</Badge>
          </div>
          <div className="billing-progress"><span style={{ width: `${dashboard.budgetProgress}%` }} /></div>
        </div>
      </Card>

      <Card className="dashboard-panel">
        <div className="toolbar compact">
          <div>
            <h2>Ajuster le budget cible</h2>
            <p className="small">Définissez une limite budgétaire interne pour vos alertes de consommation.</p>
          </div>
          <strong>{formatMoney(budgetLimit)}</strong>
        </div>
        <input
          className="billing-slider"
          type="range"
          min="50000"
          max="500000"
          step="10000"
          value={budgetLimit}
          onChange={(event) => setBudgetLimit(Number(event.target.value))}
          aria-label="Budget cible annuel"
        />
        <div className="billing-provision-grid">
          <div><span>Frais de service (HT)</span><strong>{formatMoney(dashboard.platformFees)}</strong></div>
          <div><span>Part Remplaçants</span><strong>{formatMoney(dashboard.netRemuneration)}</strong></div>
        </div>
      </Card>

      <ChecklistCard />
    </div>
  );
}

function ExportsTab({
  dashboard,
  selectedYear,
  yearRows,
  onExportYear,
  onExportFiltered,
}: {
  dashboard: DashboardData;
  selectedYear: number;
  yearRows: AccountingRow[];
  onExportYear: () => void;
  onExportFiltered: () => void;
}) {
  const ready = yearRows.filter((row) => row.amount > 0);
  return (
    <div className="billing-export-grid">
      <Card className="dashboard-panel billing-export-card">
        <div>
          <Badge tone="success">CSV</Badge>
          <h2>Export annuel {selectedYear}</h2>
          <p>Inclut toutes les dépenses MediLink et hors plateforme validées pour cet exercice.</p>
        </div>
        <div className="billing-export-stats">
          <div><span>Lignes</span><strong>{yearRows.length}</strong></div>
          <div><span>Avec montant</span><strong>{ready.length}</strong></div>
          <div><span>Total</span><strong>{formatMoney(dashboard.totalExpenses)}</strong></div>
        </div>
        <Button type="button" onClick={onExportYear}>Télécharger CSV annuel</Button>
      </Card>

      <Card className="dashboard-panel billing-export-card">
        <div>
          <Badge>Vue active</Badge>
          <h2>Export filtré</h2>
          <p>Permet de sortir la vue courante (avec vos filtres de statuts appliqués) pour comptabilité.</p>
        </div>
        <Button type="button" variant="light" onClick={onExportFiltered}>Télécharger la vue filtrée</Button>
      </Card>

      <Card className="dashboard-panel billing-export-card is-disabled">
        <div>
          <Badge tone="warning">À venir</Badge>
          <h2>Pack d’archives de factures</h2>
          <p>Téléchargement groupé de l'ensemble des factures établissement PDF de l'exercice.</p>
        </div>
        <Button type="button" variant="light" disabled>Indisponible</Button>
      </Card>
    </div>
  );
}

function ChecklistCard() {
  return (
    <Card className="dashboard-panel billing-checklist-card">
      <h2>Échéances et obligations de l'établissement</h2>
      <div className="billing-checklist">
        <div><Badge tone="warning">Déclaratif</Badge><strong>Déclarations DSN / URSSAF</strong><span>Déclarer les vacations et remplacements de candidats selon la réglementation en vigueur.</span></div>
        <div><Badge tone="neutral">Légal</Badge><strong>Contrats & Justificatifs</strong><span>Vérifier la conformité des pièces d'identité et des RPPS des remplaçants.</span></div>
        <div><Badge tone="neutral">Comptabilité</Badge><strong>Factures tiers</strong><span>Intégrer les factures établissement dans votre livre journal d'achats comptables.</span></div>
        <div><Badge tone="success">Continu</Badge><strong>Règlements sécurisés</strong><span>MediLink garantit le blocage des fonds en séquestre jusqu'à validation de fin.</span></div>
      </div>
    </Card>
  );
}
