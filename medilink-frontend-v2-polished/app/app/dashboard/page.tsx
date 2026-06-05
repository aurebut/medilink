'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { agreementLabel, agreementNextStep, agreementTone, candidateAmountLabel, conversationForApplication, latestAgreement, missionDateValue } from '@/lib/candidate-workspace';
import { formatDate, formatDateTime } from '@/lib/format';
import { gendered } from '@/lib/grammar';
import { statusLabel } from '@/lib/labels';
import type { Application, Conversation, Document, Notification, Profile } from '@/lib/types';
import { Badge, Card, LinkButton, LoadingCard, PageHeader, ProgressBar, StatCard } from '@/components/ui';

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
    };
  }, [applications, conversations, documents, notifications]);

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

      <section className="dashboard-hero">
        <div className="dashboard-hero-copy">
          <span className="dashboard-eyebrow">Priorité du jour</span>
          <h2>{nextStep.label}</h2>
          <p>{nextStep.helper}</p>
          <div className="actions">
            <LinkButton href={nextStep.href}>Continuer</LinkButton>
            <LinkButton variant="light" href="/app/agenda">Ouvrir l’agenda</LinkButton>
            <LinkButton variant="light" href="/app/messages">Ouvrir la messagerie</LinkButton>
          </div>
        </div>
        <div className="dashboard-readiness">
          <div>
            <span>Profil</span>
            <strong>{completionScore}%</strong>
            <ProgressBar value={completionScore} />
          </div>
          <div>
            <span>Documents valides</span>
            <strong>{dashboard.approvedDocuments.length}/{documents.length || 0}</strong>
          </div>
          <div>
            <span>Prochaine date</span>
            <strong>{dashboard.nextAgendaItem?.date ? formatDate(dashboard.nextAgendaItem.date) : 'Aucune'}</strong>
          </div>
        </div>
      </section>

      <div className="grid-3 dashboard-stat-grid">
        <StatCard
          label={`Dossier ${gendered(profile, 'candidat', 'candidate')}`}
          value={profileReady ? gendered(profile, 'Prêt', 'Prête') : `${completionScore}%`}
          helper={<ProgressBar value={completionScore} />}
          action={<LinkButton variant="secondary" href="/app/profile">Améliorer</LinkButton>}
        />
        <StatCard
          label="Documents"
          value={`${dashboard.approvedDocuments.length}/${documents.length || 0}`}
          helper={`${dashboard.pendingDocuments.length} en attente - ${dashboard.blockedDocuments.length} à corriger`}
          action={<LinkButton variant="secondary" href="/app/profile">Gérer</LinkButton>}
        />
        <StatCard
          label="Candidatures actives"
          value={dashboard.activeApplications.length}
          helper={`${dashboard.acceptedApplications.length} acceptée(s) - ${applications.length} au total`}
          action={<LinkButton variant="secondary" href="/app/missions">Voir</LinkButton>}
        />
        <StatCard
          label="Agenda"
          value={dashboard.confirmedMissions.length}
          helper={`${dashboard.proposedAgreements.length} proposition(s) à traiter`}
          action={<LinkButton variant="secondary" href="/app/agenda">Planifier</LinkButton>}
        />
        <StatCard
          label="Facturation"
          value={dashboard.billingReady.length}
          helper="Justificatifs candidat disponibles"
          action={<LinkButton variant="secondary" href="/app/billing">Ouvrir</LinkButton>}
        />
      </div>

      <div className="dashboard-main">
        <Card className="dashboard-panel">
          <div className="toolbar">
            <div>
              <h2>Candidatures récentes</h2>
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

        <div className="dashboard-side">
          <Card className="dashboard-panel">
            <div className="toolbar">
              <div>
                <h2>Prochaine mission</h2>
                <p className="small">Votre prochain engagement confirmé.</p>
              </div>
            </div>
            {dashboard.nextMission ? (
              <div className="dashboard-feature">
                <span>{formatMissionDate(dashboard.nextMission)}</span>
                <strong>{dashboard.nextMission.mission?.title || 'Mission acceptée'}</strong>
                <p>{dashboard.nextMission.mission?.city || 'Lieu à confirmer'}</p>
              </div>
            ) : (
              <div className="dashboard-empty compact">
                <strong>Aucune mission acceptée</strong>
                <p>Les missions validées apparaîtront ici.</p>
              </div>
            )}
          </Card>

          <Card className="dashboard-panel">
            <div className="toolbar">
              <div>
                <h2>Compta</h2>
                <p className="small">Justificatifs et rétrocessions disponibles.</p>
              </div>
              <LinkButton variant="light" href="/app/billing">Ouvrir</LinkButton>
            </div>
            {dashboard.billingReady.length > 0 ? (
              <div className="dashboard-mini-list">
                {dashboard.billingReady.slice(0, 3).map(({ application, agreement }) => (
                  <div key={application.id}>
                    <span>{application.mission?.title || 'Mission'}</span>
                    <Badge tone="success">{candidateAmountLabel(agreement)}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-empty compact">
                <strong>Aucun justificatif disponible</strong>
                <p>Ils apparaîtront après validation de fin de mission.</p>
              </div>
            )}
          </Card>

          <Card className="dashboard-panel">
            <div className="toolbar">
              <div>
                <h2>Documents sensibles</h2>
                <p className="small">À surveiller pour éviter les blocages.</p>
              </div>
              <LinkButton variant="light" href="/app/profile">Gérer</LinkButton>
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
        </div>
      </div>

      <Card className="dashboard-panel dashboard-notifications">
        <div className="toolbar">
          <div>
            <h2>Dernières notifications</h2>
            <p className="small">Les alertes importantes de votre compte.</p>
          </div>
          <LinkButton variant="light" href="/app/notifications">Tout voir</LinkButton>
        </div>
        {notifications.length > 0 ? (
          <div className="dashboard-notification-grid">
            {notifications.slice(0, 3).map((notification) => (
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
    </>
  );
}
