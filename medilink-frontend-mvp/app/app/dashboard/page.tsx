'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Application, Document, Notification, Profile } from '@/lib/types';
import { Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

export default function CandidateDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Profile>('/me/profile'),
      api.get<Document[]>('/me/documents'),
      api.get<Application[]>('/me/applications'),
      api.get<Notification[]>('/notifications'),
    ]).then(([p, d, a, n]) => { setProfile(p); setDocuments(d); setApplications(a); setNotifications(n); }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCard />;

  return <>
    <PageHeader title={`Bonjour ${profile?.firstName || ''}`} description="Vue d’ensemble de ton espace candidat Médilink." actions={<LinkButton href="/app/search">Chercher une mission</LinkButton>} />
    <div className="grid-3">
      <Card><div className="stat"><span>Profil complété</span><strong>{profile?.completionScore || 0}%</strong><LinkButton variant="secondary" href="/app/profile">Compléter</LinkButton></div></Card>
      <Card><div className="stat"><span>Documents</span><strong>{documents.length}</strong><LinkButton variant="secondary" href="/app/profile">Gérer</LinkButton></div></Card>
      <Card><div className="stat"><span>Candidatures</span><strong>{applications.length}</strong><LinkButton variant="secondary" href="/app/applications">Voir</LinkButton></div></Card>
    </div>
    <div className="grid-2" style={{ marginTop: 16 }}>
      <Card><h2>Dernières candidatures</h2>{applications.slice(0, 5).map((a) => <p key={a.id}><strong>{a.mission?.title}</strong><br /><span className="small">{a.status}</span></p>)}{applications.length === 0 ? <p>Aucune candidature.</p> : null}</Card>
      <Card><h2>Notifications</h2>{notifications.slice(0, 5).map((n) => <p key={n.id}><strong>{n.title}</strong><br /><span className="small">{n.body}</span></p>)}{notifications.length === 0 ? <p>Aucune notification.</p> : null}</Card>
    </div>
  </>;
}
