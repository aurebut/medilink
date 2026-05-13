'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Document, Establishment, Mission, CurrentUser } from '@/lib/types';
import { Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

export default function AdminDashboardPage() {
  const [counts, setCounts] = useState({ users: 0, documents: 0, establishments: 0, missions: 0 });
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      api.get<CurrentUser[]>('/admin/users'),
      api.get<Document[]>('/admin/documents?status=PENDING_VERIFICATION'),
      api.get<Establishment[]>('/admin/establishments'),
      api.get<Mission[]>('/admin/missions'),
    ]).then(([u, d, e, m]) => setCounts({ users: u.length, documents: d.length, establishments: e.length, missions: m.length })).finally(() => setLoading(false));
  }, []);
  if (loading) return <LoadingCard />;
  return <><PageHeader title="Admin Médilink" description="Back-office minimal du MVP." />
    <div className="grid-3">
      <Card><div className="stat"><span>Utilisateurs</span><strong>{counts.users}</strong><LinkButton variant="secondary" href="/admin/users">Voir</LinkButton></div></Card>
      <Card><div className="stat"><span>Documents à vérifier</span><strong>{counts.documents}</strong><LinkButton variant="secondary" href="/admin/documents">Vérifier</LinkButton></div></Card>
      <Card><div className="stat"><span>Établissements</span><strong>{counts.establishments}</strong><LinkButton variant="secondary" href="/admin/establishments">Voir</LinkButton></div></Card>
      <Card><div className="stat"><span>Missions</span><strong>{counts.missions}</strong><LinkButton variant="secondary" href="/admin/missions">Voir</LinkButton></div></Card>
    </div>
  </>;
}
