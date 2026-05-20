'use client';

import Link from 'next/link';
import type { Mission } from '@/lib/types';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabels, statusLabel } from '@/lib/labels';
import { MissionDeleteButton } from './MissionDeleteButton';
import { MissionShareActions } from './MissionShareActions';
import { Badge, Button, Card } from './ui';

export function MissionCard({
  mission,
  applyHref,
  onApply,
  canDelete,
  onDeleted,
}: {
  mission: Mission;
  applyHref?: string;
  onApply?: (mission: Mission) => void;
  canDelete?: boolean;
  onDeleted?: (missionId: string) => void;
}) {
  const detailHref = `/missions/${mission.id}`;

  return (
    <Card className="mission-card">
      <div className="mission-top">
        <div className="grid" style={{ gap: 10 }}>
          <div className="actions">
            <Badge>{missionTypeLabel(mission.missionType)}</Badge>
            <Badge tone="neutral">{requiredLevelLabels(mission.requiredLevels, mission.requiredLevel)}</Badge>
            <Badge tone={mission.status === 'PUBLISHED' ? 'success' : 'warning'}>{statusLabel(mission.status)}</Badge>
          </div>
          <h3>{mission.title}</h3>
        </div>
        <div className="mission-pay">
          <span className="small">Rémunération</span>
          <strong>{formatCompensation(mission)}</strong>
        </div>
      </div>

      <p>{mission.description || 'Aucune description pour cette mission.'}</p>

      <div className="mission-meta">
        <span>{mission.establishment?.name || 'Établissement'}</span>
        <span>-</span>
        <span>{mission.city}</span>
        <span>-</span>
        <span>{formatDate(mission.startDate)}</span>
        {mission.startTime ? (
          <>
            <span>-</span>
            <span>{mission.startTime}{mission.endTime ? ` - ${mission.endTime}` : ''}</span>
          </>
        ) : null}
      </div>

      {mission.tags?.length ? (
        <div className="tag-list">
          {mission.tags.map((tag) => <Badge key={tag.id} tone="neutral">#{tag.tag}</Badge>)}
        </div>
      ) : null}

      <div className="actions">
        {canDelete || mission.status === 'PUBLISHED' ? (
          <Link className="btn btn-light" href={detailHref}>Voir détail</Link>
        ) : null}
        {applyHref ? <Link className="btn btn-primary" href={applyHref}>Postuler</Link> : null}
        {onApply ? <Button onClick={() => onApply(mission)}>Postuler</Button> : null}
        {canDelete && mission.status === 'PUBLISHED' ? <MissionShareActions missionId={mission.id} showPublicLink={false} /> : null}
        {canDelete ? <MissionDeleteButton mission={mission} onDeleted={onDeleted} /> : null}
      </div>
    </Card>
  );
}
