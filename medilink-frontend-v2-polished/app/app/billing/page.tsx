'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, getApiUrl, getAuthToken } from '@/lib/api';
import { agreementLabel, agreementNextStep, agreementTone, latestAgreement } from '@/lib/candidate-workspace';
import { formatDate, formatMoney } from '@/lib/format';
import { getCandidateConversationPath } from '@/lib/mission-links';
import type { Conversation, MissionAgreement } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LinkButton, LoadingCard, PageHeader, Select } from '@/components/ui';
import { MonthlyBarChart } from '@/components/MonthlyBarChart';

type ManualRevenue = {
  id: string;
  date: string;
  client: string;
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
  client: string;
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
  revenue: number;
  provision: number;
  netAvailable: number;
  thresholdProgress: number;
  remainingBeforeThreshold: number;
  collectedRows: AccountingRow[];
  medilinkReleasedRows: AccountingRow[];
  pendingRows: AccountingRow[];
  completedRows: AccountingRow[];
  missingAmountRows: AccountingRow[];
  missingReceiptRows: AccountingRow[];
  unclassifiedRows: AccountingRow[];
  alerts: Array<{ tone: 'neutral' | 'success' | 'warning' | 'danger'; title: string; row: AccountingRow | null }>;
};

type BillingTab = 'overview' | 'revenues' | 'documents' | 'tax' | 'exports';

const STORAGE_KEY = 'medilink_candidate_billing_v2';
const DEFAULT_PROVISION_RATE = 45;
const MICRO_BNC_THRESHOLD = 77700;

const tabs: Array<{ id: BillingTab; label: string }> = [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'revenues', label: 'Recettes' },
  { id: 'documents', label: 'Justificatifs' },
  { id: 'tax', label: 'Fiscalité' },
  { id: 'exports', label: 'Exports' },
];

