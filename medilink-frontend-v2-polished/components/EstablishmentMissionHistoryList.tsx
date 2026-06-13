import {
  candidateName,
  establishmentMissionLabel,
  establishmentMissionNextStep,
  establishmentMissionTone,
  type EstablishmentAgendaRow,
} from '@/lib/establishment-agenda';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, statusLabel } from '@/lib/labels';
import { getEstablishmentBillingMissionPath, getEstablishmentConversationPath } from '@/lib/mission-links';
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

export function EstablishmentMissionHistoryList({
  rows,
  limit,
}: {
  rows: EstablishmentAgendaRow[];
  limit?: number;
}) {
  const visibleRows = typeof limit === 'number' ? rows.slice(0, limit) : rows;

  if (rows.length === 0) {
    return (
      <EmptyState
        title="Aucune mission validée dans l'agenda"
        description="Publiez une mission pour la retrouver dans le calendrier et suivre les candidatures."
        action={<LinkButton href="/establishment/missions/new">Créer une mission</LinkButton>}
      />
    );
  }

  return (
    <div className="workspace-list">
      {visibleRows.map((row) => (
        <Card key={row.mission.id} className="mission-card workspace-mission-card">
          <div className="workspace-card-head">
            <div>
              <h3>{row.mission.title}</h3>
              <p className="small">
                {candidateName(row.selectedApplication) || row.mission.establishment?.name || row.mission.city || 'Candidat à confirmer'}
              </p>
            </div>
            <div className="workspace-badges">
              <Badge tone={row.mission.status === 'FILLED' ? 'success' : 'neutral'}>{statusLabel(row.mission.status)}</Badge>
              <Badge tone={establishmentMissionTone(row)}>{establishmentMissionLabel(row)}</Badge>
            </div>
          </div>

          <div className="workspace-metrics">
            <div><span>Date</span><strong>{formatDate(row.date)}</strong></div>
            <div><span>Ville</span><strong>{row.mission.city || '-'}</strong></div>
            <div><span>Mission</span><strong>{missionTypeLabel(row.mission.missionType)}</strong></div>
            <div><span>Remuneration</span><strong>{formatCompensation(row.agreement || row.mission)}</strong></div>
            <div><span>Prochaine étape</span><strong>{establishmentMissionNextStep(row)}</strong></div>
          </div>

          <div className="actions application-icon-actions">
            {row.conversation ? (
              <LinkButton
                href={getEstablishmentConversationPath(row.conversation.id)}
                variant="light"
                className="application-icon-action"
                aria-label={`Ouvrir la discussion pour ${row.mission.title}`}
                title="Discussion"
              >
                <MissionHistoryActionIcon type="message" />
                <span className="sr-only">Ouvrir la discussion</span>
              </LinkButton>
            ) : null}
            <LinkButton
              href={`/establishment/missions/${row.mission.id}`}
              variant="secondary"
              className="application-icon-action application-icon-action-primary"
              aria-label={`Voir le détail de ${row.mission.title}`}
              title="Détail mission"
            >
              <MissionHistoryActionIcon type="mission" />
              <span className="sr-only">Détail mission</span>
            </LinkButton>
            <LinkButton
              href={getEstablishmentBillingMissionPath(row.conversation, row.agreement)}
              variant="light"
              className="application-icon-action"
              aria-label={`Ouvrir la compta pour ${row.mission.title}`}
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
