'use client';

import { useEffect, useMemo, useState } from 'react';
import { EstablishmentMissionHistoryList } from '@/components/EstablishmentMissionHistoryList';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Alert, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { buildEstablishmentAgendaRows } from '@/lib/establishment-agenda';
import type { Application, Conversation, Mission } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';

export default function EstablishmentMissionHistoryPage() {
  const { primary, loading: establishmentsLoading } = useEstablishments();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadData(options: { silent?: boolean; reload?: boolean } = {}) {
    if (establishmentsLoading) return;
    if (!primary) {
      setMissions([]);
      setApplications([]);
      setConversations([]);
      if (!options.silent) setLoading(false);
      return;
    }

    const missionsPath = `/missions/mine?establishmentId=${primary.id}`;
    const applicationsPath = `/establishment/applications?establishmentId=${primary.id}`;
    if (!options.silent) {
      const cachedMissions = options.reload ? null : api.getSync<Mission[]>(missionsPath);
      const cachedApplications = options.reload ? null : api.getSync<Application[]>(applicationsPath);
      const cachedConversations = options.reload ? null : api.getSync<Conversation[]>('/conversations');
      if (cachedMissions && cachedApplications && cachedConversations) {
        setMissions(cachedMissions);
        setApplications(cachedApplications);
        setConversations(cachedConversations);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }
    setError(null);
    try {
      const read = options.reload ? api.reload : api.get;
      const [m, a, c] = await Promise.all([
        read<Mission[]>(missionsPath),
        read<Application[]>(applicationsPath),
        read<Conversation[]>('/conversations'),
      ]);
      setMissions(m);
      setApplications(a);
      setConversations(c);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [establishmentsLoading, primary]);

  useAutoRefresh(() => loadData({ silent: true, reload: true }), { enabled: !establishmentsLoading && !loading });

  const rows = useMemo(
    () => buildEstablishmentAgendaRows(missions, applications, conversations),
    [missions, applications, conversations],
  );

  if (establishmentsLoading || loading) return <LoadingCard label="Chargement des missions..." />;

  return (
    <>
      <PageHeader
        title="Historique des missions"
        description="Toutes les missions publiées, pourvues et confirmées de votre établissement."
        actions={<LinkButton href="/establishment/agenda" variant="light">Retour agenda</LinkButton>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      {!primary ? (
        <Card className="card-highlight">
          <h2>Aucun établissement rattaché</h2>
          <p>Créez votre fiche établissement pour publier des missions puis les suivre ici.</p>
          <LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton>
        </Card>
      ) : (
        <EstablishmentMissionHistoryList rows={rows} />
      )}
    </>
  );
}
