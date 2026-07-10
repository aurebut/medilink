'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getApiUrl, getAuthToken } from '@/lib/api';
import { agreementLabel, agreementNextStep, agreementTone, latestAgreement } from '@/lib/candidate-workspace';
import { formatDate, formatMoney } from '@/lib/format';
import type { Conversation, MissionAgreement } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Badge, Button, Card, EmptyState, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

type AccountingRow = {
  id: string;
  date?: string | null;
  client: string;
  mission: string;
  amount: number;
  currency: string;
  status: 'AVAILABLE' | 'PENDING' | 'COMPLETED' | 'PROPOSED';
  conversationId?: string;
  agreement?: MissionAgreement | null;
  notes?: string;
  hasReceipt: boolean;
  classified: boolean;
};

function amountFromAgreement(agreement?: MissionAgreement | null) {
  if (!agreement) return 0;
  return agreement.candidateAmount || agreement.amount || 0;
}

function rowStatusFromAgreement(agreement?: MissionAgreement | null): AccountingRow['status'] {
  if (!agreement) return 'PENDING';
  if (agreement.status === 'PAYMENT_RELEASED') return 'AVAILABLE';
  if (agreement.status === 'COMPLETED') return 'COMPLETED';
  if (agreement.status === 'PROPOSED') return 'PROPOSED';
  return 'PENDING';
}

function buildMissionRows(conversations: Conversation[], classifiedIds: string[]) {
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
        date: agreement?.payment?.releasedAt || agreement?.completedAt || agreement?.startDate || conversation.mission?.startDate,
        client: conversation.establishment?.name || conversation.mission?.city || 'Établissement',
        mission: conversation.mission?.title || 'Mission MediLink',
        amount: released ? amount : 0,
        currency: agreement?.currency || 'EUR',
        status: rowStatusFromAgreement(agreement),
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

  return [...medilinkRowMap.values()];
}

