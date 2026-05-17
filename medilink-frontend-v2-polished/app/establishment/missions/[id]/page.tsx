'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Mission } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabel, statusLabel } from '@/lib/labels';
import { MissionDeleteButton } from '@/components/MissionDeleteButton';
import { MissionShareActions } from '@/components/MissionShareActions';
import { Alert, Badge, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

export default function EstablishmentMissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<Mission>(`/missions/mine/${id}`)
      .then(setMission)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingCard label="Chargement de la mission..." />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!mission) return null;

  return (
    <>
      <PageHeader
        title={mission.title}
        description={`${mission.establishment?.name || 'Etablissement'} - ${mission.city}`}
        actions={
          <>
            <LinkButton variant="light" href="/establishment/missions">Retour</LinkButton>
            <MissionDeleteButton
              mission={mission}
              onDeleted={() => router.push('/establishment/missions')}
            />
          </>
        }
      />

      <div className="grid-2">
        <Card>
          <h2>Details</h2>
          <p>{mission.description || 'Aucune description.'}</p>
          <div className="tag-list">
            <Badge>{missionTypeLabel(mission.missionType)}</Badge>
            <Badge tone="neutral">{requiredLevelLabel(mission.requiredLevel)}</Badge>
            <Badge tone={mission.status === 'PUBLISHED' ? 'success' : 'warning'}>{statusLabel(mission.status)}</Badge>
            {mission.tags?.map((tag) => <Badge key={tag.id} tone="neutral">#{tag.tag}</Badge>)}
          </div>
        </Card>

        <Card className="card-highlight">
          <h2>Informations pratiques</h2>
          <div className="info-list">
            <div><span>Date</span><strong>{formatDate(mission.startDate)}</strong></div>
            <div><span>Horaire</span><strong>{mission.startTime || '-'} {mission.endTime ? `- ${mission.endTime}` : ''}</strong></div>
            <div><span>Duree</span><strong>{mission.durationHours || '-'} h</strong></div>
            <div><span>Remuneration</span><strong>{formatMoney(mission.compensationAmount, mission.compensationCurrency)}</strong></div>
            <div><span>Localisation</span><strong>{mission.location || mission.city}</strong></div>
          </div>
        </Card>
      </div>

      {mission.status === 'PUBLISHED' ? (
        <div style={{ marginTop: 16 }}>
          <Card>
            <h2>Partage</h2>
            <p>Copie le lien public pour l'envoyer a un candidat ou le publier dans un message.</p>
            <MissionShareActions missionId={mission.id} showUrl />
          </Card>
        </div>
      ) : null}
    </>
  );
}
