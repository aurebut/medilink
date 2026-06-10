'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, getApiUrl, getAuthToken } from '@/lib/api';
import { agreementTone } from '@/lib/candidate-workspace';
import { formatDate, formatMoney } from '@/lib/format';
import type { Conversation, MissionAgreement } from '@/lib/types';
import { Alert, Badge, Button, Card, EmptyState, LinkButton, LoadingCard, PageHeader } from '@/components/ui';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { candidateNounCapitalized } from '@/lib/grammar';
import { statusLabel } from '@/lib/labels';
import { useAutoRefresh } from '@/lib/use-auto-refresh';

type AccountingRow = {
  id: string;
  date?: string | null;
  remplacant: string;
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

const STORAGE_KEY = 'medilink_establishment_billing_v2';

function amountFromAgreement(agreement?: MissionAgreement | null) {
  if (!agreement) return 0;
  return agreement.amount || 0;
}

function platformFeeFromAgreement(agreement?: MissionAgreement | null) {
  if (!agreement) return 0;
  return agreement.platformFee || 0;
}

function rowStatusFromAgreement(agreement?: MissionAgreement | null): AccountingRow['status'] {
  if (!agreement) return 'PENDING';
  if (agreement.status === 'PAYMENT_RELEASED') return 'AVAILABLE';
  if (agreement.status === 'COMPLETED') return 'COMPLETED';
  if (agreement.status === 'PROPOSED') return 'PROPOSED';
  return 'PENDING';
}

function readClassifiedIds() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [] as string[];
    const parsed = JSON.parse(stored);
    return Array.isArray(parsed.classifiedIds) ? parsed.classifiedIds as string[] : [];
  } catch {
    return [] as string[];
  }
}

function writeClassifiedIds(classifiedIds: string[]) {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...parsed, classifiedIds }));
  } catch {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ classifiedIds }));
  }
}

function latestAgreement(conversation?: Conversation | null) {
  return conversation?.agreements?.[0] || null;
}

function candidateName(application?: any) {
  if (!application) return 'Candidat';
  const name = [application.candidate?.profile?.firstName, application.candidate?.profile?.lastName].filter(Boolean).join(' ');
  return name || application.candidate?.email || `${candidateNounCapitalized(application.candidate?.profile)} à identifier`;
}

