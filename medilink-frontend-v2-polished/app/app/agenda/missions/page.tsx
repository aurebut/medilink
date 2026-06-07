'use client';

import { useEffect, useMemo, useState } from 'react';
import { CandidateMissionHistoryList } from '@/components/CandidateMissionHistoryList';
import { api } from '@/lib/api';
import { buildCandidateMissionHistoryRows } from '@/lib/candidate-mission-history';
import type { Application, Conversation } from '@/lib/types';
import { LinkButton, LoadingCard, PageHeader } from '@/components/ui';

export default function CandidateMissionHistoryPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Application[]>('/me/applications'),
      api.get<Conversation[]>('/conversations'),
    ]).then(([a, c]) => {
      setApplications(a);
      setConversations(c);
    }).finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => buildCandidateMissionHistoryRows(applications, conversations), [applications, conversations]);

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader
        title="Historique des missions"
        description="Toutes vos propositions, missions acceptees et fins de mission."
        actions={<LinkButton href="/app/agenda" variant="light">Retour agenda</LinkButton>}
      />

      <CandidateMissionHistoryList rows={rows} />
    </>
  );
}
