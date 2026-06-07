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
        title="Aucune mission validee dans l'agenda"
        description="Publiez une mission pour la retrouver dans le calendrier et suivre les candidatures."
        action={<LinkButton href="/establishment/missions/new">Creer une mission</LinkButton>}
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
                {candidateName(row.selectedApplication) || row.mission.establishment?.name || row.mission.city || 'Candidat a confirmer'}
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
            <div><span>Prochaine etape</span><strong>{establishmentMissionNextStep(row)}</strong></div>
          </div>

          <div className="actions">
            {row.conversation ? <LinkButton href={getEstablishmentConversationPath(row.conversation.id)} variant="light">Ouvrir la discussion</LinkButton> : null}
            <LinkButton href={`/establishment/missions/${row.mission.id}`} variant="secondary">Detail mission</LinkButton>
            <LinkButton href={getEstablishmentBillingMissionPath(row.conversation, row.agreement)} variant="light">Ma compta</LinkButton>
          </div>
        </Card>
      ))}
    </div>
  );
}
