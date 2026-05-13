'use client';

import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Mission } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabel, statusLabel } from '@/lib/labels';
import { Alert, Badge, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [mission, setMission] = useState<Mission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Mission>(`/missions/${id}`)
      .then(setMission)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingCard />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!mission) return null;

  return (
    <>
      <PageHeader
        title={mission.title}
        description={`${mission.establishment?.name || 'Etablissement'} - ${mission.city}`}
        actions={<LinkButton href={`/app/missions/${mission.id}/apply`}>Postuler</LinkButton>}
      />
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="grid-2">
        <Card>
          <h2>Details</h2>
          <p>{mission.description || 'Aucune description.'}</p>
          <div className="tag-list">
            <Badge>{missionTypeLabel(mission.missionType)}</Badge>
            <Badge>{requiredLevelLabel(mission.requiredLevel)}</Badge>
            <Badge tone={mission.status === 'PUBLISHED' ? 'success' : 'warning'}>{statusLabel(mission.status)}</Badge>
            {mission.tags?.map((tag) => <Badge key={tag.id} tone="neutral">#{tag.tag}</Badge>)}
          </div>
        </Card>
        <Card className="card-highlight">
          <h2>Informations pratiques</h2>
          <p><strong>Date :</strong> {formatDate(mission.startDate)}</p>
          <p><strong>Horaire :</strong> {mission.startTime || '-'} {mission.endTime ? `- ${mission.endTime}` : ''}</p>
          <p><strong>Duree :</strong> {mission.durationHours || '-'} h</p>
          <p><strong>Remuneration :</strong> {formatMoney(mission.compensationAmount, mission.compensationCurrency)}</p>
          <p><strong>Localisation :</strong> {mission.location || mission.city}</p>
        </Card>
      </div>
      <div style={{ marginTop: 16 }}>
        <LinkButton variant="light" href="/app/search">Retour a la recherche</LinkButton>
      </div>
    </>
  );
}
