'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Mission } from '@/lib/types';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { MissionCard } from '@/components/MissionCard';
import { Alert, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

export default function EstablishmentMissionsPage() {
  const { primary, loading } = useEstablishments();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadMissions() {
    if (!primary) return;

    try {
      setError(null);
      setMissions(await api.get<Mission[]>(`/missions/mine?establishmentId=${primary.id}`));
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { void loadMissions(); }, [primary]);

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader
        title="Missions"
        description="Toutes les missions de ton etablissement, publiees ou en brouillon."
        actions={<LinkButton href="/establishment/missions/new">Creer mission</LinkButton>}
      />
      {error ? <Alert type="error">{error}</Alert> : null}
      {!primary ? (
        <Card><p>Cree d'abord un etablissement.</p></Card>
      ) : missions.length === 0 ? (
        <Card>
          <h2>Aucune mission</h2>
          <p>Cree une mission pour la publier, la partager ou la gerer depuis cet espace.</p>
          <LinkButton href="/establishment/missions/new">Creer une mission</LinkButton>
        </Card>
      ) : (
        <div className="grid">
          {missions.map((m) => (
            <MissionCard
              key={m.id}
              mission={m}
              canDelete
              onDeleted={() => setMissions((current) => current.filter((mission) => mission.id !== m.id))}
            />
          ))}
        </div>
      )}
    </>
  );
}
