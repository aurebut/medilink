'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api, getApiUrl, getAuthToken } from '@/lib/api';
import {
  AccountingEntry,
  AccountingEntryKind,
  AccountingProfile,
  AccountingWorkspacePayload,
  RetrocessionSettlement,
  accountingYear,
  buildAccountingCsv,
  effectiveAmount,
  settlementStatusLabel,
  settlementStatusTone,
} from '@/lib/accounting';
import { formatDate, formatMoney } from '@/lib/format';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LinkButton, LoadingCard, PageHeader, Select } from '@/components/ui';
import { MonthlyBarChart } from '@/components/MonthlyBarChart';

type AccountingTab = 'overview' | 'transactions' | 'settlements' | 'documents' | 'tax' | 'exports';
type EntryFilter = 'ALL' | AccountingEntryKind;

const tabs: Array<{ id: AccountingTab; label: string }> = [
  { id: 'overview', label: 'Vue d’ensemble' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'settlements', label: 'Rétrocessions' },
  { id: 'documents', label: 'Justificatifs' },
  { id: 'tax', label: 'Fiscalité' },
  { id: 'exports', label: 'Documents' },
];

const DEFAULT_RULES = {
  microBncThresholds: { 2025: 77700, 2026: 83600, 2027: 83600, 2028: 83600 } as Record<string, number>,
  rspmAnnualThreshold: 19000,
  defaultProvisionRate: 45,
};

type ProfileDraft = {
  taxRegime: string;
  socialScheme: string;
  activityMode: string;
  declarationFrequency: string;
  activityStartDate: string;
  exclusiveLocum: boolean;
  hasOtherIndependentActivity: boolean;
};

type AccountingSummary = {
  revenueEntries: AccountingEntry[];
  expenseEntries: AccountingEntry[];
  revenue: number;
  expenses: number;
  result: number;
  provision: number;
  available: number;
  expected: number;
  missingReceipts: AccountingEntry[];
  unclassified: AccountingEntry[];
};

function profileDraft(profile?: AccountingProfile | null): ProfileDraft {
  return {
    taxRegime: profile?.taxRegime || '',
    socialScheme: profile?.socialScheme || '',
    activityMode: profile?.activityMode || '',
    declarationFrequency: profile?.declarationFrequency || '',
    activityStartDate: profile?.activityStartDate?.slice(0, 10) || '',
    exclusiveLocum: profile?.exclusiveLocum ?? true,
    hasOtherIndependentActivity: profile?.hasOtherIndependentActivity ?? false,
  };
}

