'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api, primeApiCache } from '@/lib/api';
import { agreementLabel, agreementNextStep, agreementTone, buildWeekCarousel, candidateAmountLabel, conversationForApplication, dateKey, latestAgreement, missionDateValue, weekDayLabels, weekRangeLabel } from '@/lib/candidate-workspace';
import { formatDate, formatDateTime, formatMoney } from '@/lib/format';
import { gendered } from '@/lib/grammar';
import { statusLabel } from '@/lib/labels';
import { getCandidateMissionPath } from '@/lib/mission-links';
import type { Application, CandidateDashboardData, Conversation, Document, Notification, Profile } from '@/lib/types';
import { Badge, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

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

function getNotificationLink(notification: Notification) {
  if (!notification.data) return null;
  const data = notification.data as Record<string, any>;
  if (data.conversationId) {
    return `/app/messages?id=${data.conversationId}`;
  }
  if (data.missionId) {
    return getCandidateMissionPath(data.missionId);
  }
  return null;
}

function getNotificationBody(notification: Notification, conversations: Conversation[]) {
  if (notification.type === 'NEW_MESSAGE' && notification.data) {
    const data = notification.data as Record<string, any>;
    const conv = conversations.find(c => c.id === data.conversationId);
    if (conv) {
      return `Vous avez reçu un nouveau message de ${conv.establishment?.name || 'l\'établissement'}.`;
    }
  }
  return notification.body;
}

function getNotificationLinkLabel(notification: Notification) {
  if (!notification.data) return '';
  const data = notification.data as Record<string, any>;
  if (data.conversationId) {
    return 'Voir la conversation';
  }
  if (data.missionId) {
    return 'Suivre la mission';
  }
  return '';
}

export default function CandidateDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<CandidateDashboardData>('/me/dashboard').then((data) => {
      primeApiCache('/me/profile', data.profile);
      primeApiCache('/me/documents', data.documents);
      primeApiCache('/me/applications', data.applications);
      primeApiCache('/conversations', data.conversations);
      primeApiCache('/notifications', data.notifications);
      setProfile(data.profile);
      setDocuments(data.documents);
      setApplications(data.applications);
      setConversations(data.conversations);
      setNotifications(data.notifications);
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
    const billingPending = missionRows.filter((row) => row.agreement && ['PAYMENT_REQUIRED', 'FUNDS_SECURED', 'COMPLETED'].includes(row.agreement.status));
    const billingReadyTotal = billingReady.reduce((sum, row) => sum + (row.agreement?.candidateAmount || row.agreement?.amount || 0), 0);
    const nextAgendaItem = [...missionRows]
      .filter((row) => row.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())[0];
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
    const sortedConversations = [...conversations]
      .sort((a, b) => {
        const aTime = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
        const bTime = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, 3);
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
      missionRows,
      proposedAgreements,
      billingReady,
      billingPending,
      billingReadyTotal,
      nextAgendaItem,
      latestReceivedMessages,
      unreadReceivedMessages,
      missionRowsByDay,
      weekCarousel,
      sortedConversations,
    };
  }, [applications, conversations, documents, notifications, profile?.userId]);

  const financeStatus = useMemo(() => {
    let tone: 'success' | 'warning' | 'info' | 'neutral' = 'neutral';
    let label = 'Aucune action urgente';
    let amountLabel = 'Registre à jour';
    let description = 'Suivez vos recettes, provisions et remplacements hors MediLink.';
    let buttonText = 'Voir ma compta';
    let buttonHref = '/app/billing';
    let buttonVariant: 'primary' | 'secondary' | 'light' = 'light';

    if (dashboard.proposedAgreements.length > 0) {
      tone = 'warning';
      label = 'Proposition à valider';
      amountLabel = `${dashboard.proposedAgreements.length} à traiter`;
      description = 'Répondez aux conditions finales depuis la messagerie avant d’alimenter votre registre.';
      buttonText = 'Répondre';
      buttonHref = '/app/messages';
      buttonVariant = 'secondary';
    } else if (dashboard.billingReady.length > 0) {
      tone = 'success';
      label = 'Recette à classer';
      amountLabel = `${formatMoney(dashboard.billingReadyTotal)} prêts`;
      description = 'Retrouvez ces recettes dans votre livre comptable avec les justificatifs PDF.';
      buttonText = 'Ouvrir le registre';
      buttonHref = '/app/billing';
      buttonVariant = 'secondary';
    } else if (dashboard.billingPending.length > 0) {
      tone = 'info';
      label = 'Mission en attente';
      amountLabel = `${dashboard.billingPending.length} en attente`;
      description = 'Les missions validées entreront dans le registre après paiement libéré.';
      buttonText = 'Voir ma compta';
      buttonHref = '/app/billing';
      buttonVariant = 'light';
    }

    return { tone, label, amountLabel, description, buttonText, buttonHref, buttonVariant };
  }, [dashboard.proposedAgreements.length, dashboard.billingReady.length, dashboard.billingReadyTotal, dashboard.billingPending.length]);

  if (loading) return <LoadingCard />;

  const firstName = profile?.firstName || 'Bienvenue';
  const completionScore = profile?.completionScore || 0;
  const profileReady = completionScore >= 80;

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
                <LinkButton
                  variant="light"
                  href={dashboard.nextAgendaItem.application.missionId ? `/app/missions/${dashboard.nextAgendaItem.application.missionId}` : '/app/agenda'}
                >
                  Voir
                </LinkButton>
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
          <Card className="dashboard-focus-card dashboard-notifications">
            <div className="dashboard-section-head">
              <div>
                <span>Notifications</span>
                <h2>Alertes récentes</h2>
              </div>
              <LinkButton variant="light" href="/app/notifications">Tout voir</LinkButton>
            </div>
            <div className="dashboard-message-summary">
              <div>
                <span>Non lues</span>
                <strong>{dashboard.unreadNotifications.length}</strong>
              </div>
              <div>
                <span>Total</span>
                <strong>{notifications.length}</strong>
              </div>
            </div>
            {notifications.length > 0 ? (
              <div className="dashboard-notification-list">
                {notifications.slice(0, 10).map((notification) => {
                  const notificationLink = getNotificationLink(notification);
                  return (
                    <div key={notification.id} className="dashboard-notification">
                      <div className="actions">
                        <Badge tone={notification.readAt ? 'neutral' : 'warning'}>{notification.readAt ? 'Lue' : 'Non lue'}</Badge>
                        <span className="small">{formatDateTime(notification.createdAt)}</span>
                      </div>
                      <strong>{notification.title}</strong>
                      <p>{getNotificationBody(notification, conversations)}</p>
                      {notificationLink ? (
                        <Link
                          href={notificationLink}
                          className="notification-action-link"
                        >
                          {getNotificationLinkLabel(notification)} &rarr;
                        </Link>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-empty compact">
                <strong>Aucune notification</strong>
                <p>Les réponses, messages et alertes de dossier apparaîtront ici.</p>
              </div>
            )}
          </Card>

          <Card className="dashboard-focus-card">
            <div className="dashboard-section-head">
              <div>
                <span>Messages</span>
                <h2>Messages reçus</h2>
              </div>
              <LinkButton variant="light" href="/app/messages">Ouvrir</LinkButton>
            </div>
            {dashboard.sortedConversations.length > 0 ? (
              <div className="dashboard-mini-list dashboard-message-list">
                {dashboard.sortedConversations.map((conversation) => {
                  const lastMessage = conversation.messages?.[0];
                  const userId = profile?.userId;
                  const unreadCount = (conversation.messages || [])
                    .filter((msg) => !userId || msg.senderUserId !== userId)
                    .filter((msg) => !msg.readAt).length;
                  const isMine = lastMessage?.senderUserId === userId;
                  return (
                    <Link
                      key={conversation.id}
                      href={`/app/messages?id=${conversation.id}`}
                      className="dashboard-message-link"
                    >
                      <div className="dashboard-message-link-main">
                        <strong>{conversation.establishment?.name || conversation.mission?.title || 'Conversation'}</strong>
                        <span>
                          {isMine ? 'Vous : ' : ''}
                          {messagePreview(lastMessage?.body)}
                        </span>
                      </div>
                      <div className="dashboard-message-link-meta">
                        {unreadCount > 0 ? (
                          <Badge tone="warning">Non lu</Badge>
                        ) : null}
                        <span className="small">{formatDateTime(conversation.lastMessageAt)}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="dashboard-empty compact">
                <strong>Aucun message reçu</strong>
                <p>Les réponses des établissements apparaîtront ici.</p>
              </div>
            )}
          </Card>

          <Card className="dashboard-focus-card dashboard-finance-card">
            <div className="dashboard-section-head">
              <div>
                <span>Comptabilité</span>
                <h2>Ma compta</h2>
              </div>
              <LinkButton variant="light" href="/app/billing">Ouvrir</LinkButton>
            </div>
            <div className={`dashboard-finance-status is-${financeStatus.tone}`}>
              <div className="finance-status-header">
                <span className="status-dot" />
                <span>{financeStatus.label}</span>
              </div>
              <strong>{financeStatus.amountLabel}</strong>
              <p>{financeStatus.description}</p>
              <LinkButton
                href={financeStatus.buttonHref}
                variant={financeStatus.buttonVariant}
              >
                {financeStatus.buttonText}
              </LinkButton>
            </div>
          </Card>
        </section>

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
      </div>
    </>
  );
}
