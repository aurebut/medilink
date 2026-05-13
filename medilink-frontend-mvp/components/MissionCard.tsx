'use client';

import Link from 'next/link';
import type { Mission } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabel, statusLabel } from '@/lib/labels';
import { Badge, Button, Card } from './ui';

export function MissionCard({ mission, onApply }: { mission: Mission; onApply?: (mission: Mission) => void }) {
  return (
    <Card className="mission-card">
      <div className="actions">
        <Badge>{missionTypeLabel(mission.missionType)}</Badge>
        <Badge tone="neutral">{requiredLevelLabel(mission.requiredLevel)}</Badge>
        <Badge tone={mission.status === 'PUBLISHED' ? 'success' : 'warning'}>{statusLabel(mission.status)}</Badge>
      </div>
      <h3>{mission.title}</h3>
      <p>{mission.description || 'Aucune description pour cette mission.'}</p>
      <div className="mission-meta">
        <span>{mission.establishment?.name || 'Établissement'}</span>
        <span>•</span>
        <span>{mission.city}</span>
        <span>•</span>
        <span>{formatDate(mission.startDate)}</span>
        {mission.startTime ? <><span>•</span><span>{mission.startTime}{mission.endTime ? ` - ${mission.endTime}` : ''}</span></> : null}
        <span>•</span>
        <span>{formatMoney(mission.compensationAmount, mission.compensationCurrency)}</span>
      </div>
      <div className="tag-list">{mission.tags?.map((tag) => <Badge key={tag.id} tone="neutral">#{tag.tag}</Badge>)}</div>
      <div className="actions">
        <Link className="btn btn-light" href={`/app/missions/${mission.id}`}>Voir détail</Link>
        {onApply ? <Button onClick={() => onApply(mission)}>Postuler</Button> : null}
      </div>
    </Card>
  );
}
