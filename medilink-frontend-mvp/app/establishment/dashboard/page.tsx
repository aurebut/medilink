'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Application } from '@/lib/types';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

export default function EstablishmentDashboardPage() {
  const { primary, loading } = useEstablishments();
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (!primary) return;
    api.get<Application[]>(`/establishment/applications?establishmentId=${primary.id}`).then(setApplications).catch(() => setApplications([]));
  }, [primary]);

  if (loading) return <LoadingCard />;
  if (!primary) return <><PageHeader title="Dashboard établissement" description="Commence par créer ton établissement." /><Card><p>Aucun établissement rattaché à ton compte.</p><LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton></Card></>;

  return <>
    <PageHeader title={primary.name} description="Vue d’ensemble de l’espace établissement." actions={<LinkButton href="/establishment/missions/new">Créer une mission</LinkButton>} />
    <div className="grid-3">
      <Card><div className="stat"><span>Statut établissement</span><strong style={{ fontSize: 22 }}>{primary.verificationStatus}</strong></div></Card>
      <Card><div className="stat"><span>Candidatures reçues</span><strong>{applications.length}</strong><LinkButton variant="secondary" href="/establishment/applications">Voir</LinkButton></div></Card>
      <Card><div className="stat"><span>Membres</span><strong>{primary.members?.length || 1}</strong></div></Card>
    </div>
  </>;
}
