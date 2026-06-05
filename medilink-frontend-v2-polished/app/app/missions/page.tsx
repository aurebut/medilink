'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { agreementLabel, agreementNextStep, agreementTone, candidateAmountLabel, conversationForApplication, latestAgreement, missionDateValue } from '@/lib/candidate-workspace';
import { formatDate } from '@/lib/format';
import { statusLabel } from '@/lib/labels';
import type { Application, Conversation } from '@/lib/types';
import { Badge, Card, EmptyState, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

function applicationTone(status: string): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED' || status === 'WITHDRAWN' || status === 'CANCELLED') return 'danger';
  if (status === 'VIEWED') return 'warning';
  return 'neutral';
}

export default function CandidateMissionsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Application[]>('/me/applications'),
      api.get<Conversation[]>('/conversations'),
    ]).then(([a, c]) => {
      setApplications(a);
      setConversations(c);
    }).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => applications.map((application) => {
    const conversation = conversationForApplication(application, conversations);
    const agreement = latestAgreement(conversation);

    return {
      application,
      conversation,
      agreement,
      date: missionDateValue(application, agreement),
    };
  }).sort((a, b) => new Date(b.application.updatedAt || b.application.createdAt).getTime() - new Date(a.application.updatedAt || a.application.createdAt).getTime()), [applications, conversations]);

  const activeRows = rows.filter(({ application }) => !['REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(application.status));
  const acceptedRows = rows.filter(({ application }) => application.status === 'ACCEPTED');
  const completedRows = rows.filter(({ agreement }) => ['COMPLETED', 'PAYMENT_RELEASED'].includes(agreement?.status || ''));

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader
        title="Missions"
        description="Suivi centralisé des candidatures, propositions, missions acceptées et fins de mission."
        actions={<LinkButton href="/app/search">Trouver une mission</LinkButton>}
      />

      <div className="grid-3 dashboard-stat-grid">
        <Card className="stat-card"><div className="stat"><span>Actives</span><strong>{activeRows.length}</strong><div className="small">Candidatures et accords non clos.</div></div></Card>
        <Card className="stat-card"><div className="stat"><span>Acceptées</span><strong>{acceptedRows.length}</strong><div className="small">Missions validées ou confirmées.</div></div></Card>
        <Card className="stat-card"><div className="stat"><span>Terminées</span><strong>{completedRows.length}</strong><div className="small">Prêtes pour suivi comptable.</div></div></Card>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune mission suivie"
          description="Envoyez une candidature pour démarrer un suivi de mission."
          action={<LinkButton href="/app/search">Chercher une mission</LinkButton>}
        />
      ) : (
        <div className="workspace-list">
          {rows.map(({ application, conversation, agreement, date }) => (
            <Card key={application.id} className="mission-card workspace-mission-card">
              <div className="workspace-card-head">
                <div>
                  <h3>{application.mission?.title || 'Mission'}</h3>
                  <p className="small">{application.mission?.establishment?.name || application.mission?.city || 'Etablissement à confirmer'}</p>
                </div>
                <div className="workspace-badges">
                  <Badge tone={applicationTone(application.status)}>{statusLabel(application.status)}</Badge>
                  {agreement ? <Badge tone={agreementTone(agreement.status)}>{agreementLabel(agreement.status)}</Badge> : null}
                </div>
              </div>

              <div className="workspace-metrics">
                <div><span>Date</span><strong>{formatDate(date)}</strong></div>
                <div><span>Ville</span><strong>{application.mission?.city || '-'}</strong></div>
                <div><span>Rémunération</span><strong>{candidateAmountLabel(agreement)}</strong></div>
                <div><span>Prochaine étape</span><strong>{agreementNextStep(agreement?.status)}</strong></div>
              </div>

              <div className="actions">
                {conversation ? <LinkButton href="/app/messages" variant="light">Ouvrir la discussion</LinkButton> : null}
                {application.missionId ? <LinkButton href={`/app/missions/${application.missionId}`} variant="secondary">Détail mission</LinkButton> : null}
                <LinkButton href="/app/billing" variant="light">Facturation</LinkButton>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
