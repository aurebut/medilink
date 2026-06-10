'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Document, Establishment, Mission, CurrentUser } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { LinkButton, LoadingCard, PageHeader, StatCard } from '@/components/ui';

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({ users: 0, documents: 0, establishments: 0, missions: 0 });
  const [loading, setLoading] = useState(true);

  async function load(options: { reload?: boolean } = {}) {
    const read = options.reload ? api.reload : api.get;
    const [u, d, e, m] = await Promise.all([
      read<CurrentUser[]>('/admin/users'),
      read<Document[]>('/admin/documents?status=PENDING_VERIFICATION'),
      read<Establishment[]>('/admin/establishments'),
      read<Mission[]>('/admin/missions'),
    ]);
    setCounts({ users: u.length, documents: d.length, establishments: e.length, missions: m.length });
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  useAutoRefresh(() => load({ reload: true }), { enabled: !loading });

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader title="Admin Médilink" description="Back-office minimal du MVP." />
      <div className="grid-3">
        <StatCard label="Utilisateurs" value={counts.users} action={<LinkButton variant="secondary" href="/admin/users">Voir</LinkButton>} />
        <StatCard label="Documents à vérifier" value={counts.documents} action={<LinkButton variant="secondary" href="/admin/documents">Vérifier</LinkButton>} />
        <StatCard label="Établissements" value={counts.establishments} action={<LinkButton variant="secondary" href="/admin/establishments">Voir</LinkButton>} />
        <StatCard label="Missions" value={counts.missions} action={<LinkButton variant="secondary" href="/admin/missions">Voir</LinkButton>} />
      </div>
    </>
  );
}
