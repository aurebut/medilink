'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Mission, Paginated } from '@/lib/types';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { MissionCard } from '@/components/MissionCard';
import { Alert, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

export default function EstablishmentMissionsPage() {
  const { primary, loading } = useEstablishments();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!primary) return;
    api.get<Paginated<Mission>>('/missions?limit=100')
      .then((r) => setMissions(r.items.filter((m) => m.establishmentId === primary.id)))
      .catch((e) => setError(e.message));
  }, [primary]);

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader
        title="Missions"
        description="Missions publiées visibles publiquement pour ton établissement."
        actions={<LinkButton href="/establishment/missions/new">Créer mission</LinkButton>}
      />
      {error ? <Alert type="error">{error}</Alert> : null}
      {!primary ? (
        <Card><p>Crée d’abord un établissement.</p></Card>
      ) : missions.length === 0 ? (
        <Card>
          <h2>Aucune mission publiée visible</h2>
          <p>Les brouillons nécessitent un endpoint backend dédié pour être listés ici. Pour tester la recherche, publie la mission immédiatement.</p>
          <LinkButton href="/establishment/missions/new">Créer une mission</LinkButton>
        </Card>
      ) : (
        <div className="grid">{missions.map((m) => <MissionCard key={m.id} mission={m} />)}</div>
      )}
    </>
  );
}
