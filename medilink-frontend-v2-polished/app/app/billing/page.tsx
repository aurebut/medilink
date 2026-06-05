'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, getApiUrl, getAuthToken } from '@/lib/api';
import { agreementLabel, agreementNextStep, agreementTone, latestAgreement } from '@/lib/candidate-workspace';
import { formatDate, formatMoney } from '@/lib/format';
import type { Conversation, MissionAgreement } from '@/lib/types';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LinkButton, LoadingCard, PageHeader, Select } from '@/components/ui';

type ManualRevenue = {
  id: string;
  date: string;
  client: string;
  mission: string;
  amount: number;
  paymentMethod: string;
  notes?: string;
};

type AccountingRow = {
  id: string;
  source: 'MEDILINK' | 'MANUAL';
  date?: string | null;
  client: string;
  mission: string;
  amount: number;
  currency: string;
  status: 'AVAILABLE' | 'PENDING' | 'MANUAL';
  paymentMethod: string;
  conversationId?: string;
  agreement?: MissionAgreement | null;
  notes?: string;
};

const STORAGE_KEY = 'medilink_candidate_billing_v1';
const DEFAULT_PROVISION_RATE = 45;
const MICRO_BNC_THRESHOLD = 77700;

function safeNumber(value: FormDataEntryValue | null) {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
}

function csvEscape(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
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
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return { manualRows: [] as ManualRevenue[], provisionRate: DEFAULT_PROVISION_RATE };
    const parsed = JSON.parse(stored);
    return {
      manualRows: Array.isArray(parsed.manualRows) ? parsed.manualRows as ManualRevenue[] : [],
      provisionRate: typeof parsed.provisionRate === 'number' ? parsed.provisionRate : DEFAULT_PROVISION_RATE,
    };
  } catch {
    return { manualRows: [] as ManualRevenue[], provisionRate: DEFAULT_PROVISION_RATE };
  }
}

