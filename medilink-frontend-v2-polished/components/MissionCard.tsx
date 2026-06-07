'use client';

import Link from 'next/link';
import type { Mission } from '@/lib/types';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabels, statusLabel } from '@/lib/labels';
import { MissionDeleteButton } from './MissionDeleteButton';
import { MissionShareActions } from './MissionShareActions';
import { Badge, Button, Card } from './ui';

function sectorLabel(value?: string | null) {
  const labels: Record<string, string> = {
    SECTEUR_1: 'Secteur 1',
    SECTEUR_2: 'Secteur 2',
    SECTEUR_3: 'Secteur 3',
  };
  return value ? labels[value] || value : null;
}

export function MissionCard({
  mission,
  applyHref,
  detailHref,
  onApply,
  canDelete,
  onDeleted,
}: {
  mission: Mission;
  applyHref?: string;
  detailHref?: string;
  onApply?: (mission: Mission) => void;
  canDelete?: boolean;
  onDeleted?: (missionId: string) => void;
}) {
  const missionDetailHref = detailHref || `/missions/${mission.id}`;
  const establishmentPhoto = mission.establishment?.photos?.[0]?.url;

  return (
    <Card className="mission-card">
      {establishmentPhoto ? (
        <Link className="mission-card-image" href={missionDetailHref} aria-label={`Voir ${mission.title}`}>
          <img src={establishmentPhoto} alt={mission.establishment?.name || 'Établissement'} />
        </Link>
      ) : null}
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
        {mission.sector ? (
          <>
            <span>-</span>
            <span>{sectorLabel(mission.sector)}</span>
          </>
        ) : null}
        <span>-</span>
        <span>{formatDate(mission.startDate)}</span>
        {mission.startTime ? (
          <>
            <span>-</span>
            <span>{mission.startTime}{mission.endTime ? ` - ${mission.endTime}` : ''}</span>
          </>
        ) : null}
      </div>

      {mission.tags?.length || mission.patientType || mission.softwareUsed || mission.hasSecretary != null ? (
        <div className="tag-list">
          {mission.patientType ? <Badge tone="neutral">{mission.patientType}</Badge> : null}
          {mission.softwareUsed ? <Badge tone="neutral">{mission.softwareUsed}</Badge> : null}
          {mission.hasSecretary != null ? <Badge tone="neutral">Secrétaire : {mission.hasSecretary ? 'oui' : 'non'}</Badge> : null}
          {mission.tags?.map((tag) => <Badge key={tag.id} tone="neutral">#{tag.tag}</Badge>)}
        </div>
      ) : null}

      <div className="actions">
        {canDelete || mission.status === 'PUBLISHED' ? (
          <Link className="btn btn-light" href={missionDetailHref}>Voir détail</Link>
        ) : null}
        {applyHref ? <Link className="btn btn-primary" href={applyHref}>Postuler</Link> : null}
        {onApply ? <Button onClick={() => onApply(mission)}>Postuler</Button> : null}
        {canDelete && mission.status === 'PUBLISHED' ? <MissionShareActions missionId={mission.id} showPublicLink={false} /> : null}
        {canDelete ? <MissionDeleteButton mission={mission} onDeleted={onDeleted} /> : null}
      </div>
    </Card>
  );
}