function safeNumber(value: FormDataEntryValue | null) {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function amountFromAgreement(agreement?: MissionAgreement | null) {
  if (!agreement) return 0;
  return agreement.candidateAmount || agreement.amount || 0;
}

function getCurrentYear() {
  return new Date().getFullYear();
}

function readStoredState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) || window.localStorage.getItem('medilink_candidate_billing_v1');
    if (!stored) {
      return {
        manualRows: [] as ManualRevenue[],
        provisionRate: DEFAULT_PROVISION_RATE,
        classifiedIds: [] as string[],
      };
    }
    const parsed = JSON.parse(stored);
    return {
      manualRows: Array.isArray(parsed.manualRows) ? parsed.manualRows as ManualRevenue[] : [],
      provisionRate: typeof parsed.provisionRate === 'number' ? parsed.provisionRate : DEFAULT_PROVISION_RATE,
      classifiedIds: Array.isArray(parsed.classifiedIds) ? parsed.classifiedIds as string[] : [],
    };
  } catch {
    return {
      manualRows: [] as ManualRevenue[],
      provisionRate: DEFAULT_PROVISION_RATE,
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

function statusCopy(row: AccountingRow) {
  if (row.source === 'MANUAL') return row.hasReceipt ? 'Hors MediLink classable' : 'Justificatif manquant';
  if (row.agreement?.status === 'PAYMENT_RELEASED') return 'Justificatif disponible';
  return agreementNextStep(row.agreement?.status);
}

function buildCsv(rows: AccountingRow[]) {
  const header = ['Date', 'Source', 'Client', 'Mission', 'Montant', 'Devise', 'Statut', 'Paiement', 'Justificatif', 'Notes'];
  const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((row) => [
    row.date ? new Date(row.date).toISOString().slice(0, 10) : '',
    row.source,
    row.client,
    row.mission,
    row.amount,
    row.currency,
    row.source === 'MEDILINK' ? agreementLabel(row.agreement?.status) : 'Hors MediLink',
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
    { key: 'confirmed', label: 'Confirmée', done: Boolean(status && ['FUNDS_SECURED', 'COMPLETED', 'PAYMENT_RELEASED'].includes(status)), active: status === 'FUNDS_SECURED' },
    { key: 'completed', label: 'Réalisée', done: Boolean(status && ['COMPLETED', 'PAYMENT_RELEASED'].includes(status)), active: status === 'COMPLETED' },
    { key: 'released', label: 'Rétrocession', done: status === 'PAYMENT_RELEASED', active: false },
    { key: 'classified', label: 'Classée', done: row.classified, active: row.hasReceipt && !row.classified },
  ];
}

export default function CandidateBillingPage() {
  const cachedConversations = api.getSync<Conversation[]>('/conversations');
  const [activeTab, setActiveTab] = useState<BillingTab>('overview');
  const [conversations, setConversations] = useState<Conversation[]>(cachedConversations || []);
  const [manualRows, setManualRows] = useState<ManualRevenue[]>([]);
  const [classifiedIds, setClassifiedIds] = useState<string[]>([]);
  const [provisionRate, setProvisionRate] = useState(DEFAULT_PROVISION_RATE);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'PENDING' | 'COMPLETED' | 'MANUAL' | 'PROPOSED'>('ALL');
  const [loading, setLoading] = useState(!cachedConversations);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadConversations(options: { reload?: boolean } = {}) {
    setConversations(options.reload
      ? await api.reload<Conversation[]>('/conversations')
      : await api.get<Conversation[]>('/conversations'));
  }

  useEffect(() => {
    const stored = readStoredState();
    setManualRows(stored.manualRows);
    setProvisionRate(stored.provisionRate);
    setClassifiedIds(stored.classifiedIds);

    loadConversations()
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useAutoRefresh(() => loadConversations({ reload: true }), { enabled: !loading });

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ manualRows, provisionRate, classifiedIds }));
  }, [manualRows, provisionRate, classifiedIds]);

  const accountingRows = useMemo<AccountingRow[]>(() => {
    const medilinkRowMap = new Map<string, AccountingRow>();

    conversations
      .map((conversation) => ({ conversation, agreement: latestAgreement(conversation) }))
      .filter((row) => row.agreement)
      .forEach(({ conversation, agreement }) => {
        const released = agreement?.status === 'PAYMENT_RELEASED';
        const rowId = `medilink-${agreement?.id || conversation.applicationId || conversation.id}`;
        const amount = amountFromAgreement(agreement);
        const row = {
          id: rowId,
          source: 'MEDILINK' as const,
          date: agreement?.payment?.releasedAt || agreement?.completedAt || agreement?.startDate || conversation.mission?.startDate,
          client: conversation.establishment?.name || conversation.mission?.city || 'Établissement',
          mission: conversation.mission?.title || 'Mission MediLink',
          amount: released ? amount : 0,
          currency: agreement?.currency || 'EUR',
          status: rowStatusFromAgreement(agreement),
          paymentMethod: released ? 'Virement MediLink' : 'À confirmer',
          conversationId: conversation.id,
          agreement,
          hasReceipt: released || Boolean(agreement?.invoices?.some((invoice) => invoice.type === 'CANDIDATE_RECEIPT')),
          classified: classifiedIds.includes(rowId),
        };

        const existing = medilinkRowMap.get(rowId);
        if (!existing || new Date(row.date || 0).getTime() >= new Date(existing.date || 0).getTime()) {
          medilinkRowMap.set(rowId, row);
        }
      });

    const medilinkRows = [...medilinkRowMap.values()];

    const manualAccountingRows = manualRows.map((row) => ({
      id: row.id,
      source: 'MANUAL' as const,
      date: row.date,
      client: row.client,
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
    const collectedRows = yearRows.filter((row) => row.amount > 0 && row.status !== 'PENDING' && row.status !== 'COMPLETED' && row.status !== 'PROPOSED');
    const medilinkReleasedRows = yearRows.filter((row) => row.source === 'MEDILINK' && row.status === 'AVAILABLE');
    const pendingRows = yearRows.filter((row) => row.status === 'PENDING' || row.status === 'PROPOSED');
    const completedRows = yearRows.filter((row) => row.status === 'COMPLETED');
    const missingAmountRows = yearRows.filter((row) => row.source === 'MEDILINK' && row.agreement?.status === 'PAYMENT_RELEASED' && row.amount <= 0);
    const missingReceiptRows = yearRows.filter((row) => !row.hasReceipt);
    const unclassifiedRows = yearRows.filter((row) => row.hasReceipt && !row.classified);
    const revenue = collectedRows.reduce((sum, row) => sum + row.amount, 0);
    const provision = Math.round(revenue * (provisionRate / 100));
    const netAvailable = revenue - provision;
    const thresholdProgress = Math.min(100, Math.round((revenue / MICRO_BNC_THRESHOLD) * 100));
    const alerts = [
      ...completedRows.map((row) => ({ tone: 'warning' as const, title: 'Mission terminée, rétrocession à valider', row })),
      ...missingAmountRows.map((row) => ({ tone: 'warning' as const, title: 'Montant à renseigner', row })),
      ...unclassifiedRows.slice(0, 4).map((row) => ({ tone: 'success' as const, title: 'Justificatif disponible', row })),
      ...missingReceiptRows.filter((row) => row.source === 'MANUAL').map((row) => ({ tone: 'warning' as const, title: 'Recette hors MediLink sans justificatif', row })),
      ...(thresholdProgress >= 85 ? [{ tone: 'warning' as const, title: 'Seuil micro-BNC proche', row: null }] : []),
    ].slice(0, 8);

    return {
      revenue,
      provision,
      netAvailable,
      thresholdProgress,
      remainingBeforeThreshold: Math.max(0, MICRO_BNC_THRESHOLD - revenue),
      collectedRows,
      medilinkReleasedRows,
      pendingRows,
      completedRows,
      missingAmountRows,
      missingReceiptRows,
      unclassifiedRows,
      alerts,
    };
  }, [provisionRate, yearRows]);

  async function downloadCandidateInvoice(conversationId: string) {
    setBusyId(conversationId);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`/conversations/${conversationId}/invoices/candidate.pdf`), {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Téléchargement du justificatif impossible.');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename="([^"]+)"/);
      link.href = url;
      link.download = match?.[1] || 'justificatif-candidat.pdf';
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  function addManualRevenue(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = safeNumber(form.get('amount'));
    const date = String(form.get('date') || '');
    const client = String(form.get('client') || '').trim();
    const mission = String(form.get('mission') || '').trim();
    if (!date || !client || !mission || amount <= 0) {
      setError('Renseignez au minimum une date, un établissement, une mission et un montant positif.');
      return;
    }

    setError(null);
    setManualRows((rows) => [{
      id: `manual-${Date.now()}`,
      date,
      client,
      mission,
      amount,
      paymentMethod: String(form.get('paymentMethod') || 'Virement'),
      notes: String(form.get('notes') || '').trim(),
      hasReceipt: form.get('hasReceipt') === 'on',
    }, ...rows]);
    event.currentTarget.reset();
  }

  function removeManualRevenue(id: string) {
    setManualRows((rows) => rows.filter((row) => row.id !== id));
    setClassifiedIds((ids) => ids.filter((item) => item !== id));
  }

  function toggleClassified(id: string) {
    setClassifiedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  function exportCsv(scope: 'year' | 'filtered') {
    const rows = scope === 'year' ? yearRows : filteredRows;
    downloadTextFile(`medilink-compta-${selectedYear}${scope === 'filtered' ? '-filtre' : ''}.csv`, buildCsv(rows));
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader
        title="Ma compta"
        description="Cockpit de revenus, suivi des rétrocessions, justificatifs et exports pour vos missions."
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
          selectedYear={selectedYear}
          openDocuments={() => setActiveTab('documents')}
        />
      ) : null}

      {activeTab === 'revenues' ? (
        <RevenuesTab
          rows={filteredRows}
          statusFilter={statusFilter}
          setStatusFilter={setStatusFilter}
          busyId={busyId}
          onDownload={downloadCandidateInvoice}
          onRemoveManual={removeManualRevenue}
          onAddManual={addManualRevenue}
          onExportFiltered={() => exportCsv('filtered')}
        />
      ) : null}

      {activeTab === 'documents' ? (
        <DocumentsTab rows={yearRows} busyId={busyId} onDownload={downloadCandidateInvoice} onClassify={toggleClassified} />
      ) : null}

      {activeTab === 'tax' ? (
        <TaxTab dashboard={dashboard} selectedYear={selectedYear} provisionRate={provisionRate} setProvisionRate={setProvisionRate} />
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

function OverviewTab({
  dashboard,
  selectedYear,
  openDocuments,
}: {
  dashboard: DashboardData;
  selectedYear: number;
  openDocuments: () => void;
}) {
  return (
    <>
      <Card className="billing-hero-card billing-hero-chart">
        <div className="billing-hero-top">
          <div className="billing-hero-copy">
            <span>Exercice {selectedYear}</span>
            <h2>{formatMoney(dashboard.revenue)}</h2>
            <p>Recettes encaissées connues dans MediLink et ajoutées manuellement.</p>
          </div>
          <div className="billing-overview-kpis">
            <div>
              <span>Encaissées</span>
              <strong>{dashboard.collectedRows.length}</strong>
              <small>{formatMoney(dashboard.revenue)} sur l'exercice</small>
            </div>
            <div>
              <span>En attente</span>
              <strong>{dashboard.pendingRows.length}</strong>
              <small>Propositions ou missions non finalisées</small>
            </div>
            <div>
              <span>À régulariser</span>
              <strong>{dashboard.completedRows.length}</strong>
              <small>Fin de mission avant rétrocession</small>
            </div>
          </div>
        </div>
        <div className="billing-hero-chart-section">
          <MonthlyBarChart rows={dashboard.collectedRows} year={selectedYear} label="Recettes" barColor="var(--blue-lt)" lineColor="var(--blue)" />
        </div>
      </Card>

      <div className="billing-overview-grid">
        <Card className="dashboard-panel">
          <div className="toolbar">
            <div>
              <h2>Alertes d’action</h2>
              <p className="small">Les sujets comptables à traiter en priorité.</p>
            </div>
          </div>
          {dashboard.alerts.length > 0 ? (
            <div className="billing-alert-list">
              {dashboard.alerts.map((alert, index) => (
                <div key={`${alert.title}-${alert.row?.id || index}`}>
                  <Badge tone={alert.tone}>{alert.title}</Badge>
                  <strong>{alert.row?.mission || 'Exercice fiscal'}</strong>
                  <span>{alert.row ? `${alert.row.client} · ${statusCopy(alert.row)}` : `Progression seuil: ${dashboard.thresholdProgress}%`}</span>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Aucune alerte prioritaire" description="Les missions et justificatifs connus sont à jour pour cette période." />
          )}
        </Card>

        <Card className="dashboard-panel">
          <div className="toolbar">
            <div>
              <h2>Documents à classer</h2>
              <p className="small">Justificatifs disponibles mais pas encore marqués comme classés.</p>
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
                <span>Aucun justificatif en attente</span>
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
    return <EmptyState title="Aucune mission comptable" description="Les accords MediLink apparaîtront ici dès qu'une proposition sera créée." action={<LinkButton href="/app/messages">Ouvrir la messagerie</LinkButton>} />;
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
                <Badge tone={agreementTone(row.agreement?.status)}>{agreementLabel(row.agreement?.status)}</Badge>
                <h2>{row.mission}</h2>
                <p>{row.client} · {formatDate(row.date)}</p>
              </div>
              <div className="billing-mission-amount">
                <span>Rétrocession</span>
                <strong>{row.amount > 0 ? formatMoney(row.amount, row.currency) : row.agreement?.retrocessionPercentage ? `${row.agreement.retrocessionPercentage}%` : 'À renseigner'}</strong>
              </div>
            </div>

            <div className="billing-timeline">
              {timelineSteps(row).map((step, index) => (
                <div key={step.key} className={`${step.done ? 'done' : ''} ${step.active ? 'active' : ''}`}>
                  <span aria-hidden="true">{index + 1}</span>
                  <strong>{step.label}</strong>
                </div>
              ))}
            </div>

            <div className="billing-mission-meta">
              <div><span>Prochaine action</span><strong>{statusCopy(row)}</strong></div>
              <div><span>Justificatif</span><strong>{row.hasReceipt ? 'Disponible' : 'Non disponible'}</strong></div>
              <div><span>Classement</span><strong>{row.classified ? 'Classé' : 'À classer'}</strong></div>
            </div>

            <div className="actions" onClick={(event) => event.stopPropagation()}>
              <LinkButton href={`/app/billing/${encodeURIComponent(row.id)}`} variant="secondary">Voir le détail</LinkButton>
              {row.conversationId && row.hasReceipt ? (
                <Button variant="light" disabled={busyId === row.conversationId} onClick={() => void onDownload(row.conversationId!)}>
                  {busyId === row.conversationId ? 'Téléchargement...' : 'Justificatif PDF'}
                </Button>
              ) : (
                <LinkButton href={getCandidateConversationPath(row.conversationId)} variant="light">Suivre</LinkButton>
              )}
              {row.hasReceipt ? (
                <Button type="button" variant={row.classified ? 'secondary' : 'light'} onClick={() => onClassify(row.id)}>
                  {row.classified ? 'Classé' : 'Marquer classé'}
                </Button>
              ) : null}
            </div>
          </section>
        ))}
      </div>

    </div>
  );
}

function RevenuesTab({
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
            <h2>Livre de recettes</h2>
            <p className="small">Base exportable avec les missions MediLink et les recettes hors plateforme.</p>
          </div>
          <div className="billing-filters">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filtre statut">
              <option value="ALL">Toutes</option>
              <option value="AVAILABLE">Encaissées</option>
              <option value="COMPLETED">À valider</option>
              <option value="PENDING">En attente</option>
              <option value="PROPOSED">Propositions</option>
              <option value="MANUAL">Hors MediLink</option>
            </Select>
            <Button type="button" variant="light" onClick={onExportFiltered}>Exporter la vue</Button>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Aucune recette sur cette vue"
            description="Ajoutez une ligne hors MediLink ou attendez qu'une mission validée apparaisse ici."
            action={<LinkButton href="/app/messages">Voir les échanges</LinkButton>}
          />
        ) : (
          <RevenueTable rows={rows} busyId={busyId} onDownload={onDownload} onRemoveManual={onRemoveManual} />
        )}
      </Card>

      <div className="billing-side">
        <ManualRevenueCard onAddManual={onAddManual} />
      </div>
    </div>
  );
}

function RevenueTable({
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
            <th>Client</th>
            <th>Mission</th>
            <th>Montant</th>
            <th>Statut</th>
            <th>Justificatif</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className={row.status === 'PENDING' || row.status === 'PROPOSED' ? 'billing-row-pending' : undefined}>
              <td>{formatDate(row.date)}</td>
              <td>
                <strong>{row.client}</strong>
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
                  ? <Badge tone={agreementTone(row.agreement?.status)}>{agreementLabel(row.agreement?.status)}</Badge>
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
                  <LinkButton href={getCandidateConversationPath(row.conversationId)} variant="light">Suivre</LinkButton>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ManualRevenueCard({ onAddManual }: { onAddManual: (event: React.FormEvent<HTMLFormElement>) => void }) {
  return (
    <Card className="dashboard-panel billing-manual-card">
      <div className="toolbar compact">
        <div>
          <h2>Ajouter hors MediLink</h2>
          <p className="small">Remplacement, garde ou vacation payée en dehors de la plateforme.</p>
        </div>
      </div>
      <form className="form" onSubmit={onAddManual}>
        <Field label="Date d'encaissement"><Input name="date" type="date" required /></Field>
        <Field label="Établissement"><Input name="client" placeholder="Cabinet Martin" required /></Field>
        <Field label="Mission"><Input name="mission" placeholder="Remplacement MG" required /></Field>
        <div className="form-row">
          <Field label="Montant"><Input name="amount" type="number" min="1" step="1" placeholder="1200" required /></Field>
          <Field label="Paiement">
            <Select name="paymentMethod" defaultValue="Virement">
              <option>Virement</option>
              <option>Chèque</option>
              <option>Espèces</option>
              <option>Autre</option>
            </Select>
          </Field>
        </div>
        <Field label="Note"><Input name="notes" placeholder="Rétrocession 70%, facture reçue..." /></Field>
        <label className="billing-checkbox">
          <input name="hasReceipt" type="checkbox" />
          <span>Justificatif déjà disponible</span>
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
          <h2>Documents comptables</h2>
          <p className="small">Coffre des justificatifs MediLink et des pièces hors plateforme.</p>
        </div>
      </div>
      {documentRows.length === 0 ? (
        <EmptyState title="Aucun justificatif connu" description="Les PDF de mission et justificatifs manuels apparaîtront ici." />
      ) : (
        <div className="billing-doc-grid">
          {documentRows.map((row) => (
            <div key={row.id} className="billing-doc-card">
              <div>
                <Badge tone={row.hasReceipt ? 'success' : 'warning'}>{row.hasReceipt ? 'Disponible' : 'Manquant'}</Badge>
                <h3>{row.mission}</h3>
                <p>{row.client} · {formatDate(row.date)}</p>
              </div>
              <div className="billing-doc-meta">
                <span>{row.source === 'MEDILINK' ? 'Justificatif candidat' : 'Pièce hors MediLink'}</span>
                <strong>{row.amount > 0 ? formatMoney(row.amount, row.currency) : 'Montant à compléter'}</strong>
              </div>
              <div className="actions">
                {row.conversationId && row.hasReceipt ? (
                  <Button variant="light" disabled={busyId === row.conversationId} onClick={() => void onDownload(row.conversationId!)}>
                    {busyId === row.conversationId ? 'Téléchargement...' : 'Télécharger'}
                  </Button>
                ) : null}
                {row.hasReceipt ? (
                  <Button type="button" variant={row.classified ? 'secondary' : 'light'} onClick={() => onClassify(row.id)}>
                    {row.classified ? 'Classé' : 'Marquer classé'}
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

function TaxTab({
  dashboard,
  selectedYear,
  provisionRate,
  setProvisionRate,
}: {
  dashboard: DashboardData;
  selectedYear: number;
  provisionRate: number;
  setProvisionRate: (value: number) => void;
}) {
  return (
    <div className="billing-tax-grid">
      <Card className="dashboard-panel billing-tax-card">
        <div>
          <span>Dossier fiscal {selectedYear}</span>
          <h2>{formatMoney(dashboard.revenue)}</h2>
          <p>Recettes encaissées connues pour l'exercice. Les montants à compléter ne sont pas inclus.</p>
        </div>
        <div className="billing-threshold">
          <div className="toolbar compact">
            <div>
              <h3>Seuil micro-BNC</h3>
              <p className="small">{formatMoney(dashboard.remainingBeforeThreshold)} avant {formatMoney(MICRO_BNC_THRESHOLD)}</p>
            </div>
            <Badge tone={dashboard.thresholdProgress >= 85 ? 'warning' : 'success'}>{dashboard.thresholdProgress}%</Badge>
          </div>
          <div className="billing-progress"><span style={{ width: `${dashboard.thresholdProgress}%` }} /></div>
        </div>
      </Card>

      <Card className="dashboard-panel">
        <div className="toolbar compact">
          <div>
            <h2>Provision</h2>
            <p className="small">Repère interne, à ajuster avec votre comptable selon votre situation.</p>
          </div>
          <strong>{provisionRate}%</strong>
        </div>
        <input
          className="billing-slider"
          type="range"
          min="20"
          max="65"
          step="1"
          value={provisionRate}
          onChange={(event) => setProvisionRate(Number(event.target.value))}
          aria-label="Taux de provision"
        />
        <div className="billing-provision-grid">
          <div><span>À garder</span><strong>{formatMoney(dashboard.provision)}</strong></div>
          <div><span>Net prudent</span><strong>{formatMoney(dashboard.netAvailable)}</strong></div>
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
          <p>Inclut les recettes MediLink et hors plateforme connues sur l'exercice.</p>
        </div>
        <div className="billing-export-stats">
          <div><span>Lignes</span><strong>{yearRows.length}</strong></div>
          <div><span>Avec montant</span><strong>{ready.length}</strong></div>
          <div><span>Total</span><strong>{formatMoney(dashboard.revenue)}</strong></div>
        </div>
        <Button type="button" onClick={onExportYear}>Télécharger CSV annuel</Button>
      </Card>

      <Card className="dashboard-panel billing-export-card">
        <div>
          <Badge>Vue active</Badge>
          <h2>Export filtré</h2>
          <p>Permet de sortir une vue de travail pour contrôle ou envoi au comptable.</p>
        </div>
        <Button type="button" variant="light" onClick={onExportFiltered}>Télécharger la vue filtrée</Button>
      </Card>

      <Card className="dashboard-panel billing-export-card is-disabled">
        <div>
          <Badge tone="warning">À venir</Badge>
          <h2>Pack justificatifs PDF</h2>
          <p>Téléchargement groupé des justificatifs MediLink et récapitulatif PDF annuel.</p>
        </div>
        <Button type="button" variant="light" disabled>Prévu</Button>
      </Card>
    </div>
  );
}

function ChecklistCard() {
  return (
    <Card className="dashboard-panel billing-checklist-card">
      <h2>Échéances à surveiller</h2>
      <div className="billing-checklist">
        <div><Badge tone="warning">Mensuel / trimestriel</Badge><strong>Déclaration URSSAF/RSPM</strong><span>Reporter les honoraires encaissés sur la période choisie.</span></div>
        <div><Badge tone="neutral">Annuel</Badge><strong>2042-C-PRO</strong><span>Reporter les recettes BNC de l'exercice fiscal.</span></div>
        <div><Badge tone="neutral">Annuel</Badge><strong>CARMF</strong><span>Vérifier affiliation, dispense possible et appels de cotisations.</span></div>
        <div><Badge tone="success">Continu</Badge><strong>Pièces justificatives</strong><span>Conserver justificatifs MediLink et documents hors plateforme.</span></div>
      </div>
    </Card>
  );
}