function buildMissionRows(conversations: Conversation[], classifiedIds: string[]) {
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
        date: agreement?.payment?.releasedAt || agreement?.completedAt || agreement?.startDate || conversation.mission?.startDate,
        remplacant: candidateName(conversation.application),
        mission: conversation.mission?.title || 'Mission MediLink',
        amount: releasedOrSecured ? amount : 0,
        currency: agreement?.currency || 'EUR',
        status: rowStatusFromAgreement(agreement),
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

  return medilinkRowMap.values() ? [...medilinkRowMap.values()] : [];
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
  if (row.agreement?.status === 'PAYMENT_RELEASED') return 'Facture disponible';
  return agreementNextStepRecruiter(row.agreement?.status);
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

function remainingActions(row: AccountingRow) {
  const actions = [];
  if (row.agreement?.status === 'PROPOSED') actions.push('Attendre la réponse du candidat à la proposition finale.');
  if (row.agreement?.status === 'PAYMENT_REQUIRED') actions.push("Procéder au règlement de la mission pour la confirmer.");
  if (row.agreement?.status === 'FUNDS_SECURED') actions.push('Attendre la réalisation de la mission pour valider la fin.');
  if (row.agreement?.status === 'COMPLETED') actions.push("Valider la fin de mission et libérer le paiement.");
  if (row.agreement?.status === 'PAYMENT_RELEASED' && !row.hasReceipt) actions.push('Télécharger la facture de la mission.');
  if (row.hasReceipt && !row.classified) actions.push('Marquer la facture comme classée.');
  return actions.length ? actions : ['Aucune action comptable urgente.'];
}

export default function RecruiterBillingMissionDetailPage() {
  const params = useParams<{ rowId: string }>();
  const rowId = decodeURIComponent(params.rowId);
  const { primary, loading: establishmentLoading } = useEstablishments();
  const cachedConversations = api.getSync<Conversation[]>('/conversations');
  const [conversations, setConversations] = useState<Conversation[]>(
    cachedConversations && primary ? cachedConversations.filter((c) => c.establishmentId === primary.id) : [],
  );
  const [classifiedIds, setClassifiedIds] = useState<string[]>([]);
  const [storageReady, setStorageReady] = useState(false);
  const [loading, setLoading] = useState(!cachedConversations);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function loadConversations(options: { reload?: boolean } = {}) {
    const data = options.reload
      ? await api.reload<Conversation[]>('/conversations')
      : await api.get<Conversation[]>('/conversations');
    setConversations(primary ? data.filter((c) => c.establishmentId === primary.id) : []);
  }

  useEffect(() => {
    setClassifiedIds(readClassifiedIds());
    setStorageReady(true);

    loadConversations()
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [primary]);

  useAutoRefresh(() => loadConversations({ reload: true }), { enabled: !establishmentLoading && !loading });

  useEffect(() => {
    if (storageReady) writeClassifiedIds(classifiedIds);
  }, [classifiedIds, storageReady]);

  const row = useMemo(() => buildMissionRows(conversations, classifiedIds).find((item) => item.id === rowId), [classifiedIds, conversations, rowId]);

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

  function toggleClassified(id: string) {
    setClassifiedIds((ids) => ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id]);
  }

  if (establishmentLoading || loading) return <LoadingCard />;

  if (!primary) {
    return (
      <>
        <PageHeader title="Mission comptable" description="Accédez aux détails de facturation pour vos recrutements." actions={<LinkButton href="/establishment/billing" variant="light">Retour</LinkButton>} />
        <EmptyState title="Établissement introuvable" description="Veuillez créer ou sélectionner un établissement actif." action={<LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton>} />
      </>
    );
  }

  if (!row) {
    return (
      <>
        <PageHeader title="Mission comptable" description="Cette mission n'est plus disponible dans vos conversations." actions={<LinkButton href="/establishment/billing" variant="light">Retour</LinkButton>} />
        {error ? <Alert type="error">{error}</Alert> : null}
        <EmptyState title="Mission introuvable" description="Revenez à Ma compta pour consulter les missions disponibles." action={<LinkButton href="/establishment/billing">Retour à Ma compta</LinkButton>} />
      </>
    );
  }

  const estimatedAmount = row.agreement?.amount && row.agreement.amount > 0
    ? formatMoney(row.agreement.amount, row.currency)
    : 'À renseigner';
  const validatedAmount = row.amount > 0 ? formatMoney(row.amount, row.currency) : 'Non validé';
  const feeAmount = platformFeeFromAgreement(row.agreement);
  const candidateAmount = row.agreement ? (row.agreement.candidateAmount || row.agreement.amount - feeAmount) : 0;
  const actions = remainingActions(row);

  return (
    <>
      <PageHeader
        title={row.mission}
        description={`${row.remplacant} · ${formatDate(row.date)}`}
        actions={<LinkButton href="/establishment/billing" variant="light">Retour à Ma compta</LinkButton>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="billing-detail-page">
        <Card className="billing-mission-detail">
          <div className="billing-detail-head">
            <div>
              <span>Mission comptable</span>
              <Badge tone={agreementTone(row.agreement?.status)}>{agreementLabelRecruiter(row.agreement?.status)}</Badge>
              <h2>{row.mission}</h2>
              <p>{row.remplacant}</p>
            </div>
          </div>

          <div className="billing-detail-grid">
            <div><span>Remplaçant</span><strong>{row.remplacant}</strong></div>
            <div><span>Date de mission</span><strong>{formatDate(row.date)}</strong></div>
            <div><span>Montant brut (HT)</span><strong>{estimatedAmount}</strong></div>
            <div><span>Montant réglé</span><strong>{validatedAmount}</strong></div>
            <div><span>Part Remplaçant</span><strong>{formatMoney(candidateAmount, row.currency)}</strong></div>
            <div><span>Frais MediLink</span><strong>{formatMoney(feeAmount, row.currency)}</strong></div>
            <div><span>Facture</span><strong>{row.hasReceipt ? 'Disponible' : 'Non disponible'}</strong></div>
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
            <h3>Notes & Conditions</h3>
            <p>{row.notes || row.agreement?.terms || 'Aucune note comptable spécifique pour cette mission.'}</p>
            <div className="actions">
              {row.conversationId ? <LinkButton href={`/establishment/messages?id=${row.conversationId}`} variant="light">Ouvrir l'échange</LinkButton> : null}
              {row.conversationId && row.hasReceipt ? (
                <Button variant="light" disabled={busyId === row.conversationId} onClick={() => void downloadRecruiterInvoice(row.conversationId!)}>
                  {busyId === row.conversationId ? 'Téléchargement...' : 'Télécharger la facture'}
                </Button>
              ) : null}
              {row.hasReceipt ? (
                <Button type="button" variant={row.classified ? 'secondary' : 'light'} onClick={() => toggleClassified(row.id)}>
                  {row.classified ? 'Classé' : 'Marquer classée'}
                </Button>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
