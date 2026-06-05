'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, getApiUrl, getAuthToken } from '@/lib/api';
import { agreementLabel, agreementNextStep, agreementTone, candidateAmountLabel, latestAgreement } from '@/lib/candidate-workspace';
import { formatDate, formatMoney } from '@/lib/format';
import type { Conversation } from '@/lib/types';
import { Alert, Badge, Button, Card, EmptyState, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

export default function CandidateBillingPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Conversation[]>('/conversations')
      .then(setConversations)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => conversations.map((conversation) => ({
    conversation,
    agreement: latestAgreement(conversation),
  })).filter((row) => row.agreement), [conversations]);

  const availableRows = rows.filter(({ agreement }) => agreement?.status === 'PAYMENT_RELEASED');
  const pendingRows = rows.filter(({ agreement }) => agreement && ['PROPOSED', 'PAYMENT_REQUIRED', 'FUNDS_SECURED', 'COMPLETED'].includes(agreement.status));
  const totalReleased = availableRows.reduce((sum, row) => sum + (row.agreement?.candidateAmount || 0), 0);

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

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader
        title="Facturation"
        description="Justificatifs, rétrocessions et suivi comptable des missions."
        actions={<LinkButton href="/app/messages" variant="light">Voir les accords</LinkButton>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="grid-3 dashboard-stat-grid">
        <Card className="stat-card"><div className="stat"><span>Justificatifs disponibles</span><strong>{availableRows.length}</strong><div className="small">Téléchargeables après validation.</div></div></Card>
        <Card className="stat-card"><div className="stat"><span>En cours</span><strong>{pendingRows.length}</strong><div className="small">Accords ou missions non finalisés.</div></div></Card>
        <Card className="stat-card"><div className="stat"><span>Total libéré</span><strong>{formatMoney(totalReleased)}</strong><div className="small">Montants fixes suivis par MediLink.</div></div></Card>
      </div>

      <Card className="dashboard-panel">
        <div className="toolbar">
          <div>
            <h2>Suivi comptable</h2>
            <p className="small">Les justificatifs candidat proviennent des accords de mission validés.</p>
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            title="Aucun élément comptable"
            description="Les propositions acceptées et missions terminées apparaîtront ici."
            action={<LinkButton href="/app/missions">Voir mes missions</LinkButton>}
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Mission</th>
                  <th>Statut</th>
                  <th>Montant</th>
                  <th>Date</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ conversation, agreement }) => (
                  <tr key={conversation.id}>
                    <td>
                      <strong>{conversation.mission?.title || 'Mission'}</strong>
                      <div className="small">{conversation.establishment?.name || conversation.mission?.city || 'Etablissement'}</div>
                    </td>
                    <td>
                      <Badge tone={agreementTone(agreement?.status)}>{agreementLabel(agreement?.status)}</Badge>
                      <div className="small">{agreementNextStep(agreement?.status)}</div>
                    </td>
                    <td>{candidateAmountLabel(agreement)}</td>
                    <td>{formatDate(agreement?.startDate || conversation.mission?.startDate)}</td>
                    <td className="actions">
                      {agreement?.status === 'PAYMENT_RELEASED' ? (
                        <Button variant="light" disabled={busyId === conversation.id} onClick={() => void downloadCandidateInvoice(conversation.id)}>
                          {busyId === conversation.id ? 'Téléchargement...' : 'Justificatif PDF'}
                        </Button>
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
    </>
  );
}
