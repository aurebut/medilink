'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Document, Establishment, Mission, CurrentUser } from '@/lib/types';
import { LinkButton, LoadingCard, PageHeader, StatCard } from '@/components/ui';

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({ users: 0, documents: 0, establishments: 0, missions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<CurrentUser[]>('/admin/users'),
      api.get<Document[]>('/admin/documents?status=PENDING_VERIFICATION'),
      api.get<Establishment[]>('/admin/establishments'),
      api.get<Mission[]>('/admin/missions'),
    ]).then(([u, d, e, m]) => {
      setCounts({ users: u.length, documents: d.length, establishments: e.length, missions: m.length });
    }).finally(() => setLoading(false));
  }, []);

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
