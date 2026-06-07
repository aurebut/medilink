'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { candidateNounCapitalized } from '@/lib/grammar';
import { statusLabel } from '@/lib/labels';
import type { Application, Conversation, Mission } from '@/lib/types';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Badge, Card, LinkButton, LoadingCard, PageHeader, ProgressBar } from '@/components/ui';

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
  return name || application.candidate?.email || `${candidateNounCapitalized(application.candidate?.profile)} à identifier`;
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Aucune date';
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function messagePreview(body?: string | null) {
  if (!body) return 'Aucun message';
  return body.startsWith('__MEDILINK_WORKFLOW__') ? 'Mise à jour du suivi' : body;
}

export default function EstablishmentDashboardPage() {
  const { primary, loading } = useEstablishments();
  const [applications, setApplications] = useState<Application[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  useEffect(() => {
    if (!primary) {
      setApplications([]);
      setMissions([]);
      setConversations([]);
      return;
    }

    setDashboardLoading(true);
    Promise.all([
      api.get<Application[]>(`/establishment/applications?establishmentId=${primary.id}`),
      api.get<Mission[]>(`/missions/mine?establishmentId=${primary.id}`),
      api.get<Conversation[]>('/conversations'),
    ]).then(([nextApplications, nextMissions, nextConversations]) => {
      setApplications(nextApplications);
      setMissions(nextMissions);
      setConversations(nextConversations.filter((conversation) => conversation.establishmentId === primary.id));
    }).catch(() => {
      setApplications([]);
      setMissions([]);
      setConversations([]);
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
    const activeMissions = missions.filter((mission) => mission.status === 'PUBLISHED' || mission.status === 'FILLED');
    const today = new Date().setHours(0, 0, 0, 0);
    const upcomingMissions = [...activeMissions]
      .filter((mission) => mission.startDate && new Date(mission.startDate).getTime() >= today)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    const nextMission = upcomingMissions[0] || sortedMissions.find((mission) => mission.status === 'PUBLISHED') || sortedMissions[0];
    const sortedConversations = [...conversations]
      .sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 3);
    const activeMissionIds = new Set(activeMissions.map((mission) => mission.id));
    const applicationsByMission = applications.reduce<Record<string, Application[]>>((acc, application) => {
      acc[application.missionId] = [...(acc[application.missionId] || []), application];
      return acc;
    }, {});
    const missionPipeline = sortedMissions
      .filter((mission) => activeMissionIds.has(mission.id) || mission.status === 'DRAFT')
      .slice(0, 5)
      .map((mission) => ({
        mission,
        pendingCount: (applicationsByMission[mission.id] || []).filter((application) => application.status === 'SUBMITTED' || application.status === 'VIEWED').length,
        acceptedCount: (applicationsByMission[mission.id] || []).filter((application) => application.status === 'ACCEPTED').length,
      }));

    return {
      sortedApplications,
      sortedMissions,
      acceptedApplications,
      pendingApplications,
      publishedMissions,
      draftMissions,
      upcomingMissions,
      nextMission,
      sortedConversations,
      missionPipeline,
    };
  }, [applications, conversations, missions]);

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
        description="Votre cockpit recruteur pour prioriser les candidatures, maintenir les missions ouvertes et garder votre fiche établissement solide."
      />

      <div className="establishment-dashboard candidate-dashboard">
        <Card className="dashboard-week-card establishment-priority-card">
          <div className="dashboard-section-head">
            <div>
              <span>Priorité du jour</span>
              <h2>{nextStep.label}</h2>
            </div>
            <LinkButton variant="light" href={nextStep.href}>Continuer</LinkButton>
          </div>
          <div className="establishment-priority-grid">
            <div className="establishment-priority-copy">
              <p>{nextStep.helper}</p>
              <div className="dashboard-readiness compact-readiness">
                <div>
                  <span>Fiche établissement</span>
                  <strong>{completionScore}%</strong>
                  <ProgressBar value={completionScore} />
                </div>
                <div>
                  <span>Candidatures à traiter</span>
                  <strong>{dashboard.pendingApplications.length}</strong>
                </div>
                <div>
                  <span>Missions publiées</span>
                  <strong>{dashboard.publishedMissions.length}</strong>
                </div>
              </div>
            </div>
            {dashboard.nextMission ? (
              <div className="dashboard-next-event compact">
                <div className="dashboard-date-tile">
                  <strong>{formatShortDate(dashboard.nextMission.startDate)}</strong>
                  <span>{dashboard.nextMission.startTime || 'Horaire à confirmer'}</span>
                </div>
                <div>
                  <span>Prochaine mission à piloter</span>
                  <strong>{dashboard.nextMission.title}</strong>
                  <p>{dashboard.nextMission.city || dashboard.nextMission.location || 'Lieu à confirmer'}</p>
                </div>
                <LinkButton variant="light" href={`/establishment/missions/${dashboard.nextMission.id}`}>Voir</LinkButton>
              </div>
            ) : (
              <div className="dashboard-empty compact">
                <strong>Aucune mission planifiée</strong>
                <p>Publiez une mission pour commencer à recevoir des candidatures.</p>
                <LinkButton variant="secondary" href="/establishment/missions/new">Créer</LinkButton>
              </div>
            )}
          </div>
        </Card>

        <section className="dashboard-command-grid">
          <Card className="dashboard-focus-card">
            <div className="dashboard-section-head">
              <div>
                <span>Recrutement</span>
                <h2>Candidatures</h2>
              </div>
              <LinkButton variant="light" href="/establishment/applications">Tout voir</LinkButton>
            </div>
            <div className="dashboard-message-summary">
              <div>
                <span>À traiter</span>
                <strong>{dashboard.pendingApplications.length}</strong>
              </div>
              <div>
                <span>Acceptées</span>
                <strong>{dashboard.acceptedApplications.length}</strong>
              </div>
            </div>
            {dashboard.sortedApplications.length > 0 ? (
              <div className="dashboard-mini-list">
                {dashboard.sortedApplications.slice(0, 3).map((application) => (
                  <div key={application.id}>
                    <span>{candidateName(application)}</span>
                    <Badge tone={applicationTone(application.status)}>{statusLabel(application.status)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty compact">
                <strong>Aucune candidature</strong>
                <p>Les profils apparaîtront ici après publication.</p>
              </div>
            )}
          </Card>

          <Card className="dashboard-focus-card">
            <div className="dashboard-section-head">
              <div>
                <span>Messages</span>
                <h2>Conversations</h2>
              </div>
              <LinkButton variant="light" href="/establishment/messages">Ouvrir</LinkButton>
            </div>
            {dashboard.sortedConversations.length > 0 ? (
              <div className="dashboard-mini-list dashboard-message-list">
                {dashboard.sortedConversations.map((conversation) => {
                  const lastMessage = conversation.messages?.[0];
                  return (
                    <Link
                      key={conversation.id}
                      href={`/establishment/messages?id=${conversation.id}`}
                      className="dashboard-message-link"
                    >
                      <div className="dashboard-message-link-main">
                        <strong>{conversation.application ? candidateName(conversation.application) : conversation.mission?.title || 'Conversation'}</strong>
                        <span>{messagePreview(lastMessage?.body)}</span>
                      </div>
                      <div className="dashboard-message-link-meta">
                        <span className="small">{formatDateTime(conversation.lastMessageAt)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-empty compact">
                <strong>Aucun message</strong>
                <p>Les échanges avec les candidats s'afficheront ici.</p>
              </div>
            )}
          </Card>

          <Card className="dashboard-focus-card dashboard-finance-card">
            <div className="dashboard-section-head">
              <div>
                <span>Missions</span>
                <h2>Portefeuille</h2>
              </div>
              <LinkButton variant="light" href="/establishment/missions">Gérer</LinkButton>
            </div>
            <div className="dashboard-finance-status is-info">
              <div className="finance-status-header">
                <span className="status-dot" />
                <span>{dashboard.draftMissions.length} brouillon(s)</span>
              </div>
              <strong>{missions.length} mission(s)</strong>
              <p>{dashboard.publishedMissions.length} publiée(s), {dashboard.upcomingMissions.length} à venir dans votre planning.</p>
              <LinkButton href="/establishment/missions/new" variant="secondary">Nouvelle mission</LinkButton>
            </div>
          </Card>
        </section>

        <section className="dashboard-operations-grid">
          <Card className="dashboard-panel dashboard-missions-panel">
            <div className="toolbar">
              <div>
                <h2>Suivi des missions</h2>
                <p className="small">Publication, remplissage et prochaines dates.</p>
              </div>
              <LinkButton variant="light" href="/establishment/missions">Tout voir</LinkButton>
            </div>
            {dashboard.missionPipeline.length > 0 ? (
              <div className="dashboard-list">
                {dashboard.missionPipeline.map(({ mission, pendingCount, acceptedCount }) => (
                  <div key={mission.id} className="dashboard-list-item">
                    <div>
                      <strong>{mission.title}</strong>
                      <span>{formatShortDate(mission.startDate)} &bull; {pendingCount} à traiter &bull; {acceptedCount} validée(s)</span>
                    </div>
                    <div className="dashboard-list-meta">
                      <Badge tone={missionTone(mission.status)}>{statusLabel(mission.status)}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty">
                <strong>Aucune mission</strong>
                <p>Créez une première mission pour lancer vos recrutements.</p>
                <LinkButton variant="secondary" href="/establishment/missions/new">Créer une mission</LinkButton>
              </div>
            )}
          </Card>

          <div className="dashboard-admin-column">
            <Card className="dashboard-panel">
              <div className="toolbar">
                <div>
                  <h2>Fiche établissement</h2>
                  <p className="small">Les repères visibles par les candidats.</p>
                </div>
                <LinkButton variant="light" href={`/establishment/edit/${primary.id}`}>Modifier</LinkButton>
              </div>
              <div className="dashboard-dossier-summary">
                <div>
                  <span>Statut</span>
                  <strong>{statusLabel(primary.verificationStatus)}</strong>
                </div>
                <div>
                  <span>Ville</span>
                  <strong>{primary.city || 'À renseigner'}</strong>
                </div>
                <div>
                  <span>Complétion</span>
                  <strong>{establishmentReady ? 'Prête' : `${completionScore}%`}</strong>
                </div>
              </div>
              <div className="dashboard-feature">
                <span>Présentation</span>
                <strong>{primary.city || 'Ville à renseigner'}</strong>
                <p>{primary.description || 'Ajoutez une présentation pour donner davantage de contexte aux candidats.'}</p>
              </div>
            </Card>
          </div>
        </section>
      </div>
    </>
  );
}
