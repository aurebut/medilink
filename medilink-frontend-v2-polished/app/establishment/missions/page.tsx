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
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadMissions() {
    if (!primary) return;

    setMissionsLoading(true);
    try {
      setError(null);
      setMissions(await api.get<Mission[]>(`/missions/mine?establishmentId=${primary.id}`));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMissionsLoading(false);
    }
  }

  useEffect(() => { void loadMissions(); }, [primary]);

  if (loading || (primary && missionsLoading)) return <LoadingCard label="Chargement des missions..." />;

  return (
    <>
      <PageHeader
        title="Missions"
        description="Toutes les missions de votre établissement, publiées ou en brouillon."
        actions={
          primary ? (
            <LinkButton href="/establishment/missions/new">Créer mission</LinkButton>
          ) : (
            <LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton>
          )
        }
      />
      {error ? <Alert type="error">{error}</Alert> : null}
      {!primary ? (
        <Card className="card-highlight">
          <h2>Aucun établissement rattaché</h2>
          <p>Créez d'abord un établissement pour pouvoir publier une mission et pré-remplir les informations de lieu.</p>
          <LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton>
        </Card>
      ) : missions.length === 0 ? (
        <Card>
          <h2>Aucune mission</h2>
          <p>Créez une mission pour la publier, la partager ou la gérer depuis cet espace.</p>
          <LinkButton href="/establishment/missions/new">Créer une mission</LinkButton>
        </Card>
      ) : (
        <div className="grid mission-list">
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
