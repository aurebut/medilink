'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Application, Document, Notification, Profile } from '@/lib/types';
import { Card, LinkButton, LoadingCard, PageHeader, ProgressBar, StatCard } from '@/components/ui';
import { statusLabel } from '@/lib/labels';

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
    ]).then(([p, d, a, n]) => {
      setProfile(p);
      setDocuments(d);
      setApplications(a);
      setNotifications(n);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingCard />;

  const firstName = profile?.firstName || 'Bienvenue';
  const approvedDocuments = documents.filter((d) => d.verificationStatus === 'APPROVED').length;

  return (
    <>
      <PageHeader
        title={`Bonjour ${firstName}`}
        description="Pilote ton profil, tes documents, tes candidatures et tes échanges depuis un seul espace."
        actions={<LinkButton href="/app/search">Chercher une mission</LinkButton>}
      />

      <div className="grid-3">
        <StatCard
          label="Profil complété"
          value={`${profile?.completionScore || 0}%`}
          helper={<ProgressBar value={profile?.completionScore || 0} />}
          action={<LinkButton variant="secondary" href="/app/profile">Compléter</LinkButton>}
        />
        <StatCard
          label="Documents validés"
          value={`${approvedDocuments}/${documents.length}`}
          helper="CV, attestations et justificatifs"
          action={<LinkButton variant="secondary" href="/app/profile">Gérer</LinkButton>}
        />
        <StatCard
          label="Candidatures"
          value={applications.length}
          helper="Suivi des missions postulées"
          action={<LinkButton variant="secondary" href="/app/applications">Voir</LinkButton>}
        />
      </div>

      <div className="grid-2" style={{ marginTop: 16 }}>
        <Card>
          <div className="toolbar">
            <h2>Dernières candidatures</h2>
            <LinkButton variant="light" href="/app/applications">Tout voir</LinkButton>
          </div>
          {applications.slice(0, 5).map((a) => (
            <p key={a.id}>
              <strong>{a.mission?.title || 'Mission'}</strong>
              <br />
              <span className="small">{statusLabel(a.status)} · {a.mission?.city || 'Ville non renseignée'}</span>
            </p>
          ))}
          {applications.length === 0 ? <p>Aucune candidature pour le moment.</p> : null}
        </Card>

        <Card>
          <div className="toolbar">
            <h2>Notifications</h2>
            <LinkButton variant="light" href="/app/notifications">Tout voir</LinkButton>
          </div>
          {notifications.slice(0, 5).map((n) => (
            <p key={n.id}>
              <strong>{n.title}</strong>
              <br />
              <span className="small">{n.body}</span>
            </p>
          ))}
          {notifications.length === 0 ? <p>Aucune notification.</p> : null}
        </Card>
      </div>
    </>
  );
}
