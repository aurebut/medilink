'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, primeApiCache, subscribeApiCache } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { candidateNounCapitalized } from '@/lib/grammar';
import { statusLabel } from '@/lib/labels';
import type { Application, Conversation, Establishment, EstablishmentDashboardData, Mission } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Badge, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';
import { buildCalendarEventWeeks, buildWeekCarousel, dateKey, weekDayLabels, weekRangeLabel } from '@/lib/candidate-workspace';
import { buildEstablishmentAgendaRows, establishmentMissionTone, establishmentMissionLabel } from '@/lib/establishment-agenda';

function dayNumber(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(value);
}

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
  const [primary, setPrimary] = useState<Establishment | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);

  function applyDashboardData(data: EstablishmentDashboardData) {
    setPrimary(data.establishment);
    setApplications(data.applications);
    setMissions(data.missions);
    setConversations(data.conversations);
    if (data.establishment) {
      primeApiCache('/establishments/me', [data.establishment]);
      primeApiCache(`/establishment/applications?establishmentId=${data.establishment.id}`, data.applications);
      primeApiCache(`/missions/mine?establishmentId=${data.establishment.id}`, data.missions);
      api.preload(`/billing/establishments/${data.establishment.id}/status`);
    }
    primeApiCache('/conversations', data.conversations);
  }

  useEffect(() => {
    const unsubscribe = subscribeApiCache<EstablishmentDashboardData>('/establishment/dashboard', applyDashboardData);
    setDashboardLoading(true);
    api.get<EstablishmentDashboardData>('/establishment/dashboard').then(applyDashboardData).catch(() => {
      setPrimary(null);
      setApplications([]);
      setMissions([]);
      setConversations([]);
    }).finally(() => setDashboardLoading(false));

    return unsubscribe;
  }, []);

  useAutoRefresh(async () => {
    applyDashboardData(await api.reload<EstablishmentDashboardData>('/establishment/dashboard'));
  }, { enabled: !dashboardLoading });

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

    const agendaRows = buildEstablishmentAgendaRows(missions, applications, conversations);
    const weekCarousel = buildWeekCarousel(new Date(), 8);
    const weekEventWeeks = buildCalendarEventWeeks(
      weekCarousel.map((week) => week.days),
      agendaRows,
      {
        getKey: (row) => row.mission.id,
        getStart: (row) => row.date,
        getEnd: (row) => row.endDate,
        maxLanes: 2,
      },
    );
    const nextAgendaItem = agendaRows
      .filter((row) => row.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())[0];
    const todayKey = dateKey(new Date());
    const upcomingMissions = agendaRows.filter((row) => row.date && dateKey(row.endDate || row.date) >= todayKey);

    return {
      sortedApplications,
      sortedMissions,
      acceptedApplications,
      pendingApplications,
      publishedMissions,
      draftMissions,
      sortedConversations,
      missionPipeline,
      agendaRows,
      weekCarousel,
      weekEventWeeks,
      nextAgendaItem,
      upcomingMissions,
    };
  }, [applications, conversations, missions]);

  if (dashboardLoading) return <LoadingCard label="Chargement..." />;

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

  return (
    <>
      <PageHeader
        title={primary.name}
        description="Votre cockpit recruteur pour prioriser les candidatures, maintenir les missions ouvertes et garder votre fiche établissement solide."
      />

      <div className="establishment-dashboard candidate-dashboard">
        <Card className="dashboard-week-card">
          <div className="dashboard-section-head">
            <div>
              <span>Agenda</span>
              <h2>Semaine à venir</h2>
            </div>
            <LinkButton variant="light" href="/establishment/agenda">Agenda complet</LinkButton>
          </div>
          <div className="dashboard-week-summary">
            {dashboard.nextAgendaItem ? (
              <div className="dashboard-next-event compact">
                <div className="dashboard-date-tile">
                  <strong>{formatShortDate(dashboard.nextAgendaItem.date)}</strong>
                  <span>{dashboard.nextAgendaItem.mission.startTime || 'Horaire à confirmer'}</span>
                </div>
                <div>
                  <span>Prochaine échéance</span>
                  <strong>{dashboard.nextAgendaItem.mission.title}</strong>
                  <p>
                    {dashboard.nextAgendaItem.selectedApplication
                      ? `Avec ${candidateName(dashboard.nextAgendaItem.selectedApplication)}`
                      : 'Aucun candidat validé'}
                  </p>
                </div>
                <LinkButton
                  variant="light"
                  href={`/establishment/missions/${dashboard.nextAgendaItem.mission.id}`}
                >
                  Voir
                </LinkButton>
              </div>
            ) : (
              <div className="dashboard-empty compact dashboard-week-empty">
                <strong>Aucune date planifiée</strong>
                <p>Vos missions planifiées apparaîtront dans le calendrier.</p>
              </div>
            )}
          </div>
          <div className="week-carousel" aria-label="Semaines à venir">
            {dashboard.weekCarousel.map((week, weekIndex) => (
              <div key={week.key} className="week-panel">
                <div className="week-panel-head">
                  <strong>{weekIndex === 0 ? 'Cette semaine' : weekRangeLabel(week.start)}</strong>
                  <span>{weekIndex === 0 ? weekRangeLabel(week.start) : `${weekIndex + 1}e semaine`}</span>
                </div>
                <div className="week-grid">
                  {week.days.map((day, index) => {
                    const today = dateKey(day) === dateKey(new Date());
                    return (
                      <div key={dateKey(day)} className={`week-day ${today ? 'today' : ''}`}>
                        <div className="week-day-head">
                          <span>{weekDayLabels[index]}</span>
                          <strong>{dayNumber(day)}</strong>
                        </div>
                        <div className="week-day-body" />
                      </div>
                    );
                  })}
                  <div className="week-event-layer">
                    {dashboard.weekEventWeeks[weekIndex].segments.map((segment) => (
                      <div
                        key={`${segment.key}-${segment.startIndex}-${segment.endIndex}`}
                        className={`week-span-event is-${establishmentMissionTone(segment.item)} ${segment.isStart ? 'starts' : 'continues'} ${segment.isEnd ? 'ends' : 'continues'}`}
                        style={{
                          gridColumn: `${segment.startIndex + 1} / ${segment.endIndex + 2}`,
                          gridRow: segment.lane + 1,
                        }}
                      >
                        <strong>{segment.item.mission.title}</strong>
                        <span>{segment.item.mission.startTime || establishmentMissionLabel(segment.item)}</span>
                      </div>
                    ))}
                    {dashboard.weekEventWeeks[weekIndex].hiddenCount > 0 ? (
                      <span className="week-span-more">+{dashboard.weekEventWeeks[weekIndex].hiddenCount}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <section className="dashboard-command-grid">
          <Card className="dashboard-focus-card">
            <div className="dashboard-section-head">
              <div>
                <span>Recrutement</span>
                <h2>Candidatures</h2>
              </div>
              <LinkButton variant="light" href="/establishment/missions?tab=applications">Tout voir</LinkButton>
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

      </div>
    </>
  );
}
