import { agreementLabel, agreementNextStep, agreementTone, candidateAmountLabel } from '@/lib/candidate-workspace';
import { applicationTone, type CandidateMissionHistoryRow } from '@/lib/candidate-mission-history';
import { formatDate } from '@/lib/format';
import { statusLabel } from '@/lib/labels';
import { getCandidateBillingMissionPath, getCandidateConversationPath } from '@/lib/mission-links';
import { Badge, Card, EmptyState, LinkButton } from './ui';

function MissionHistoryActionIcon({ type }: { type: 'message' | 'mission' | 'billing' }) {
  if (type === 'message') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M21 12a8 8 0 0 1-8 8H6l-3 2 1.2-4A8 8 0 1 1 21 12Z" />
        <path d="M8 11h8M8 14h5" />
      </svg>
    );
  }

  if (type === 'mission') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M8 4h8l3 3v13H5V4h3Z" />
        <path d="M15 4v4h4M8 12h8M8 16h6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M4 7h16v12H4z" />
      <path d="M7 7V5h10v2M8 12h8M8 16h5" />
    </svg>
  );
}

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

          <div className="actions application-icon-actions">
            {conversation ? (
              <LinkButton
                href={getCandidateConversationPath(conversation.id)}
                variant="light"
                className="application-icon-action"
                aria-label={`Ouvrir la discussion pour ${application.mission?.title || 'cette mission'}`}
                title="Discussion"
              >
                <MissionHistoryActionIcon type="message" />
                <span className="sr-only">Ouvrir la discussion</span>
              </LinkButton>
            ) : null}
            {application.missionId ? (
              <LinkButton
                href={`/app/missions/${application.missionId}`}
                variant="secondary"
                className="application-icon-action application-icon-action-primary"
                aria-label={`Voir le détail de ${application.mission?.title || 'cette mission'}`}
                title="Détail mission"
              >
                <MissionHistoryActionIcon type="mission" />
                <span className="sr-only">Détail mission</span>
              </LinkButton>
            ) : null}
            <LinkButton
              href={getCandidateBillingMissionPath(conversation, agreement)}
              variant="light"
              className="application-icon-action"
              aria-label={`Ouvrir la compta pour ${application.mission?.title || 'cette mission'}`}
              title="Ma compta"
            >
              <MissionHistoryActionIcon type="billing" />
              <span className="sr-only">Ma compta</span>
            </LinkButton>
          </div>
        </Card>
      ))}
    </div>
  );
}
