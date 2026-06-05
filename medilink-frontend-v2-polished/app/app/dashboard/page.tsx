'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { agreementLabel, agreementNextStep, agreementTone, buildWeekCarousel, candidateAmountLabel, conversationForApplication, dateKey, latestAgreement, missionDateValue, weekDayLabels, weekRangeLabel } from '@/lib/candidate-workspace';
import { formatDate, formatDateTime } from '@/lib/format';
import { gendered } from '@/lib/grammar';
import { statusLabel } from '@/lib/labels';
import type { Application, Conversation, Document, Notification, Profile } from '@/lib/types';
import { Badge, Card, LinkButton, LoadingCard, PageHeader, ProgressBar } from '@/components/ui';

function applicationTone(status: Application['status']) {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED' || status === 'WITHDRAWN' || status === 'CANCELLED') return 'danger';
  if (status === 'VIEWED') return 'warning';
  return 'neutral';
}

function documentTone(status: Document['verificationStatus']) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED' || status === 'EXPIRED') return 'danger';
  if (status === 'PENDING_VERIFICATION' || status === 'UPLOAD_PENDING') return 'warning';
  return 'neutral';
}

function formatMissionDate(application: Application) {
  const startDate = application.mission?.startDate;
  if (!startDate) return 'Date à confirmer';
  return formatDate(startDate);
}

function formatShortDate(value?: string | null) {
  if (!value) return 'Aucune date';
  try {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(new Date(value));
  } catch {
    return value;
  }
}

function dayNumber(value: Date) {
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric' }).format(value);
}

function messagePreview(body?: string | null) {
  if (!body) return 'Aucun message';
  return body.startsWith('__MEDILINK_WORKFLOW__') ? 'Mise à jour du suivi' : body;
}