export default function CandidateBillingPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [manualRows, setManualRows] = useState<ManualRevenue[]>([]);
  const [provisionRate, setProvisionRate] = useState(DEFAULT_PROVISION_RATE);
  const [selectedYear, setSelectedYear] = useState(getCurrentYear());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AVAILABLE' | 'PENDING' | 'MANUAL'>('ALL');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readStoredState();
    setManualRows(stored.manualRows);
    setProvisionRate(stored.provisionRate);

    api.get<Conversation[]>('/conversations')
      .then(setConversations)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ manualRows, provisionRate }));
  }, [manualRows, provisionRate]);

  const accountingRows = useMemo<AccountingRow[]>(() => {
    const medilinkRows = conversations
      .map((conversation) => ({ conversation, agreement: latestAgreement(conversation) }))
      .filter((row) => row.agreement)
      .map(({ conversation, agreement }) => {
        const released = agreement?.status === 'PAYMENT_RELEASED';
        return {
          id: `medilink-${conversation.id}`,
          source: 'MEDILINK' as const,
          date: agreement?.payment?.releasedAt || agreement?.completedAt || agreement?.startDate || conversation.mission?.startDate,
          client: conversation.establishment?.name || conversation.mission?.city || 'Etablissement',
          mission: conversation.mission?.title || 'Mission MediLink',
          amount: released ? amountFromAgreement(agreement) : 0,
          currency: agreement?.currency || 'EUR',
          status: released ? 'AVAILABLE' as const : 'PENDING' as const,
          paymentMethod: released ? 'Virement MediLink' : 'A confirmer',
          conversationId: conversation.id,
          agreement,
        };
      });

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
    }));

    return [...medilinkRows, ...manualAccountingRows].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : 0;
      const bTime = b.date ? new Date(b.date).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations, manualRows]);

  const availableYears = useMemo(() => {
    const years = new Set([getCurrentYear()]);
    accountingRows.forEach((row) => {
      if (row.date) years.add(new Date(row.date).getFullYear());
    });
    return [...years].sort((a, b) => b - a);
  }, [accountingRows]);

  const filteredRows = useMemo(() => accountingRows.filter((row) => {
    const rowYear = row.date ? new Date(row.date).getFullYear() : selectedYear;
    const yearMatches = rowYear === selectedYear;
    const statusMatches = statusFilter === 'ALL' || row.status === statusFilter;
    return yearMatches && statusMatches;
  }), [accountingRows, selectedYear, statusFilter]);

  const dashboard = useMemo(() => {
    const releasedRows = accountingRows.filter((row) => {
      const rowYear = row.date ? new Date(row.date).getFullYear() : selectedYear;
      return rowYear === selectedYear && row.amount > 0 && row.status !== 'PENDING';
    });
    const pendingRows = accountingRows.filter((row) => {
      const rowYear = row.date ? new Date(row.date).getFullYear() : selectedYear;
      return rowYear === selectedYear && row.status === 'PENDING';
    });
    const revenue = releasedRows.reduce((sum, row) => sum + row.amount, 0);
    const provision = Math.round(revenue * (provisionRate / 100));
    const netAvailable = revenue - provision;
    const medilinkReceipts = accountingRows.filter((row) => row.status === 'AVAILABLE' && row.source === 'MEDILINK').length;
    const thresholdProgress = Math.min(100, Math.round((revenue / MICRO_BNC_THRESHOLD) * 100));

    return {
      revenue,
      provision,
      netAvailable,
      pendingRows,
      medilinkReceipts,
      thresholdProgress,
      remainingBeforeThreshold: Math.max(0, MICRO_BNC_THRESHOLD - revenue),
    };
  }, [accountingRows, provisionRate, selectedYear]);

  async function downloadCandidateInvoice(conversationId: string) {
    setBusyId(conversationId);
    setError(null);
    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`/conversations/${conversationId}/invoices/candidate.pdf`), {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!response.ok) throw new Error('Telechargement du justificatif impossible.');

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
      setError('Renseignez au minimum une date, un etablissement, une mission et un montant positif.');
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
    }, ...rows]);
    event.currentTarget.reset();
  }

  function removeManualRevenue(id: string) {
    setManualRows((rows) => rows.filter((row) => row.id !== id));
  }

  function exportCsv() {
    const headers = ['Date', 'Source', 'Etablissement', 'Mission', 'Montant', 'Statut', 'Mode paiement', 'Notes'];
    const lines = filteredRows.map((row) => [
      row.date ? new Date(row.date).toISOString().slice(0, 10) : '',
      row.source === 'MEDILINK' ? 'MediLink' : 'Hors MediLink',
      row.client,
      row.mission,
      row.amount,
      row.status === 'PENDING' ? 'En attente' : row.status === 'AVAILABLE' ? 'Encaisse' : 'Manuel',
      row.paymentMethod,
      row.notes || agreementNextStep(row.agreement?.status),
    ].map(csvEscape).join(';'));
    const csv = [headers.map(csvEscape).join(';'), ...lines].join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medilink-compta-${selectedYear}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader
        title="Facturation & compta"
        description="Registre des recettes, justificatifs et provisions pour piloter vos remplacements sans tableur."
        actions={
          <>
            <Button type="button" variant="light" onClick={exportCsv} disabled={filteredRows.length === 0}>Exporter CSV</Button>
            <LinkButton href="/app/messages" variant="light">Voir les accords</LinkButton>
          </>
        }
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="billing-hero-grid">
        <Card className="billing-hero-card">
          <div className="billing-hero-copy">
            <span>Exercice {selectedYear}</span>
            <h2>{formatMoney(dashboard.revenue)}</h2>
            <p>Recettes encaissees connues dans MediLink et ajoutees manuellement.</p>
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

        <Card className="billing-provision-card">
          <div className="toolbar compact">
            <div>
              <h2>Provision prudente</h2>
              <p className="small">Taux modifiable selon votre situation URSSAF, CARMF et impots.</p>
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
            <div><span>A garder</span><strong>{formatMoney(dashboard.provision)}</strong></div>
            <div><span>Net prudent</span><strong>{formatMoney(dashboard.netAvailable)}</strong></div>
          </div>
        </Card>
      </div>

      <div className="grid-3 dashboard-stat-grid">
        <Card className="stat-card"><div className="stat"><span>Justificatifs MediLink</span><strong>{dashboard.medilinkReceipts}</strong><div className="small">PDF disponibles apres paiement libere.</div></div></Card>
        <Card className="stat-card"><div className="stat"><span>En attente</span><strong>{dashboard.pendingRows.length}</strong><div className="small">Accords ou missions non finalises.</div></div></Card>
        <Card className="stat-card"><div className="stat"><span>Lignes hors MediLink</span><strong>{manualRows.length}</strong><div className="small">Remplacements ajoutes au registre.</div></div></Card>
      </div>

      <div className="billing-workspace">
        <Card className="dashboard-panel billing-register-card">
          <div className="toolbar">
            <div>
              <h2>Livre de recettes</h2>
              <p className="small">Base exportable pour votre suivi BNC, avec les missions MediLink et hors plateforme.</p>
            </div>
            <div className="billing-filters">
              <Select value={selectedYear} onChange={(event) => setSelectedYear(Number(event.target.value))} aria-label="Annee">
                {availableYears.map((year) => <option key={year} value={year}>{year}</option>)}
              </Select>
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} aria-label="Filtre statut">
                <option value="ALL">Toutes</option>
                <option value="AVAILABLE">Encaissees</option>
                <option value="PENDING">En attente</option>
                <option value="MANUAL">Hors MediLink</option>
              </Select>
            </div>
          </div>

          {filteredRows.length === 0 ? (
            <EmptyState
              title="Aucune recette sur cette vue"
              description="Ajoutez une ligne hors MediLink ou attendez qu'une mission validee apparaisse ici."
              action={<LinkButton href="/app/missions">Voir mes missions</LinkButton>}
            />
          ) : (
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
                  {filteredRows.map((row) => (
                    <tr key={row.id}>
                      <td>{formatDate(row.date)}</td>
                      <td>
                        <strong>{row.client}</strong>
                        <div className="small">{row.source === 'MEDILINK' ? 'MediLink' : row.paymentMethod}</div>
                      </td>
                      <td>
                        <strong>{row.mission}</strong>
                        <div className="small">{row.notes || agreementNextStep(row.agreement?.status)}</div>
                      </td>
                      <td>
                        {row.amount > 0 ? formatMoney(row.amount, row.currency) : <span className="muted">A completer</span>}
                      </td>
                      <td>
                        {row.source === 'MEDILINK'
                          ? <Badge tone={agreementTone(row.agreement?.status)}>{agreementLabel(row.agreement?.status)}</Badge>
                          : <Badge tone="neutral">Hors MediLink</Badge>}
                      </td>
                      <td className="actions">
                        {row.conversationId && row.status === 'AVAILABLE' ? (
                          <Button variant="light" disabled={busyId === row.conversationId} onClick={() => void downloadCandidateInvoice(row.conversationId!)}>
                            {busyId === row.conversationId ? 'Telechargement...' : 'PDF'}
                          </Button>
                        ) : row.source === 'MANUAL' ? (
                          <Button type="button" variant="light" onClick={() => removeManualRevenue(row.id)}>Retirer</Button>
                        ) : (
                          <LinkButton href="/app/messages" variant="light">Suivre</LinkButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <div className="billing-side">
          <Card className="dashboard-panel billing-manual-card">
            <div className="toolbar compact">
              <div>
                <h2>Ajouter hors MediLink</h2>
                <p className="small">Remplacement, garde ou vacation payee en dehors de la plateforme.</p>
              </div>
            </div>
            <form className="form" onSubmit={addManualRevenue}>
              <Field label="Date encaissement"><Input name="date" type="date" required /></Field>
              <Field label="Etablissement"><Input name="client" placeholder="Cabinet Martin" required /></Field>
              <Field label="Mission"><Input name="mission" placeholder="Remplacement MG" required /></Field>
              <div className="form-row">
                <Field label="Montant"><Input name="amount" type="number" min="1" step="1" placeholder="1200" required /></Field>
                <Field label="Paiement">
                  <Select name="paymentMethod" defaultValue="Virement">
                    <option>Virement</option>
                    <option>Cheque</option>
                    <option>Especes</option>
                    <option>Autre</option>
                  </Select>
                </Field>
              </div>
              <Field label="Note"><Input name="notes" placeholder="Retrocession 70%, facture recue..." /></Field>
              <Button type="submit" variant="secondary" block>Ajouter au registre</Button>
            </form>
          </Card>

          <Card className="dashboard-panel billing-checklist-card">
            <h2>Echeances a surveiller</h2>
            <div className="billing-checklist">
              <div><Badge tone="warning">Mensuel / trimestriel</Badge><strong>Declaration URSSAF/RSPM</strong><span>Reporter les honoraires encaisses sur la periode choisie.</span></div>
              <div><Badge tone="neutral">Annuel</Badge><strong>2042-C-PRO</strong><span>Reporter les recettes BNC de l'exercice fiscal.</span></div>
              <div><Badge tone="neutral">Annuel</Badge><strong>CARMF</strong><span>Verifier affiliation, dispense possible et appels de cotisations.</span></div>
              <div><Badge tone="success">Continu</Badge><strong>Pieces justificatives</strong><span>Conserver justificatifs MediLink et documents hors plateforme.</span></div>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