function safeNumber(value: FormDataEntryValue | null) {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function downloadTextFile(fileName: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

function sourceLabel(source: AccountingEntry['source']) {
  return { MANUAL: 'Manuelle', MEDILINK: 'MediLink', BANK: 'Banque', IMPORT: 'Import' }[source];
}

export function CandidateAccountingWorkspace() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const cached = api.getSync<AccountingWorkspacePayload>('/billing/accounting/candidate');
  const requestedTab = searchParams.get('tab') as AccountingTab | null;
  const requestedYear = Number(searchParams.get('year'));
  const [activeTab, setActiveTab] = useState<AccountingTab>(tabs.some((tab) => tab.id === requestedTab) ? requestedTab! : 'overview');
  const [selectedYear, setSelectedYear] = useState(Number.isInteger(requestedYear) && requestedYear > 2000 ? requestedYear : new Date().getFullYear());
  const [workspace, setWorkspace] = useState<AccountingWorkspacePayload | null>(cached);
  const [profile, setProfile] = useState<ProfileDraft>(() => profileDraft(cached?.profile));
  const [provisionRate, setProvisionRate] = useState(cached?.settings.provisionRate ?? cached?.rules?.defaultProvisionRate ?? DEFAULT_RULES.defaultProvisionRate);
  const [entryFilter, setEntryFilter] = useState<EntryFilter>('ALL');
  const [settlementFilter, setSettlementFilter] = useState<'ALL' | RetrocessionSettlement['status']>('ALL');
  const [manualKind, setManualKind] = useState<AccountingEntryKind>('EXPENSE');
  const [loading, setLoading] = useState(!cached);
  const [settingsReady, setSettingsReady] = useState(Boolean(cached));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyWorkspace = useCallback((next: AccountingWorkspacePayload) => {
    setWorkspace(next);
    setProvisionRate(next.settings.provisionRate ?? next.rules?.defaultProvisionRate ?? DEFAULT_RULES.defaultProvisionRate);
    setProfile(profileDraft(next.profile));
    setSettingsReady(true);
  }, []);

  const loadAccounting = useCallback(async (options: { reload?: boolean } = {}) => {
    const path = '/billing/accounting/candidate';
    const next = options.reload
      ? await api.reload<AccountingWorkspacePayload>(path)
      : await api.get<AccountingWorkspacePayload>(path);
    applyWorkspace(next);
  }, [applyWorkspace]);

  useEffect(() => {
    loadAccounting().catch((e: any) => setError(e.message)).finally(() => setLoading(false));
  }, [loadAccounting]);

  useAutoRefresh(() => loadAccounting({ reload: true }).then(() => undefined), { enabled: !loading && !busyId });

  useEffect(() => {
    if (!settingsReady) return;
    const timeout = window.setTimeout(() => {
      void api.patch<AccountingWorkspacePayload>('/billing/accounting/candidate/settings', { provisionRate })
        .then(applyWorkspace)
        .catch((e: any) => setError(e.message));
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [applyWorkspace, provisionRate, settingsReady]);

  const entries = useMemo(() => workspace?.entries || [], [workspace?.entries]);
  const settlements = useMemo(() => workspace?.settlements || [], [workspace?.settlements]);
  const categories = useMemo(() => workspace?.categories || [], [workspace?.categories]);
  const rules = workspace?.rules || DEFAULT_RULES;
  const availableYears = useMemo(() => {
    const years = new Set([new Date().getFullYear(), selectedYear]);
    entries.forEach((entry) => years.add(accountingYear(entry.date)));
    settlements.forEach((settlement) => years.add(accountingYear(settlement.paidAt || settlement.startDate)));
    return [...years].sort((a, b) => b - a);
  }, [entries, selectedYear, settlements]);
  const yearEntries = useMemo(() => entries.filter((entry) => accountingYear(entry.date) === selectedYear), [entries, selectedYear]);
  const yearSettlements = useMemo(() => settlements.filter((settlement) => accountingYear(settlement.paidAt || settlement.startDate) === selectedYear), [selectedYear, settlements]);
  const filteredEntries = useMemo(() => yearEntries.filter((entry) => entryFilter === 'ALL' || entry.kind === entryFilter), [entryFilter, yearEntries]);
  const filteredSettlements = useMemo(() => yearSettlements.filter((settlement) => settlementFilter === 'ALL' || settlement.status === settlementFilter), [settlementFilter, yearSettlements]);
  const summary = useMemo(() => {
    const revenueEntries = yearEntries.filter((entry) => entry.kind === 'REVENUE');
    const expenseEntries = yearEntries.filter((entry) => entry.kind === 'EXPENSE');
    const revenue = revenueEntries.reduce((sum, entry) => sum + effectiveAmount(entry), 0);
    const expenses = expenseEntries.reduce((sum, entry) => sum + effectiveAmount(entry), 0);
    const result = revenue - expenses;
    const provision = Math.max(0, Math.round(result * provisionRate / 100));
    const available = result - provision;
    const expected = yearSettlements
      .filter((settlement) => settlement.status !== 'PAID')
      .reduce((sum, settlement) => sum + settlement.amount, 0);
    const missingReceipts = yearEntries.filter((entry) => !entry.hasReceipt);
    const unclassified = yearEntries.filter((entry) => entry.hasReceipt && !(workspace?.classifiedIds || []).includes(entry.id));
    return { revenueEntries, expenseEntries, revenue, expenses, result, provision, available, expected, missingReceipts, unclassified };
  }, [provisionRate, workspace?.classifiedIds, yearEntries, yearSettlements]);

  function navigate(tab: AccountingTab, year = selectedYear) {
    setActiveTab(tab);
    setSelectedYear(year);
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    params.set('year', String(year));
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = safeNumber(form.get('amount'));
    const professionalShare = safeNumber(form.get('professionalShare')) || 100;
    if (amount <= 0) {
      setError('Le montant doit être strictement positif.');
      return;
    }
    setBusyId('manual-entry');
    setError(null);
    try {
      const next = await api.post<AccountingWorkspacePayload>('/billing/accounting/candidate/entries', {
        kind: manualKind,
        date: String(form.get('date') || ''),
        counterparty: String(form.get('counterparty') || '').trim(),
        mission: String(form.get('label') || '').trim(),
        amountCents: Math.round(amount * 100),
        currency: 'EUR',
        paymentMethod: String(form.get('paymentMethod') || 'Carte'),
        categoryCode: String(form.get('categoryCode') || ''),
        professionalShareBps: Math.round(Math.min(100, Math.max(0, professionalShare)) * 100),
        notes: String(form.get('notes') || '').trim() || undefined,
        hasReceipt: form.get('hasReceipt') === 'on',
      });
      applyWorkspace(next);
      event.currentTarget.reset();
      setManualKind('EXPENSE');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function removeEntry(id: string) {
    if (!window.confirm('Annuler cette écriture manuelle ? Elle restera tracée dans l’historique.')) return;
    setBusyId(id);
    setError(null);
    try {
      applyWorkspace(await api.delete<AccountingWorkspacePayload>(`/billing/accounting/candidate/entries/${encodeURIComponent(id)}`));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function toggleClassified(entry: AccountingEntry) {
    setBusyId(entry.id);
    setError(null);
    try {
      applyWorkspace(await api.post<AccountingWorkspacePayload>('/billing/accounting/candidate/classification', {
        recordKey: entry.id,
        classified: !(workspace?.classifiedIds || []).includes(entry.id),
      }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusyId('profile');
    setError(null);
    try {
      applyWorkspace(await api.patch<AccountingWorkspacePayload>('/billing/accounting/candidate/profile', {
        ...profile,
        taxRegime: profile.taxRegime || undefined,
        socialScheme: profile.socialScheme || undefined,
        activityMode: profile.activityMode || undefined,
        declarationFrequency: profile.declarationFrequency || undefined,
        activityStartDate: profile.activityStartDate || undefined,
        onboardingCompleted: true,
      }));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function downloadReceipt(settlement: RetrocessionSettlement) {
    setBusyId(settlement.id);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`/conversations/${settlement.conversationId}/invoices/candidate.pdf`), {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Téléchargement du justificatif impossible.');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `justificatif-retrocession-${settlement.agreementId}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  function exportCsv() {
    downloadTextFile(`medilink-compta-${selectedYear}.csv`, buildAccountingCsv(yearEntries, categories));
  }

  if (loading || !workspace) return <LoadingCard />;

  return (
    <>
      <PageHeader title="Ma compta" description="Rétrocessions, recettes, dépenses et pilotage de votre activité de remplacement." />
      {error ? <Alert type="error">{error}</Alert> : null}
      {!workspace.profile?.onboardingCompleted ? (
        <Alert type="info">
          Configurez votre situation fiscale avant d’utiliser les estimations.{' '}
          <button className="accounting-inline-action" type="button" onClick={() => navigate('tax')}>Configurer maintenant</button>
        </Alert>
      ) : null}

      <div className="billing-nav-row">
        <Select value={selectedYear} onChange={(event) => navigate(activeTab, Number(event.target.value))} aria-label="Année comptable">
          {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
        </Select>
        <div className="billing-tabs" role="tablist" aria-label="Sections comptables">
          {tabs.map((tab) => (
            <button key={tab.id} type="button" className={activeTab === tab.id ? 'active' : ''} onClick={() => navigate(tab.id)} role="tab" aria-selected={activeTab === tab.id}>
              {tab.label}
              {tab.id === 'settlements' && yearSettlements.filter((settlement) => settlement.status === 'TO_VALIDATE').length ? (
                <span className="tab-count-badge">{yearSettlements.filter((settlement) => settlement.status === 'TO_VALIDATE').length}</span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {activeTab === 'overview' ? <OverviewTab summary={summary} year={selectedYear} settlements={yearSettlements} openTransactions={() => navigate('transactions')} openSettlements={() => navigate('settlements')} /> : null}
      {activeTab === 'transactions' ? <TransactionsTab entries={filteredEntries} categories={categories} filter={entryFilter} setFilter={setEntryFilter} manualKind={manualKind} setManualKind={setManualKind} busyId={busyId} onAdd={addEntry} onRemove={removeEntry} onExport={exportCsv} /> : null}
      {activeTab === 'settlements' ? <SettlementsTab settlements={filteredSettlements} filter={settlementFilter} setFilter={setSettlementFilter} busyId={busyId} onDownload={downloadReceipt} /> : null}
      {activeTab === 'documents' ? <DocumentsTab entries={yearEntries} settlements={yearSettlements} classifiedIds={workspace.classifiedIds} busyId={busyId} onClassify={toggleClassified} onDownload={downloadReceipt} /> : null}
      {activeTab === 'tax' ? <TaxTab profile={profile} setProfile={setProfile} onSave={saveProfile} busy={busyId === 'profile'} summary={summary} selectedYear={selectedYear} rules={rules} provisionRate={provisionRate} setProvisionRate={setProvisionRate} /> : null}
      {activeTab === 'exports' ? <ExportsTab entries={yearEntries} summary={summary} year={selectedYear} onExport={exportCsv} /> : null}
    </>
  );
}

function OverviewTab({ summary, year, settlements, openTransactions, openSettlements }: {
  summary: AccountingSummary;
  year: number;
  settlements: RetrocessionSettlement[];
  openTransactions: () => void;
  openSettlements: () => void;
}) {
  const toValidate = settlements.filter((settlement) => settlement.status === 'TO_VALIDATE');
  return (
    <>
      <Card className="billing-hero-card billing-hero-chart">
        <div className="billing-hero-top">
          <div className="billing-hero-copy">
            <span>Résultat provisoire {year}</span>
            <h2>{formatMoney(summary.result)}</h2>
            <p>Recettes encaissées moins dépenses professionnelles connues.</p>
          </div>
          <div className="billing-overview-kpis">
            <div><span>Recettes</span><strong>{formatMoney(summary.revenue)}</strong><small>{summary.revenueEntries.length} écriture(s)</small></div>
            <div><span>Dépenses</span><strong>{formatMoney(summary.expenses)}</strong><small>{summary.expenseEntries.length} écriture(s)</small></div>
            <div><span>Disponible prudent</span><strong>{formatMoney(summary.available)}</strong><small>Après réserve indicative</small></div>
          </div>
        </div>
        <div className="billing-hero-chart-section">
          <MonthlyBarChart rows={summary.revenueEntries.map((entry) => ({ date: entry.date, amount: effectiveAmount(entry) }))} year={year} label="Recettes" barColor="var(--blue-lt)" lineColor="var(--blue)" />
        </div>
      </Card>
      <div className="billing-overview-grid">
        <Card className="dashboard-panel">
          <div className="toolbar"><div><h2>À traiter</h2><p className="small">Les actions qui rendent votre comptabilité plus fiable.</p></div></div>
          <div className="billing-alert-list">
            {toValidate.slice(0, 4).map((settlement) => <div key={settlement.id}><Badge tone="warning">Rétrocession</Badge><strong>{settlement.mission}</strong><span>Montant réel à valider par l’établissement</span></div>)}
            {summary.missingReceipts.slice(0, 4).map((entry) => <div key={entry.id}><Badge tone="warning">Justificatif</Badge><strong>{entry.mission}</strong><span>{entry.counterparty} · pièce manquante</span></div>)}
            {!toValidate.length && !summary.missingReceipts.length ? <div><Badge tone="success">À jour</Badge><strong>Aucune action prioritaire</strong><span>Les écritures connues sont cohérentes.</span></div> : null}
          </div>
          <div className="actions"><Button variant="light" onClick={openTransactions}>Voir les transactions</Button><Button variant="light" onClick={openSettlements}>Voir les rétrocessions</Button></div>
        </Card>
        <Card className="dashboard-panel">
          <div className="toolbar"><div><h2>Prochainement encaissable</h2><p className="small">Rétrocessions en cours, non comptées dans les recettes.</p></div></div>
          <div className="billing-provision-grid">
            <div><span>Montant connu</span><strong>{formatMoney(summary.expected)}</strong></div>
            <div><span>Rétrocessions ouvertes</span><strong>{settlements.filter((settlement) => settlement.status !== 'PAID').length}</strong></div>
          </div>
        </Card>
      </div>
    </>
  );
}

function TransactionsTab({ entries, categories, filter, setFilter, manualKind, setManualKind, busyId, onAdd, onRemove, onExport }: {
  entries: AccountingEntry[];
  categories: AccountingWorkspacePayload['categories'];
  filter: EntryFilter;
  setFilter: (filter: EntryFilter) => void;
  manualKind: AccountingEntryKind;
  setManualKind: (kind: AccountingEntryKind) => void;
  busyId: string | null;
  onAdd: (event: FormEvent<HTMLFormElement>) => void;
  onRemove: (id: string) => void;
  onExport: () => void;
}) {
  const availableCategories = (categories || []).filter((category) => category.kind === manualKind);
  return (
    <div className="billing-workspace">
      <Card className="dashboard-panel billing-register-card">
        <div className="toolbar">
          <div><h2>Journal de trésorerie</h2><p className="small">Recettes encaissées et dépenses payées, par date de mouvement.</p></div>
          <div className="billing-filters">
            <Select value={filter} onChange={(event) => setFilter(event.target.value as EntryFilter)} aria-label="Filtrer les transactions"><option value="ALL">Toutes</option><option value="REVENUE">Recettes</option><option value="EXPENSE">Dépenses</option></Select>
            <Button type="button" variant="light" onClick={onExport}>Exporter</Button>
          </div>
        </div>
        {!entries.length ? <EmptyState title="Aucune transaction" description="Ajoutez une écriture ou finalisez une rétrocession MediLink." /> : (
          <div className="table-wrap billing-table"><table><thead><tr><th>Date</th><th>Tiers / libellé</th><th>Catégorie</th><th>Montant</th><th>Source</th><th>Action</th></tr></thead><tbody>
            {entries.map((entry) => <tr key={entry.id}>
              <td>{formatDate(entry.date)}</td>
              <td><strong>{entry.counterparty}</strong><div className="small">{entry.mission}</div></td>
              <td>{(categories || []).find((category) => category.code === entry.categoryCode)?.label || 'Non classée'}</td>
              <td><strong className={entry.kind === 'EXPENSE' ? 'accounting-expense-amount' : 'accounting-revenue-amount'}>{entry.kind === 'EXPENSE' ? '− ' : '+ '}{formatMoney(effectiveAmount(entry), entry.currency)}</strong>{entry.professionalShareBps < 10000 ? <div className="small">Part pro {entry.professionalShareBps / 100}%</div> : null}</td>
              <td><Badge tone={entry.source === 'MEDILINK' ? 'success' : 'neutral'}>{sourceLabel(entry.source)}</Badge></td>
              <td className="actions">{entry.agreementId ? <LinkButton href={`/app/billing/${encodeURIComponent(`medilink-${entry.agreementId}`)}`} variant="light">Mission</LinkButton> : null}{entry.source === 'MANUAL' ? <Button type="button" variant="light" disabled={busyId === entry.id} onClick={() => onRemove(entry.id)}>Annuler</Button> : null}</td>
            </tr>)}
          </tbody></table></div>
        )}
      </Card>
      <div className="billing-side">
        <Card className="dashboard-panel billing-manual-card">
          <div className="toolbar compact"><div><h2>Ajouter une écriture</h2><p className="small">Pour les opérations hors MediLink ou non synchronisées.</p></div></div>
          <form className="form" onSubmit={onAdd}>
            <Field label="Type"><Select value={manualKind} onChange={(event) => setManualKind(event.target.value as AccountingEntryKind)}><option value="EXPENSE">Dépense</option><option value="REVENUE">Recette</option></Select></Field>
            <Field label="Date de paiement"><Input name="date" type="date" required /></Field>
            <Field label={manualKind === 'REVENUE' ? 'Payeur' : 'Fournisseur'}><Input name="counterparty" required placeholder={manualKind === 'REVENUE' ? 'Cabinet Martin' : 'SNCF, CARMF…'} /></Field>
            <Field label="Libellé"><Input name="label" required placeholder={manualKind === 'REVENUE' ? 'Remplacement hors MediLink' : 'Trajet de mission'} /></Field>
            <Field label="Catégorie"><Select name="categoryCode" required defaultValue=""><option value="" disabled>Choisir</option>{availableCategories.map((category) => <option key={category.code} value={category.code}>{category.label}</option>)}</Select></Field>
            <div className="form-row"><Field label="Montant"><Input name="amount" type="number" min="0.01" step="0.01" required /></Field><Field label="Part professionnelle (%)"><Input name="professionalShare" type="number" min="0" max="100" step="1" defaultValue="100" /></Field></div>
            <Field label="Paiement"><Select name="paymentMethod" defaultValue={manualKind === 'REVENUE' ? 'Virement' : 'Carte'}><option>Virement</option><option>Carte</option><option>Chèque</option><option>Espèces</option><option>Prélèvement</option><option>Autre</option></Select></Field>
            <Field label="Note"><Input name="notes" placeholder="Information complémentaire" /></Field>
            <label className="billing-checkbox"><input name="hasReceipt" type="checkbox" /><span>Justificatif déjà disponible</span></label>
            <Button type="submit" variant="secondary" block disabled={busyId === 'manual-entry'}>{busyId === 'manual-entry' ? 'Ajout…' : 'Ajouter au journal'}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}

function SettlementsTab({ settlements, filter, setFilter, busyId, onDownload }: {
  settlements: RetrocessionSettlement[];
  filter: 'ALL' | RetrocessionSettlement['status'];
  setFilter: (filter: 'ALL' | RetrocessionSettlement['status']) => void;
  busyId: string | null;
  onDownload: (settlement: RetrocessionSettlement) => void;
}) {
  return <Card className="dashboard-panel">
    <div className="toolbar"><div><h2>Suivi des rétrocessions</h2><p className="small">Les missions en cours restent séparées des recettes tant que le paiement n’est pas encaissé.</p></div><Select value={filter} onChange={(event) => setFilter(event.target.value as typeof filter)} aria-label="Filtrer les rétrocessions"><option value="ALL">Toutes</option><option value="EXPECTED">À venir</option><option value="TO_VALIDATE">À régulariser</option><option value="PAID">Encaissées</option><option value="DISPUTED">Contestées</option></Select></div>
    {!settlements.length ? <EmptyState title="Aucune rétrocession" description="Les accords de mission apparaîtront automatiquement ici." /> : <div className="billing-mission-list">
      {settlements.map((settlement) => <section key={settlement.id} className="card billing-mission-card">
        <div className="billing-mission-head"><div><Badge tone={settlementStatusTone(settlement.status)}>{settlementStatusLabel(settlement.status)}</Badge><h2>{settlement.mission}</h2><p>{settlement.client} · {formatDate(settlement.startDate)}</p></div><div className="billing-mission-amount"><span>Rétrocession</span><strong>{settlement.amount > 0 ? formatMoney(settlement.amount, settlement.currency) : settlement.retrocessionPercentage ? `${settlement.retrocessionPercentage}%` : 'À déterminer'}</strong></div></div>
        <div className="billing-mission-meta"><div><span>Honoraires réalisés</span><strong>{settlement.grossHonorariaCents != null ? formatMoney(settlement.grossHonorariaCents / 100) : 'À renseigner'}</strong></div><div><span>Montant final</span><strong>{settlement.finalAmountCents != null ? formatMoney(settlement.finalAmountCents / 100) : 'À valider'}</strong></div><div><span>Justificatif</span><strong>{settlement.hasReceipt ? 'Disponible' : 'Non généré'}</strong></div></div>
        <div className="actions"><LinkButton href={`/app/billing/${encodeURIComponent(`medilink-${settlement.agreementId}`)}`} variant="secondary">Voir la mission</LinkButton>{settlement.hasReceipt ? <Button variant="light" disabled={busyId === settlement.id} onClick={() => onDownload(settlement)}>{busyId === settlement.id ? 'Téléchargement…' : 'Justificatif PDF'}</Button> : null}</div>
      </section>)}
    </div>}
  </Card>;
}

function DocumentsTab({ entries, settlements, classifiedIds, busyId, onClassify, onDownload }: {
  entries: AccountingEntry[];
  settlements: RetrocessionSettlement[];
  classifiedIds: string[];
  busyId: string | null;
  onClassify: (entry: AccountingEntry) => void;
  onDownload: (settlement: RetrocessionSettlement) => void;
}) {
  const settlementByAgreement = new Map(settlements.map((settlement) => [settlement.agreementId, settlement]));
  return <Card className="dashboard-panel"><div className="toolbar"><div><h2>Justificatifs comptables</h2><p className="small">Les pièces MediLink disponibles et les pièces déclarées sur vos écritures manuelles.</p></div></div>
    {!entries.length ? <EmptyState title="Aucune pièce connue" description="Les justificatifs apparaîtront avec vos transactions." /> : <div className="billing-doc-grid">
      {entries.map((entry) => {
        const settlement = entry.agreementId ? settlementByAgreement.get(entry.agreementId) : undefined;
        const classified = classifiedIds.includes(entry.id);
        return <div key={entry.id} className="billing-doc-card"><div><Badge tone={entry.hasReceipt ? 'success' : 'warning'}>{entry.hasReceipt ? 'Disponible' : 'Manquant'}</Badge><h3>{entry.mission}</h3><p>{entry.counterparty} · {formatDate(entry.date)}</p></div><div className="billing-doc-meta"><span>{entry.kind === 'REVENUE' ? 'Pièce de recette' : 'Justificatif de dépense'}</span><strong>{formatMoney(effectiveAmount(entry), entry.currency)}</strong></div><div className="actions">{settlement?.hasReceipt ? <Button variant="light" disabled={busyId === settlement.id} onClick={() => onDownload(settlement)}>Télécharger</Button> : null}{entry.hasReceipt ? <Button type="button" variant={classified ? 'secondary' : 'light'} disabled={busyId === entry.id} onClick={() => onClassify(entry)}>{classified ? 'Classé' : 'Marquer classé'}</Button> : null}</div></div>;
      })}
    </div>}
  </Card>;
}

function TaxTab({ profile, setProfile, onSave, busy, summary, selectedYear, rules, provisionRate, setProvisionRate }: {
  profile: ProfileDraft;
  setProfile: (profile: ProfileDraft) => void;
  onSave: (event: FormEvent<HTMLFormElement>) => void;
  busy: boolean;
  summary: AccountingSummary;
  selectedYear: number;
  rules: typeof DEFAULT_RULES;
  provisionRate: number;
  setProvisionRate: (value: number) => void;
}) {
  const microThreshold = rules.microBncThresholds[String(selectedYear)] || rules.microBncThresholds['2028'] || 83600;
  const activeThreshold = profile.socialScheme === 'RSPM' ? rules.rspmAnnualThreshold : microThreshold;
  const thresholdRevenue = profile.socialScheme === 'RSPM'
    ? summary.revenueEntries
      .filter((entry) => entry.categoryCode === 'RETROCESSION_HONORAIRES')
      .reduce((total, entry) => total + effectiveAmount(entry), 0)
    : summary.revenue;
  const progress = Math.min(100, Math.round(thresholdRevenue / activeThreshold * 100));
  return <div className="billing-tax-grid">
    <Card className="dashboard-panel accounting-profile-card"><div className="toolbar"><div><h2>Situation comptable</h2><p className="small">Ces informations personnalisent les seuils et les échéances.</p></div></div><form className="form" onSubmit={onSave}>
      <div className="form-row"><Field label="Nature de l’activité"><Select required value={profile.activityMode} onChange={(event) => setProfile({ ...profile, activityMode: event.target.value })}><option value="" disabled>Choisir</option><option value="LIBERAL">Remplacements libéraux</option><option value="SALARIED">Activité salariée</option><option value="MIXED">Activité mixte</option></Select></Field><Field label="Régime fiscal"><Select required value={profile.taxRegime} onChange={(event) => setProfile({ ...profile, taxRegime: event.target.value })}><option value="" disabled>Choisir</option><option value="MICRO_BNC">Micro-BNC</option><option value="CONTROLLED_DECLARATION">Déclaration contrôlée</option></Select></Field></div>
      <div className="form-row"><Field label="Régime social"><Select required value={profile.socialScheme} onChange={(event) => { const socialScheme = event.target.value; setProfile({ ...profile, socialScheme, declarationFrequency: socialScheme === 'RSPM' && profile.declarationFrequency === 'ANNUAL' ? '' : profile.declarationFrequency }); }}><option value="" disabled>Choisir</option><option value="RSPM">Offre simplifiée remplaçant</option><option value="PAMC">PAMC classique</option><option value="OTHER">Autre</option></Select></Field><Field label="Périodicité"><Select required value={profile.declarationFrequency} onChange={(event) => setProfile({ ...profile, declarationFrequency: event.target.value })}><option value="" disabled>Choisir</option><option value="MONTHLY">Mensuelle</option><option value="QUARTERLY">Trimestrielle</option>{profile.socialScheme !== 'RSPM' ? <option value="ANNUAL">Annuelle</option> : null}</Select></Field></div>
      <Field label="Début de l’activité"><Input type="date" value={profile.activityStartDate} onChange={(event) => setProfile({ ...profile, activityStartDate: event.target.value })} /></Field>
      <label className="billing-checkbox"><input type="checkbox" checked={profile.exclusiveLocum} onChange={(event) => setProfile({ ...profile, exclusiveLocum: event.target.checked })} /><span>J’exerce exclusivement comme remplaçant</span></label>
      <label className="billing-checkbox"><input type="checkbox" checked={profile.hasOtherIndependentActivity} onChange={(event) => setProfile({ ...profile, hasOtherIndependentActivity: event.target.checked })} /><span>J’ai une autre activité indépendante</span></label>
      {profile.socialScheme === 'RSPM' && (!profile.exclusiveLocum || profile.hasOtherIndependentActivity) ? <Alert type="info">Votre situation déclarée ne semble pas correspondre aux conditions habituelles de l’offre simplifiée remplaçant.</Alert> : null}
      <Button disabled={busy}>{busy ? 'Enregistrement…' : 'Enregistrer ma situation'}</Button>
    </form></Card>
    <Card className="dashboard-panel billing-tax-card"><div><span>{profile.socialScheme === 'RSPM' ? 'Honoraires rétrocédés' : 'Recettes'} {selectedYear}</span><h2>{formatMoney(thresholdRevenue)}</h2><p>{profile.socialScheme === 'RSPM' ? 'Suivi du plafond annuel de l’offre simplifiée.' : profile.taxRegime === 'CONTROLLED_DECLARATION' ? 'Repère comparatif avec le plafond du micro-BNC.' : 'Suivi du seuil de votre régime micro-BNC.'}</p></div><div className="billing-threshold"><div className="toolbar compact"><div><h3>{profile.socialScheme === 'RSPM' ? 'Seuil RSPM' : 'Seuil micro-BNC'}</h3><p className="small">{formatMoney(Math.max(0, activeThreshold - thresholdRevenue))} avant {formatMoney(activeThreshold)}</p></div><Badge tone={progress >= 85 ? 'warning' : 'success'}>{progress}%</Badge></div><div className="billing-progress"><span style={{ width: `${progress}%` }} /></div></div></Card>
    <Card className="dashboard-panel"><div className="toolbar compact"><div><h2>Réserve prudente</h2><p className="small">Repère indicatif à adapter à votre situation réelle.</p></div><strong>{provisionRate}%</strong></div><input className="billing-slider" type="range" min="20" max="65" step="1" value={provisionRate} onChange={(event) => setProvisionRate(Number(event.target.value))} aria-label="Taux de réserve" /><div className="billing-provision-grid"><div><span>À réserver</span><strong>{formatMoney(summary.provision)}</strong></div><div><span>Disponible</span><strong>{formatMoney(summary.available)}</strong></div></div></Card>
  </div>;
}

function ExportsTab({ entries, summary, year, onExport }: { entries: AccountingEntry[]; summary: AccountingSummary; year: number; onExport: () => void }) {
  return <div className="billing-export-grid"><Card className="dashboard-panel billing-export-card"><div><Badge tone="success">CSV</Badge><h2>Journal {year}</h2><p>Recettes, dépenses, catégories et parts professionnelles connues.</p></div><div className="billing-export-stats"><div><span>Écritures</span><strong>{entries.length}</strong></div><div><span>Recettes</span><strong>{formatMoney(summary.revenue)}</strong></div><div><span>Dépenses</span><strong>{formatMoney(summary.expenses)}</strong></div></div><Button onClick={onExport}>Télécharger le journal CSV</Button></Card><Card className="dashboard-panel billing-export-card is-disabled"><div><Badge tone="warning">Étape suivante</Badge><h2>Dossier annuel et 2035</h2><p>La clôture, les immobilisations et la déclaration contrôlée seront ajoutées après validation du journal V2.</p></div><Button variant="light" disabled>Non disponible</Button></Card></div>;
}
