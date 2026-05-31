'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { statusLabel } from '@/lib/labels';
import type { Application, Mission } from '@/lib/types';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Badge, Card, LinkButton, LoadingCard, PageHeader, ProgressBar, StatCard } from '@/components/ui';

function applicationTone(status: Application['status']) {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED' || status === 'WITHDRAWN' || status === 'CANCELLED') return 'danger';
  if (status === 'VIEWED') return 'warning';
  return 'neutral';
}

function missionTone(status: Mission['status']) {
  if (status === 'PUBLISHED' || status === 'FILLED') return 'success';
  if (status === 'PAUSED') return 'warning';
  return 'neutral';
}

function candidateName(application: Application) {
  const name = [application.candidate?.profile?.firstName, application.candidate?.profile?.lastName].filter(Boolean).join(' ');
  return name || application.candidate?.email || 'Candidat à identifier';
}

export default function EstablishmentDashboardPage() {
  const { primary, loading } = useEstablishments();
  const [applications, setApplications] = useState<Application[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    if (!primary) {
      setApplications([]);
      setMissions([]);
      return;
    }

    setDashboardLoading(true);
    Promise.all([
      api.get<Application[]>(`/establishment/applications?establishmentId=${primary.id}`),
      api.get<Mission[]>(`/missions/mine?establishmentId=${primary.id}`),
    ]).then(([nextApplications, nextMissions]) => {
      setApplications(nextApplications);
      setMissions(nextMissions);
    }).catch(() => {
      setApplications([]);
      setMissions([]);
    }).finally(() => setDashboardLoading(false));
  }, [primary]);

  const dashboard = useMemo(() => {
    const sortedApplications = [...applications].sort((a, b) => {
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
    const sortedMissions = [...missions].sort((a, b) => {
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
    const acceptedApplications = applications.filter((application) => application.status === 'ACCEPTED');
    const pendingApplications = applications.filter((application) => application.status === 'SUBMITTED' || application.status === 'VIEWED');
    const publishedMissions = missions.filter((mission) => mission.status === 'PUBLISHED');
    const draftMissions = missions.filter((mission) => mission.status === 'DRAFT');

    return {
      sortedApplications,
      sortedMissions,
      acceptedApplications,
      pendingApplications,
      publishedMissions,
      draftMissions,
    };
  }, [applications, missions]);

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

  if (dashboardLoading) return <LoadingCard label="Chargement de votre activité..." />;

  const completionScore = primary.completionScore || 0;
  const establishmentReady = completionScore >= 80;
  const nextStep = !establishmentReady
    ? { label: 'Finaliser votre fiche', href: `/establishment/edit/${primary.id}`, helper: 'Complétez les informations de votre établissement pour inspirer confiance aux candidats.' }
    : missions.length === 0
      ? { label: 'Publier votre première mission', href: '/establishment/missions/new', helper: 'Créez une offre claire pour commencer à recevoir des candidatures qualifiées.' }
      : dashboard.pendingApplications.length > 0
        ? { label: 'Traiter les candidatures', href: '/establishment/applications', helper: `${dashboard.pendingApplications.length} dossier(s) attendent votre attention.` }
        : { label: 'Piloter vos missions', href: '/establishment/missions', helper: 'Gardez vos besoins à jour et anticipez vos prochaines recherches.' };

  return (
    <>
      <PageHeader
        title={primary.name}
        description="Vue d’ensemble de l’activité recrutement de votre établissement."
      />

      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">Priorité du jour</span>
          <h2>{nextStep.label}</h2>
          <p>{nextStep.helper}</p>
          <div className="actions">
            <LinkButton href={nextStep.href}>Continuer</LinkButton>
            <LinkButton variant="light" href="/establishment/messages">Ouvrir la messagerie</LinkButton>
          </div>
        </div>
        <div className="dashboard-readiness">
          <div>
            <span>Profil établissement</span>
            <strong>{completionScore}%</strong>
            <ProgressBar value={completionScore} />
          </div>
          <div>
            <span>Missions publiées</span>
            <strong>{dashboard.publishedMissions.length}</strong>
          </div>
          <div>
            <span>Candidatures à traiter</span>
            <strong>{dashboard.pendingApplications.length}</strong>
          </div>
        </div>
      </section>

      <div className="grid-3 dashboard-stat-grid">
        <StatCard
          label="Profil établissement"
          value={`${completionScore}%`}
          helper={<ProgressBar value={completionScore} />}
          action={<LinkButton variant="secondary" href={`/establishment/edit/${primary.id}`}>Améliorer</LinkButton>}
        />
        <StatCard
          label="Missions actives"
          value={dashboard.publishedMissions.length}
          helper={`${dashboard.draftMissions.length} brouillon(s) - ${missions.length} au total`}
          action={<LinkButton variant="secondary" href="/establishment/missions">Gérer</LinkButton>}
        />
        <StatCard
          label="Candidatures reçues"
          value={applications.length}
          helper={`${dashboard.pendingApplications.length} à traiter - ${dashboard.acceptedApplications.length} acceptée(s)`}
          action={<LinkButton variant="secondary" href="/establishment/applications">Voir</LinkButton>}
        />
      </div>

      <div className="dashboard-main">
        <Card className="dashboard-panel">
          <div className="toolbar">
            <div>
              <h2>Candidatures récentes</h2>
              <p className="small">Les profils qui méritent votre attention en premier.</p>
            </div>
            <LinkButton variant="light" href="/establishment/applications">Tout voir</LinkButton>
          </div>
          {dashboard.sortedApplications.length > 0 ? (
            <div className="dashboard-list">
              {dashboard.sortedApplications.slice(0, 5).map((application) => (
                <div key={application.id} className="dashboard-list-item">
                  <div>
                    <strong>{candidateName(application)}</strong>
                    <span>{application.mission?.title || 'Mission à confirmer'}</span>
                  </div>
                  <div className="dashboard-list-meta">
                    <Badge tone={applicationTone(application.status)}>{statusLabel(application.status)}</Badge>
                    <span className="small">{formatDate(application.updatedAt || application.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <strong>Aucune candidature reçue</strong>
              <p>Vos prochains profils apparaîtront ici dès qu&apos;une mission publiée attirera des candidats.</p>
              <LinkButton variant="secondary" href="/establishment/missions/new">Créer une mission</LinkButton>
            </div>
          )}
        </Card>

        <div className="dashboard-side">
          <Card className="dashboard-panel">
            <div className="toolbar">
              <div>
                <h2>Missions récentes</h2>
                <p className="small">Votre activité de recrutement en un coup d&apos;œil.</p>
              </div>
              <LinkButton variant="light" href="/establishment/missions">Tout voir</LinkButton>
            </div>
            {dashboard.sortedMissions.length > 0 ? (
              <div className="dashboard-mini-list">
                {dashboard.sortedMissions.slice(0, 4).map((mission) => (
                  <div key={mission.id}>
                    <span>{mission.title}</span>
                    <Badge tone={missionTone(mission.status)}>{statusLabel(mission.status)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty compact">
                <strong>Aucune mission</strong>
                <p>Créez une première mission pour lancer vos recrutements.</p>
              </div>
            )}
          </Card>

          <Card className="dashboard-panel">
            <div className="toolbar">
              <div>
                <h2>Fiche établissement</h2>
                <p className="small">Les repères visibles par votre équipe.</p>
              </div>
              <LinkButton variant="light" href={`/establishment/edit/${primary.id}`}>Modifier</LinkButton>
            </div>
            <div className="dashboard-feature">
              <span>{statusLabel(primary.verificationStatus)}</span>
              <strong>{primary.city || 'Ville à renseigner'}</strong>
              <p>{primary.description || 'Ajoutez une présentation pour donner davantage de contexte aux candidats.'}</p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