export default function CandidateDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Profile>('/me/profile'),
      api.get<Document[]>('/me/documents'),
      api.get<Application[]>('/me/applications'),
      api.get<Conversation[]>('/conversations'),
      api.get<Notification[]>('/notifications'),
    ]).then(([p, d, a, c, n]) => {
      setProfile(p);
      setDocuments(d);
      setApplications(a);
      setConversations(c);
      setNotifications(n);
    }).finally(() => setLoading(false));
  }, []);

  const dashboard = useMemo(() => {
    const sortedApplications = [...applications].sort((a, b) => {
      return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
    });
    const unreadNotifications = notifications.filter((n) => !n.readAt);
    const approvedDocuments = documents.filter((d) => d.verificationStatus === 'APPROVED');
    const pendingDocuments = documents.filter((d) => ['PENDING_VERIFICATION', 'UPLOAD_PENDING'].includes(d.verificationStatus));
    const blockedDocuments = documents.filter((d) => ['REJECTED', 'EXPIRED'].includes(d.verificationStatus));
    const activeApplications = applications.filter((a) => !['REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(a.status));
    const acceptedApplications = applications.filter((a) => a.status === 'ACCEPTED');
    const missionRows = sortedApplications.map((application) => {
      const conversation = conversationForApplication(application, conversations);
      const agreement = latestAgreement(conversation);
      return {
        application,
        conversation,
        agreement,
        date: missionDateValue(application, agreement),
      };
    });
    const proposedAgreements = missionRows.filter((row) => row.agreement?.status === 'PROPOSED');
    const billingReady = missionRows.filter((row) => row.agreement?.status === 'PAYMENT_RELEASED');
    const confirmedMissions = missionRows.filter((row) => ['FUNDS_SECURED', 'COMPLETED', 'PAYMENT_RELEASED'].includes(row.agreement?.status || ''));
    const nextAgendaItem = [...missionRows]
      .filter((row) => row.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())[0];
    const nextMission = [...acceptedApplications]
      .filter((a) => a.mission?.startDate)
      .sort((a, b) => new Date(a.mission!.startDate).getTime() - new Date(b.mission!.startDate).getTime())[0];
    const userId = profile?.userId;
    const receivedMessages = conversations.flatMap((conversation) => {
      return (conversation.messages || [])
        .filter((message) => !userId || message.senderUserId !== userId)
        .map((message) => ({ conversation, message }));
    });
    const latestReceivedMessages = [...receivedMessages]
      .sort((a, b) => new Date(b.message.createdAt).getTime() - new Date(a.message.createdAt).getTime())
      .slice(0, 3);
    const unreadReceivedMessages = receivedMessages.filter(({ message }) => !message.readAt).length;
    const missionRowsByDay = new Map<string, typeof missionRows>();
    missionRows.forEach((row) => {
      const key = dateKey(row.date);
      missionRowsByDay.set(key, [...(missionRowsByDay.get(key) || []), row]);
    });
    const weekCarousel = buildWeekCarousel(new Date(), 8);

    return {
      sortedApplications,
      unreadNotifications,
      approvedDocuments,
      pendingDocuments,
      blockedDocuments,
      activeApplications,
      acceptedApplications,
      missionRows,
      proposedAgreements,
      billingReady,
      confirmedMissions,
      nextAgendaItem,
      nextMission,
      latestReceivedMessages,
      unreadReceivedMessages,
      missionRowsByDay,
      weekCarousel,
    };
  }, [applications, conversations, documents, notifications, profile?.userId]);

  if (loading) return <LoadingCard />;

  const firstName = profile?.firstName || 'Bienvenue';
  const completionScore = profile?.completionScore || 0;
  const profileReady = completionScore >= 80;
  const documentsReady = documents.length > 0 && dashboard.blockedDocuments.length === 0 && dashboard.pendingDocuments.length === 0;
  const hasApplications = applications.length > 0;

  const nextStep = !profileReady
    ? { label: 'Compléter le profil', href: '/app/profile', helper: 'Un profil complet rassure les établissements.' }
    : !documentsReady
      ? { label: 'Vérifier les documents', href: '/app/profile', helper: 'Gardez vos justificatifs prêts avant de postuler.' }
      : !hasApplications
        ? { label: 'Trouver une mission', href: '/app/search', helper: 'Votre dossier est prêt à être envoyé.' }
        : dashboard.proposedAgreements.length > 0
          ? { label: 'Répondre à une proposition', href: '/app/messages', helper: 'Une proposition finale attend votre validation.' }
          : dashboard.billingReady.length > 0
            ? { label: 'Télécharger un justificatif', href: '/app/billing', helper: 'Une mission validée dispose maintenant d’un document comptable.' }
            : { label: 'Suivre mes missions', href: '/app/missions', helper: 'Consultez les retours et relancez au bon moment.' };

  return (
    <>
      <PageHeader
        title={`Bonjour ${firstName}`}
        description={`Votre espace ${gendered(profile, 'connecté', 'connectée')} pour prioriser les missions, garder un dossier solide et suivre les réponses.`}
      />

      <div className="candidate-dashboard">
        <Card className="dashboard-week-card">
          <div className="dashboard-section-head">
            <div>
              <span>Agenda</span>
              <h2>Semaine à venir</h2>
            </div>
            <LinkButton variant="light" href="/app/agenda">Agenda complet</LinkButton>
          </div>
          <div className="dashboard-week-summary">
            {dashboard.nextAgendaItem ? (
              <div className="dashboard-next-event compact">
                <div className="dashboard-date-tile">
                  <strong>{formatShortDate(dashboard.nextAgendaItem.date)}</strong>
                  <span>{dashboard.nextAgendaItem.application.mission?.startTime || 'Horaire à confirmer'}</span>
                </div>
                <div>
                  <span>Prochaine échéance</span>
                  <strong>{dashboard.nextAgendaItem.application.mission?.title || 'Mission'}</strong>
                  <p>{dashboard.nextAgendaItem.application.mission?.establishment?.name || dashboard.nextAgendaItem.application.mission?.city || 'Lieu à confirmer'}</p>
                </div>
              </div>
            ) : (
              <div className="dashboard-empty compact dashboard-week-empty">
                <strong>Aucune date planifiée</strong>
                <p>Vos missions datées apparaîtront dans le calendrier.</p>
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
                    const rows = dashboard.missionRowsByDay.get(dateKey(day)) || [];
                    const today = dateKey(day) === dateKey(new Date());
                    return (
                      <div key={dateKey(day)} className={`week-day ${today ? 'today' : ''}`}>
                        <div className="week-day-head">
                          <span>{weekDayLabels[index]}</span>
                          <strong>{dayNumber(day)}</strong>
                        </div>
                        <div className="week-day-body">
                          {rows.slice(0, 2).map(({ application, agreement }) => (
                            <div key={application.id} className={`week-event is-${agreementTone(agreement?.status)}`}>
                              <strong>{application.mission?.title || 'Mission'}</strong>
                              <span>{application.mission?.startTime || agreementLabel(agreement?.status)}</span>
                            </div>
                          ))}
                          {rows.length > 2 ? <span className="week-more">+{rows.length - 2}</span> : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <section className="dashboard-command-grid">
          <Card className="dashboard-priority-card">
            <span className="dashboard-eyebrow">Priorité du jour</span>
            <h2>{nextStep.label}</h2>
            <p>{nextStep.helper}</p>
            <div className="dashboard-kpi-row">
              <div>
                <span>Profil</span>
                <strong>{completionScore}%</strong>
                <ProgressBar value={completionScore} />
              </div>
              <div>
                <span>Documents</span>
                <strong>{dashboard.approvedDocuments.length}/{documents.length || 0}</strong>
              </div>
              <div>
                <span>Missions actives</span>
                <strong>{dashboard.activeApplications.length}</strong>
              </div>
            </div>
            <div className="actions">
              <LinkButton href={nextStep.href}>Continuer</LinkButton>
            </div>
          </Card>

          <Card className="dashboard-focus-card">
            <div className="dashboard-section-head">
              <div>
                <span>Messages</span>
                <h2>Messages reçus</h2>
              </div>
              <LinkButton variant="light" href="/app/messages">Ouvrir</LinkButton>
            </div>
            <div className="dashboard-message-summary">
              <div>
                <span>Non lus</span>
                <strong>{dashboard.unreadReceivedMessages}</strong>
              </div>
              <div>
                <span>Conversations</span>
                <strong>{conversations.length}</strong>
              </div>
            </div>
            {dashboard.latestReceivedMessages.length > 0 ? (
              <div className="dashboard-mini-list dashboard-message-list">
                {dashboard.latestReceivedMessages.map(({ conversation, message }) => (
                  <div key={message.id}>
                    <div>
                      <strong>{conversation.establishment?.name || conversation.mission?.title || 'Conversation'}</strong>
                      <span>{messagePreview(message.body)}</span>
                    </div>
                    <span className="small">{formatDateTime(message.createdAt)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty compact">
                <strong>Aucun message reçu</strong>
                <p>Les réponses des établissements apparaîtront ici.</p>
              </div>
            )}
          </Card>

          <Card className="dashboard-focus-card">
            <div className="dashboard-section-head">
              <div>
                <span>Facturation</span>
                <h2>Compta rapide</h2>
              </div>
              <LinkButton variant="light" href="/app/billing">Ouvrir</LinkButton>
            </div>
            <div className="dashboard-finance-stack">
              <div>
                <span>Justificatifs prêts</span>
                <strong>{dashboard.billingReady.length}</strong>
              </div>
              <div>
                <span>Propositions à traiter</span>
                <strong>{dashboard.proposedAgreements.length}</strong>
              </div>
            </div>
          </Card>
        </section>

        <section className="dashboard-operations-grid">
          <Card className="dashboard-panel dashboard-missions-panel">
          <div className="toolbar">
            <div>
              <h2>Suivi des missions</h2>
              <p className="small">Les missions et accords qui méritent votre attention en premier.</p>
            </div>
            <LinkButton variant="light" href="/app/missions">Tout voir</LinkButton>
          </div>
          {dashboard.missionRows.length > 0 ? (
            <div className="dashboard-list">
              {dashboard.missionRows.slice(0, 5).map(({ application, agreement }) => (
                <div key={application.id} className="dashboard-list-item">
                  <div>
                    <strong>{application.mission?.title || 'Mission'}</strong>
                    <span>{agreement ? agreementNextStep(agreement.status) : application.mission?.establishment?.name || application.mission?.city || 'Établissement à confirmer'}</span>
                  </div>
                  <div className="dashboard-list-meta">
                    <Badge tone={agreement ? agreementTone(agreement.status) : applicationTone(application.status)}>
                      {agreement ? agreementLabel(agreement.status) : statusLabel(application.status)}
                    </Badge>
                    <span className="small">{formatMissionDate(application)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <strong>Aucune candidature envoyée</strong>
              <p>Explorez les missions ouvertes et gardez votre dossier prêt pour candidater vite.</p>
              <LinkButton variant="secondary" href="/app/search">Voir les missions</LinkButton>
            </div>
          )}
          </Card>

          <div className="dashboard-admin-column">
            <Card className="dashboard-panel">
            <div className="toolbar">
              <div>
                <h2>Dossier</h2>
                <p className="small">Profil, documents et conformité.</p>
              </div>
              <LinkButton variant="light" href="/app/profile">Gérer</LinkButton>
            </div>
            <div className="dashboard-dossier-summary">
              <div>
                <span>Profil</span>
                <strong>{profileReady ? gendered(profile, 'Prêt', 'Prête') : `${completionScore}%`}</strong>
              </div>
              <div>
                <span>Documents valides</span>
                <strong>{dashboard.approvedDocuments.length}/{documents.length || 0}</strong>
              </div>
              <div>
                <span>A corriger</span>
                <strong>{dashboard.blockedDocuments.length}</strong>
              </div>
            </div>
            {documents.length > 0 ? (
              <div className="dashboard-mini-list">
                {[...dashboard.blockedDocuments, ...dashboard.pendingDocuments, ...dashboard.approvedDocuments].slice(0, 4).map((document) => (
                  <div key={document.id}>
                    <span>{document.fileName}</span>
                    <Badge tone={documentTone(document.verificationStatus)}>{statusLabel(document.verificationStatus)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty compact">
                <strong>Aucun document</strong>
                <p>Ajoutez CV, attestations et justificatifs depuis le profil.</p>
              </div>
            )}
          </Card>

            <Card className="dashboard-panel dashboard-notifications">
        <div className="toolbar">
          <div>
            <h2>Notifications</h2>
            <p className="small">Les alertes importantes de votre compte.</p>
          </div>
          <LinkButton variant="light" href="/app/notifications">Tout voir</LinkButton>
        </div>
        {notifications.length > 0 ? (
          <div className="dashboard-notification-list">
            {notifications.slice(0, 4).map((notification) => (
              <div key={notification.id} className="dashboard-notification">
                <div className="actions">
                  <Badge tone={notification.readAt ? 'neutral' : 'warning'}>{notification.readAt ? 'Lue' : 'Non lue'}</Badge>
                  <span className="small">{formatDateTime(notification.createdAt)}</span>
                </div>
                <strong>{notification.title}</strong>
                <p>{notification.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty compact">
            <strong>Aucune notification</strong>
            <p>Les réponses, messages et alertes de dossier apparaîtront ici.</p>
          </div>
        )}
      </Card>
          </div>
        </section>
      </div>
    </>
  );
}
