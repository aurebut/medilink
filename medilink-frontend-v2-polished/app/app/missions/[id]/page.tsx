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
import { getMissionApplyPath, getMissionPublicPath } from '@/lib/mission-links';
import type { Application, Conversation, Mission, MissionAgreement } from '@/lib/types';
import { Alert, Badge, Card, EmptyState, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

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

export default function CandidateMissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<Application[]>('/me/applications'),
      api.get<Conversation[]>('/conversations'),
    ]).then(([nextApplications, nextConversations]) => {
      setApplications(nextApplications);
      setConversations(nextConversations);
    }).catch((e: any) => {
      setError(e.message);
    }).finally(() => setLoading(false));
  }, []);

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
    return (
      <>
        <PageHeader
          title="Mission"
          description="Cette mission n'est pas encore rattachee a votre espace candidat."
          actions={<LinkButton href={getMissionPublicPath(id)} variant="light">Voir l'annonce</LinkButton>}
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
    return (
      <>
        <PageHeader
          title={context.application.mission?.title || 'Mission'}
          description="Votre candidature est en cours de traitement. La page personnelle s'activera quand la mission sera validee."
          actions={<LinkButton href={getMissionPublicPath(id)} variant="light">Voir l'annonce</LinkButton>}
        />
        <Card>
          <div className="workspace-card-head">
            <div>
              <h3>Statut de candidature</h3>
              <p className="small">{context.application.mission?.establishment?.name || context.application.mission?.city || 'Etablissement a confirmer'}</p>
            </div>
            <Badge tone={context.application.status === 'VIEWED' ? 'warning' : 'neutral'}>{statusLabel(context.application.status)}</Badge>
          </div>
          <p>Le detail operationnel apparaitra ici des que l'etablissement aura accepte votre candidature ou envoye une proposition.</p>
          <div className="actions">
            {context.conversation ? <LinkButton href={`/app/messages?id=${context.conversation.id}`}>Ouvrir la discussion</LinkButton> : null}
            <LinkButton href={getMissionPublicPath(id)} variant="light">Relire l'annonce</LinkButton>
          </div>
        </Card>
      </>
    );
  }

  const mission = context.application.mission;
  const address = establishmentAddress(mission);
  const hasAddress = address !== 'Adresse a confirmer';
  const detailItems = contextDetails(mission);
  const start = missionDate(context.application, context.agreement);
  const end = missionEndDate(context.application, context.agreement);

  return (
    <>
      <PageHeader
        title={mission?.title || 'Ma mission'}
        description="Votre page de mission personnelle : statut, brief, lieu, documents et compta."
        actions={
          <>
            <LinkButton href="/app/current-missions" variant="light">Missions en cours</LinkButton>
            {context.conversation ? <LinkButton href={`/app/messages?id=${context.conversation.id}`}>Messagerie</LinkButton> : null}
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
          <LinkButton href="/app/billing" variant="secondary">Compta</LinkButton>
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
        <LinkButton href={getMissionPublicPath(id)} variant="light">Voir l'annonce publique</LinkButton>
        {context.conversation ? <LinkButton href={`/app/messages?id=${context.conversation.id}`} variant="secondary">Contacter l'etablissement</LinkButton> : null}
      </div>
    </>
  );
}
