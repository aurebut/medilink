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
import { getDepartmentLabel, getEquipmentLabel, getPatientTypeLabel, getSecretaryTypeLabel, getSectorLabel, getSoftwareLabel, getSpecialtyLabel } from '@/lib/profile-options';
import type { Application, Conversation, Mission, MissionAgreement } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
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
  ].filter(Boolean).join(', ') || 'Adresse à confirmer';
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
    { label: 'Service', value: getDepartmentLabel(mission?.departmentInfo) || getSectorLabel(mission?.sector) },
    { label: 'Équipe', value: mission?.teamInfo },
    { label: 'Matériel', value: mission?.equipmentInfo || mission?.equipmentAvailable?.map(getEquipmentLabel).join(', ') },
    { label: 'Logiciel', value: getSoftwareLabel(mission?.softwareUsed || mission?.establishment?.softwareUsed) },
    { label: 'Patientèle', value: getPatientTypeLabel(mission?.patientType || mission?.establishment?.patientType) },
    { label: 'Patients / jour', value: mission?.averagePatientsPerDay ? `${mission.averagePatientsPerDay}` : null },
    { label: 'Secrétariat', value: mission?.hasSecretary ? getSecretaryTypeLabel(mission.secretaryType) || 'Disponible' : null },
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
          Candidature {statusLabel(application.status).toLowerCase()}. La page deviendra votre suivi de mission personnel quand l'établissement aura validé la mission.
        </Alert>
      ) : null}

      <div className="candidate-current-grid">
        <Card className="candidate-current-panel">
          <span>Annonce</span>
          <strong>{missionTypeLabel(mission.missionType)} - {requiredLevelLabels(mission.requiredLevels, mission.requiredLevel)}</strong>
          <p>{mission.description || 'Aucune description pour cette mission.'}</p>
          <small>{getSpecialtyLabel(mission.specialty) || 'Spécialité non précisée'}</small>
        </Card>

        <Card className="candidate-current-panel">
          <span>Rémunération</span>
          <strong>{formatCompensation(mission)}</strong>
          <p>{mission.establishment?.name || 'Établissement'} - {mission.city}</p>
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
            <div><span>Durée</span><strong>{mission.durationHours || '-'} h</strong></div>
            <div><span>Adresse</span><strong>{address}</strong></div>
          </div>
        </Card>

        <Card>
          <h3>Établissement</h3>
          <p>{mission.establishment?.name || 'Établissement à confirmer'}</p>
          <p className="small">{mission.establishment?.description || mission.practicalInfo || 'Les détails complémentaires seront confirmés dans la messagerie.'}</p>
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
  const cachedApplications = api.getSync<Application[]>('/me/applications');
  const cachedConversations = api.getSync<Conversation[]>('/conversations');
  const cachedMission = api.getSync<Mission>(`/missions/${id}`);
  const [applications, setApplications] = useState<Application[]>(cachedApplications || []);
  const [conversations, setConversations] = useState<Conversation[]>(cachedConversations || []);
  const [publicMission, setPublicMission] = useState<Mission | null>(cachedMission || null);
  const [loading, setLoading] = useState(!(cachedApplications && cachedConversations));
  const [error, setError] = useState<string | null>(null);

  async function load(options: { silent?: boolean; reload?: boolean } = {}) {
    if (!options.silent) {
      const nextCachedApplications = options.reload ? null : api.getSync<Application[]>('/me/applications');
      const nextCachedConversations = options.reload ? null : api.getSync<Conversation[]>('/conversations');
      const nextCachedMission = options.reload ? null : api.getSync<Mission>(`/missions/${id}`);
      if (nextCachedApplications && nextCachedConversations) {
        setApplications(nextCachedApplications);
        setConversations(nextCachedConversations);
        setPublicMission(nextCachedMission || null);
        setLoading(false);
      } else {
        setLoading(true);
      }
    }
    try {
      const read = options.reload ? api.reload : api.get;
      const [nextApplications, nextConversations, nextMission] = await Promise.all([
        read<Application[]>('/me/applications'),
        read<Conversation[]>('/conversations'),
        read<Mission>(`/missions/${id}`).catch(() => null),
      ]);
      setApplications(nextApplications);
      setConversations(nextConversations);
      setPublicMission(nextMission);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  useAutoRefresh(() => load({ silent: true, reload: true }), { enabled: !loading });

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
          description="Cette mission n'est pas encore rattachée à votre espace candidat."
          actions={<LinkButton href="/app/search" variant="light">Retour aux annonces</LinkButton>}
        />
        <EmptyState
          title="Aucun suivi candidat"
          description="Postulez d'abord à la mission pour ouvrir un suivi personnel."
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
  const hasAddress = address !== 'Adresse à confirmer';
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
          <span>Mission confirmée</span>
          <h2>{mission?.establishment?.name || mission?.city || 'Établissement à confirmer'}</h2>
          <p>{address}</p>
        </div>
        <div className="candidate-command-stat">
          <span>Début</span>
          <strong>{formatDate(start)}</strong>
          <small>{end ? `Fin ${formatDate(end)}` : 'Fin à confirmer'}</small>
        </div>
        <div className="candidate-command-stat">
          <span>Statut</span>
          <strong>{context.agreement ? agreementLabel(context.agreement.status) : statusLabel(context.application.status)}</strong>
          <small>{agreementNextStep(context.agreement?.status)}</small>
        </div>
        <div className="candidate-command-actions">
          {hasAddress ? <a className="btn btn-light" href={mapsHref(address)} target="_blank" rel="noreferrer">Itinéraire</a> : null}
          <LinkButton href={getCandidateBillingMissionPath(context.conversation, context.agreement)} variant="secondary">Compta</LinkButton>
        </div>
      </section>

      <div className="candidate-current-grid">
        <Card className="candidate-current-panel">
          <span>Brief</span>
          <strong>{missionTypeLabel(mission?.missionType)} - {requiredLevelLabels(mission?.requiredLevels, mission?.requiredLevel)}</strong>
          <p>{mission?.description || mission?.practicalInfo || 'Brief à confirmer dans la messagerie.'}</p>
          <small>{getSpecialtyLabel(mission?.specialty) || 'Spécialité à confirmer'}</small>
        </Card>

        <Card className="candidate-current-panel">
          <span>Rémunération</span>
          <strong>{context.agreement ? candidateAmountLabel(context.agreement) : formatCompensation(mission || {})}</strong>
          <p>{context.agreement ? agreementLabel(context.agreement.status) : statusLabel(context.application.status)}</p>
          <small>{context.agreement?.terms || 'Conditions à retrouver dans la proposition ou la messagerie.'}</small>
        </Card>
      </div>

      <div className="candidate-current-info">
        <Card>
          <h3>Consignes</h3>
          <p>{mission?.practicalInfo || mission?.departmentInfo || 'Les consignes détaillées seront ajoutées par l\'établissement ou envoyées dans la messagerie.'}</p>
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
        {context.conversation ? <LinkButton href={getCandidateConversationPath(context.conversation.id)} variant="secondary">Contacter l'établissement</LinkButton> : null}
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
