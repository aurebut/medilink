'use client';

import { useEffect, useMemo, useState } from 'react';
import { EstablishmentMissionHistoryList } from '@/components/EstablishmentMissionHistoryList';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Alert, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { buildEstablishmentAgendaRows } from '@/lib/establishment-agenda';
import type { Application, Conversation, Mission } from '@/lib/types';

export default function EstablishmentMissionHistoryPage() {
  const { primary, loading: establishmentsLoading } = useEstablishments();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (establishmentsLoading) return;
    if (!primary) {
      setMissions([]);
      setApplications([]);
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    Promise.all([
      api.get<Mission[]>(`/missions/mine?establishmentId=${primary.id}`),
      api.get<Application[]>(`/establishment/applications?establishmentId=${primary.id}`),
      api.get<Conversation[]>('/conversations'),
    ])
      .then(([m, a, c]) => {
        setMissions(m);
        setApplications(a);
        setConversations(c);
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [establishmentsLoading, primary]);

  const rows = useMemo(
    () => buildEstablishmentAgendaRows(missions, applications, conversations),
    [missions, applications, conversations],
  );

  if (establishmentsLoading || loading) return <LoadingCard label="Chargement des missions..." />;

  return (
    <>
      <PageHeader
        title="Historique des missions"
        description="Toutes les missions publiees, pourvues et confirmees de votre etablissement."
        actions={<LinkButton href="/establishment/agenda" variant="light">Retour agenda</LinkButton>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      {!primary ? (
        <Card className="card-highlight">
          <h2>Aucun etablissement rattache</h2>
          <p>Creez votre fiche etablissement pour publier des missions puis les suivre ici.</p>
          <LinkButton href="/establishment/onboarding">Creer mon etablissement</LinkButton>
        </Card>
      ) : (
        <EstablishmentMissionHistoryList rows={rows} />
      )}
    </>
  );
}
