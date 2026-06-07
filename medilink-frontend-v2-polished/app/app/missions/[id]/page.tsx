'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import {
  agreementLabel,
  agreementNextStep,
  candidateAmountLabel,
  conversationForApplication,
  latestAgreement,
} from '@/lib/candidate-workspace';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabels, statusLabel } from '@/lib/labels';
import { getCandidateBillingMissionPath, getCandidateConversationPath, getMissionApplyPath } from '@/lib/mission-links';
import type { Application, Conversation, Mission, MissionAgreement } from '@/lib/types';
import { Alert, Badge, Button, Card, EmptyState, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

type MissionContext = {
  application: Application;
  conversation: Conversation | null;
  agreement: MissionAgreement | null;
};

function missionDate(application: Application, agreement?: MissionAgreement | null) {
  return agreement?.startDate || application.mission?.startDate || null;
}

function missionEndDate(application: Application, agreement?: MissionAgreement | null) {
  return agreement?.endDate || application.mission?.endDate || null;
}

function establishmentAddress(mission?: Mission) {
  const establishment = mission?.establishment;
  return [
    mission?.location || establishment?.address,
    mission?.city || establishment?.city,
    establishment?.country,
  ].filter(Boolean).join(', ') || 'Adresse a confirmer';
}

function mapsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function isPersonalMission(context?: MissionContext | null) {
  if (!context) return false;
  const agreementStatus = context.agreement?.status;
  return context.application.status === 'ACCEPTED'
    || ['PROPOSED', 'PAYMENT_REQUIRED', 'FUNDS_SECURED', 'COMPLETED', 'PAYMENT_RELEASED'].includes(agreementStatus || '');
}

function contextDetails(mission?: Mission) {
  return [
    { label: 'Service', value: mission?.departmentInfo || mission?.sector },
    { label: 'Equipe', value: mission?.teamInfo },
    { label: 'Materiel', value: mission?.equipmentInfo || mission?.equipmentAvailable?.join(', ') },
    { label: 'Logiciel', value: mission?.softwareUsed || mission?.establishment?.softwareUsed },
    { label: 'Patientele', value: mission?.patientType || mission?.establishment?.patientType },
    { label: 'Patients / jour', value: mission?.averagePatientsPerDay ? `${mission.averagePatientsPerDay}` : null },
    { label: 'Secretariat', value: mission?.hasSecretary ? mission.secretaryType || 'Disponible' : null },
    { label: 'Parking', value: mission?.parkingAvailable ? 'Disponible' : null },
    { label: 'Logement', value: mission?.accommodationProvided ? 'Fourni' : null },
  ].filter((item) => item.value);
}

function MissionAnnouncementView({
  mission,
  application,
  conversation,
}: {
  mission: Mission;
  application?: Application | null;
  conversation?: Conversation | null;
}) {
  const detailItems = contextDetails(mission);
  const address = establishmentAddress(mission);
  const hasApplied = Boolean(application);

  return (
    <div className="candidate-mission-detail-page">
      <PageHeader
        title={mission.title}
        description="Annonce de mission consultee dans votre espace candidat."
        actions={
          <>
            <LinkButton href="/app/search" variant="light">Retour aux annonces</LinkButton>
            {hasApplied ? null : <LinkButton href={getMissionApplyPath(mission.id)}>Postuler</LinkButton>}
          </>
        }
      />

      {application ? (
        <Alert type="info">
          Candidature {statusLabel(application.status).toLowerCase()}. La page deviendra votre suivi de mission personnel quand l'etablissement aura valide la mission.
        </Alert>
      ) : null}

      <div className="candidate-current-grid">
        <Card className="candidate-current-panel">
          <span>Annonce</span>
          <strong>{missionTypeLabel(mission.missionType)} - {requiredLevelLabels(mission.requiredLevels, mission.requiredLevel)}</strong>
          <p>{mission.description || 'Aucune description pour cette mission.'}</p>
          <small>{mission.specialty || 'Specialite non precisee'}</small>
        </Card>

        <Card className="candidate-current-panel">
          <span>Remuneration</span>
          <strong>{formatCompensation(mission)}</strong>
          <p>{mission.establishment?.name || 'Etablissement'} - {mission.city}</p>
          <small>{formatDate(mission.startDate)} {mission.startTime ? `- ${mission.startTime}` : ''}{mission.endTime ? ` / ${mission.endTime}` : ''}</small>
        </Card>
      </div>

      <div className="candidate-current-info">
        <Card>
          <h3>Informations pratiques</h3>
          <div className="info-list">
            <div><span>Date</span><strong>{formatDate(mission.startDate)}</strong></div>
            <div><span>Fin</span><strong>{formatDate(mission.endDate)}</strong></div>
            <div><span>Horaire</span><strong>{mission.startTime || '-'} {mission.endTime ? `- ${mission.endTime}` : ''}</strong></div>
            <div><span>Duree</span><strong>{mission.durationHours || '-'} h</strong></div>
            <div><span>Adresse</span><strong>{address}</strong></div>
          </div>
        </Card>

        <Card>
          <h3>Etablissement</h3>
          <p>{mission.establishment?.name || 'Etablissement a confirmer'}</p>
          <p className="small">{mission.establishment?.description || mission.practicalInfo || 'Les details complementaires seront confirmes dans la messagerie.'}</p>
        </Card>
      </div>

      {detailItems.length > 0 ? (
        <div className="candidate-current-detail-grid">
          {detailItems.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <div className="actions">
        {hasApplied ? null : <LinkButton href={getMissionApplyPath(mission.id)}>Postuler</LinkButton>}
        {conversation ? <LinkButton href={getCandidateConversationPath(conversation.id)} variant="secondary">Ouvrir la discussion</LinkButton> : null}
      </div>
    </div>
  );
}

export default function CandidateMissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [publicMission, setPublicMission] = useState<Mission | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [nextApplications, nextConversations, nextMission] = await Promise.all([
        api.get<Application[]>('/me/applications'),
        api.get<Conversation[]>('/conversations'),
        api.get<Mission>(`/missions/${id}`).catch(() => null),
      ]);
      setApplications(nextApplications);
      setConversations(nextConversations);
      setPublicMission(nextMission);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  const context = useMemo<MissionContext | null>(() => {
    const application = applications.find((item) => item.missionId === id) || null;
    if (!application) return null;
    const conversation = conversationForApplication(application, conversations);
    return {
      application,
      conversation,
      agreement: latestAgreement(conversation),
    };
  }, [applications, conversations, id]);

  async function withdraw(appId: string) {
    if (!context) return;
    const isAccepted = context.application.status === 'ACCEPTED';
    const confirmMessage = isAccepted 
      ? 'Annuler cette mission ?' 
      : 'Retirer cette candidature ?';
      
    if (!confirm(confirmMessage)) return;
    try {
      await api.post(`/applications/${appId}/withdraw`, {});
      void load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <LoadingCard label="Chargement de votre mission..." />;

  if (error) {
    return (
      <>
        <PageHeader title="Mission" description="Impossible de charger le suivi de mission." />
        <Alert type="error">{error}</Alert>
      </>
    );
  }

  if (!context) {
    if (publicMission) {
      return <MissionAnnouncementView mission={publicMission} />;
    }

    return (
      <>
        <PageHeader
          title="Mission"
          description="Cette mission n'est pas encore rattachee a votre espace candidat."
          actions={<LinkButton href="/app/search" variant="light">Retour aux annonces</LinkButton>}
        />
        <EmptyState
          title="Aucun suivi candidat"
          description="Postulez d'abord a la mission pour ouvrir un suivi personnel."
          action={<LinkButton href={getMissionApplyPath(id)}>Postuler</LinkButton>}
        />
      </>
    );
  }

  if (!isPersonalMission(context)) {
    const mission = context.application.mission || publicMission;
    if (mission) {
      return (
        <MissionAnnouncementView
          mission={mission}
          application={context.application}
          conversation={context.conversation}
        />
      );
    }
  }

  const mission = context.application.mission;
  const address = establishmentAddress(mission);
  const hasAddress = address !== 'Adresse a confirmer';
  const detailItems = contextDetails(mission);
  const start = missionDate(context.application, context.agreement);
  const end = missionEndDate(context.application, context.agreement);

  return (
    <div className="candidate-mission-detail-page">
      <PageHeader
        title={mission?.title || 'Ma mission'}
        description="Votre page de mission personnelle : statut, brief, lieu, documents et compta."
        actions={
          <>
            {context.conversation ? <LinkButton href={getCandidateConversationPath(context.conversation.id)}>Messagerie</LinkButton> : null}
          </>
        }
      />

      <section className="candidate-command-strip" aria-label="Mission personnelle">
        <div className="candidate-command-main">
          <span>Mission confirmee</span>
          <h2>{mission?.establishment?.name || mission?.city || 'Etablissement a confirmer'}</h2>
          <p>{address}</p>
        </div>
        <div className="candidate-command-stat">
          <span>Debut</span>
          <strong>{formatDate(start)}</strong>
          <small>{end ? `Fin ${formatDate(end)}` : 'Fin a confirmer'}</small>
        </div>
        <div className="candidate-command-stat">
          <span>Statut</span>
          <strong>{context.agreement ? agreementLabel(context.agreement.status) : statusLabel(context.application.status)}</strong>
          <small>{agreementNextStep(context.agreement?.status)}</small>
        </div>
        <div className="candidate-command-actions">
          {hasAddress ? <a className="btn btn-light" href={mapsHref(address)} target="_blank" rel="noreferrer">Itineraire</a> : null}
          <LinkButton href={getCandidateBillingMissionPath(context.conversation, context.agreement)} variant="secondary">Compta</LinkButton>
        </div>
      </section>

      <div className="candidate-current-grid">
        <Card className="candidate-current-panel">
          <span>Brief</span>
          <strong>{missionTypeLabel(mission?.missionType)} - {requiredLevelLabels(mission?.requiredLevels, mission?.requiredLevel)}</strong>
          <p>{mission?.description || mission?.practicalInfo || 'Brief a confirmer dans la messagerie.'}</p>
          <small>{mission?.specialty || 'Specialite a confirmer'}</small>
        </Card>

        <Card className="candidate-current-panel">
          <span>Remuneration</span>
          <strong>{context.agreement ? candidateAmountLabel(context.agreement) : formatCompensation(mission || {})}</strong>
          <p>{context.agreement ? agreementLabel(context.agreement.status) : statusLabel(context.application.status)}</p>
          <small>{context.agreement?.terms || 'Conditions a retrouver dans la proposition ou la messagerie.'}</small>
        </Card>
      </div>

      <div className="candidate-current-info">
        <Card>
          <h3>Consignes</h3>
          <p>{mission?.practicalInfo || mission?.departmentInfo || 'Les consignes detaillees seront ajoutees par l etablissement ou envoyees dans la messagerie.'}</p>
        </Card>
        <Card>
          <h3>Lieu & contact</h3>
          <p>{address}</p>
          <p className="small">{mission?.establishment?.phone || mission?.establishment?.email || 'Contact via la messagerie MediLink'}</p>
        </Card>
      </div>

      {detailItems.length > 0 ? (
        <div className="candidate-current-detail-grid">
          {detailItems.map((item) => (
            <div key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
      ) : null}

      <div className="actions">
        {context.conversation ? <LinkButton href={getCandidateConversationPath(context.conversation.id)} variant="secondary">Contacter l'etablissement</LinkButton> : null}
        <Button
          variant="danger"
          onClick={() => withdraw(context.application.id)}
          disabled={['CANCELLED', 'WITHDRAWN', 'REJECTED'].includes(context.application.status)}
        >
          {context.application.status === 'ACCEPTED' ? 'Annuler la mission' : 'Retirer ma candidature'}
        </Button>
      </div>
    </div>
  );
}
