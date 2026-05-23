'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Application } from '@/lib/types';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Card, LinkButton, LoadingCard, PageHeader, StatCard } from '@/components/ui';
import { statusLabel } from '@/lib/labels';

export default function EstablishmentDashboardPage() {
  const { primary, loading } = useEstablishments();
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    if (!primary) return;
    api.get<Application[]>(`/establishment/applications?establishmentId=${primary.id}`).then(setApplications).catch(() => setApplications([]));
  }, [primary]);

  if (loading) return <LoadingCard />;

  if (!primary) {
    return (
      <>
        <PageHeader title="Dashboard établissement" description="Commencez par créer votre établissement pour publier des missions." />
        <Card className="card-highlight">
          <h2>Aucun établissement rattaché</h2>
          <p>Créez une fiche établissement pour publier des missions et recevoir des candidatures.</p>
          <LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton>
        </Card>
      </>
    );
  }

  const accepted = applications.filter((a) => a.status === 'ACCEPTED').length;
  const pending = applications.filter((a) => a.status === 'SUBMITTED' || a.status === 'VIEWED').length;

  return (
    <>
      <PageHeader
        title={primary.name}
        description="Vue d’ensemble de l’activité recrutement de votre établissement."
        actions={<LinkButton href="/establishment/missions/new">Créer une mission</LinkButton>}
      />

      <div className="grid-3">
        <StatCard label="Statut établissement" value={statusLabel(primary.verificationStatus)} helper={primary.city || 'Ville non renseignée'} />
        <StatCard label="Candidatures reçues" value={applications.length} helper={`${pending} en attente · ${accepted} acceptée(s)`} action={<LinkButton variant="secondary" href="/establishment/applications">Voir</LinkButton>} />
        <StatCard label="Membres" value={primary.members?.length || 1} helper="Équipe rattachée au compte" />
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <Card>
          <h2>Actions rapides</h2>
          <p>Créez une mission, consultez les candidatures et répondez aux messages depuis l’espace établissement.</p>
          <div className="actions">
            <LinkButton href="/establishment/missions/new">Nouvelle mission</LinkButton>
            <LinkButton variant="light" href="/establishment/messages">Messagerie</LinkButton>
          </div>
        </Card>
        <Card>
          <h2>Dernières candidatures</h2>
          {applications.slice(0, 4).map((a) => (
            <p key={a.id}>
              <strong>{a.candidate?.profile?.firstName} {a.candidate?.profile?.lastName}</strong>
              <br />
              <span className="small">{a.mission?.title} · {statusLabel(a.status)}</span>
            </p>
          ))}
          {applications.length === 0 ? <p>Aucune candidature reçue.</p> : null}
        </Card>
      </div>
    </>
  );
}
