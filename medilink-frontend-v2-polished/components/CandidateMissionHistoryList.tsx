import { agreementLabel, agreementNextStep, agreementTone, candidateAmountLabel } from '@/lib/candidate-workspace';
import { applicationTone, type CandidateMissionHistoryRow } from '@/lib/candidate-mission-history';
import { formatDate } from '@/lib/format';
import { statusLabel } from '@/lib/labels';
import { getCandidateBillingMissionPath, getCandidateConversationPath } from '@/lib/mission-links';
import { Badge, Card, EmptyState, LinkButton } from './ui';

export function CandidateMissionHistoryList({
  rows,
  limit,
}: {
  rows: CandidateMissionHistoryRow[];
  limit?: number;
}) {
  const visibleRows = typeof limit === 'number' ? rows.slice(0, limit) : rows;

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Aucune mission dans l'historique"
        description="Envoyez une candidature pour démarrer un suivi de mission."
        action={<LinkButton href="/app/search">Chercher une mission</LinkButton>}
      />
    );
  }

  return (
    <div className="workspace-list">
      {visibleRows.map(({ application, conversation, agreement, date }) => (
        <Card key={application.id} className="mission-card workspace-mission-card">
          <div className="workspace-card-head">
            <div>
              <h3>{application.mission?.title || 'Mission'}</h3>
              <p className="small">{application.mission?.establishment?.name || application.mission?.city || 'Établissement à confirmer'}</p>
            </div>
            <div className="workspace-badges">
              <Badge tone={applicationTone(application.status)}>{statusLabel(application.status)}</Badge>
              {agreement ? <Badge tone={agreementTone(agreement.status)}>{agreementLabel(agreement.status)}</Badge> : null}
            </div>
          </div>

          <div className="workspace-metrics">
            <div><span>Date</span><strong>{formatDate(date)}</strong></div>
            <div><span>Ville</span><strong>{application.mission?.city || '-'}</strong></div>
            <div><span>Remuneration</span><strong>{candidateAmountLabel(agreement)}</strong></div>
            <div><span>Prochaine étape</span><strong>{agreementNextStep(agreement?.status)}</strong></div>
          </div>

          <div className="actions">
            {conversation ? <LinkButton href={getCandidateConversationPath(conversation.id)} variant="light">Ouvrir la discussion</LinkButton> : null}
            {application.missionId ? <LinkButton href={`/app/missions/${application.missionId}`} variant="secondary">Détail mission</LinkButton> : null}
            <LinkButton href={getCandidateBillingMissionPath(conversation, agreement)} variant="light">Ma compta</LinkButton>
          </div>
        </Card>
      ))}
    </div>
  );
}