function statusCopy(row: AccountingRow) {
  if (row.agreement?.status === 'PAYMENT_RELEASED') return 'Justificatif disponible';
  return agreementNextStep(row.agreement?.status);
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

function remainingActions(row: AccountingRow) {
  const actions = [];
  if (row.agreement?.status === 'PROPOSED') actions.push('Répondre à la proposition finale.');
  if (row.agreement?.status === 'PAYMENT_REQUIRED') actions.push("Attendre la confirmation de l'établissement.");
  if (row.agreement?.status === 'FUNDS_SECURED') actions.push('Réaliser la mission puis attendre la validation de fin.');
  if (row.agreement?.status === 'COMPLETED') actions.push("Faire valider la rétrocession par l'établissement.");
  if (row.agreement?.status === 'PAYMENT_RELEASED' && !row.hasReceipt) actions.push('Générer ou récupérer le justificatif de mission.');
  if (row.hasReceipt && !row.classified) actions.push('Marquer le justificatif comme classé.');
  if (row.amount <= 0 && row.agreement?.status === 'PAYMENT_RELEASED') actions.push('Renseigner le montant réellement validé.');
  return actions.length ? actions : ['Aucune action comptable urgente.'];
}

export default function BillingMissionDetailPage() {
  const params = useParams<{ rowId: string }>();
  const rowId = decodeURIComponent(params.rowId);
  const cachedConversations = api.getSync<Conversation[]>('/conversations');
  const [conversations, setConversations] = useState<Conversation[]>(cachedConversations || []);
  const [classifiedIds, setClassifiedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(!cachedConversations);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadConversations(options: { reload?: boolean } = {}) {
    setConversations(options.reload
      ? await api.reload<Conversation[]>('/conversations')
      : await api.get<Conversation[]>('/conversations'));
  }

  async function loadAccounting(options: { reload?: boolean } = {}) {
    const path = '/billing/accounting/candidate';
    const workspace = options.reload
      ? await api.reload<{ classifiedIds: string[] }>(path)
      : await api.get<{ classifiedIds: string[] }>(path);
    setClassifiedIds(workspace.classifiedIds);
  }

  useEffect(() => {
    Promise.all([loadConversations(), loadAccounting()])
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useAutoRefresh(() => Promise.all([loadConversations({ reload: true }), loadAccounting({ reload: true })]).then(() => undefined), { enabled: !loading && !busyId });

  const row = useMemo(() => buildMissionRows(conversations, classifiedIds).find((item) => item.id === rowId), [classifiedIds, conversations, rowId]);

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

  async function toggleClassified(id: string) {
    setBusyId(id);
    setError(null);
    try {
      const workspace = await api.post<{ classifiedIds: string[] }>('/billing/accounting/candidate/classification', {
        recordKey: id,
        classified: !classifiedIds.includes(id),
      });
      setClassifiedIds(workspace.classifiedIds);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <LoadingCard />;

  if (!row) {
    return (
      <>
        <PageHeader title="Mission comptable" description="Cette mission n'est plus disponible dans vos conversations." actions={<LinkButton href="/app/billing" variant="light">Retour</LinkButton>} />
        {error ? <Alert type="error">{error}</Alert> : null}
        <EmptyState title="Mission introuvable" description="Revenez à Ma compta pour consulter les missions disponibles." action={<LinkButton href="/app/billing">Retour à Ma compta</LinkButton>} />
      </>
    );
  }

  const estimatedAmount = row.agreement?.amount && row.agreement.amount > 0
    ? formatMoney(row.agreement.amount, row.currency)
    : row.agreement?.retrocessionPercentage
      ? `${row.agreement.retrocessionPercentage}% des honoraires encaissés`
      : 'À renseigner';
  const validatedAmount = row.amount > 0 ? formatMoney(row.amount, row.currency) : 'Non validé';
  const actions = remainingActions(row);

  return (
    <>
      <PageHeader
        title={row.mission}
        description={`${row.client} · ${formatDate(row.date)}`}
        actions={<LinkButton href="/app/billing" variant="light">Retour à Ma compta</LinkButton>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="billing-detail-page">
        <Card className="billing-mission-detail">
          <div className="billing-detail-head">
            <div>
              <span>Mission comptable</span>
              <Badge tone={agreementTone(row.agreement?.status)}>{agreementLabel(row.agreement?.status)}</Badge>
              <h2>{row.mission}</h2>
              <p>{row.client}</p>
            </div>
          </div>

          <div className="billing-detail-grid">
            <div><span>Établissement</span><strong>{row.client}</strong></div>
            <div><span>Date</span><strong>{formatDate(row.date)}</strong></div>
            <div><span>Rétrocession</span><strong>{row.agreement?.retrocessionPercentage ? `${row.agreement.retrocessionPercentage}%` : 'À renseigner'}</strong></div>
            <div><span>Montant estimé</span><strong>{estimatedAmount}</strong></div>
            <div><span>Montant validé</span><strong>{validatedAmount}</strong></div>
            <div><span>Justificatif</span><strong>{row.hasReceipt ? 'Disponible' : 'Non disponible'}</strong></div>
            <div><span>Prochaine action</span><strong>{statusCopy(row)}</strong></div>
            <div><span>Classement</span><strong>{row.classified ? 'Classé' : 'À classer'}</strong></div>
          </div>
        </Card>

        <div className="billing-detail-side">
          <Card className="billing-detail-section">
            <h3>Timeline complète</h3>
            <div className="billing-detail-timeline">
              {timelineSteps(row).map((step) => (
                <div key={step.key} className={`${step.done ? 'done' : ''} ${step.active ? 'active' : ''}`}>
                  <span aria-hidden="true" />
                  <div>
                    <strong>{step.label}</strong>
                    <small>{step.done ? 'Terminé' : step.active ? 'En cours' : 'À venir'}</small>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="billing-detail-section">
            <h3>Actions restantes</h3>
            <div className="billing-action-list">
              {actions.map((action) => (
                <div key={action}>
                  <span aria-hidden="true" />
                  <strong>{action}</strong>
                </div>
              ))}
            </div>
          </Card>

          <Card className="billing-detail-section">
            <h3>Notes</h3>
            <p>{row.notes || row.agreement?.terms || 'Aucune note comptable pour cette mission.'}</p>
            <div className="actions">
              {row.conversationId ? <LinkButton href={`/app/messages?id=${row.conversationId}`} variant="light">Ouvrir l'échange</LinkButton> : null}
              {row.conversationId && row.hasReceipt ? (
                <Button variant="light" disabled={busyId === row.conversationId} onClick={() => void downloadCandidateInvoice(row.conversationId!)}>
                  {busyId === row.conversationId ? 'Téléchargement...' : 'Télécharger le justificatif'}
                </Button>
              ) : null}
              {row.hasReceipt ? (
                <Button type="button" variant={row.classified ? 'secondary' : 'light'} onClick={() => toggleClassified(row.id)}>
                  {row.classified ? 'Classé' : 'Marquer classé'}
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
