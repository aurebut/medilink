'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { agreementLabel, agreementNextStep, agreementTone, conversationForApplication, latestAgreement } from '@/lib/candidate-workspace';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabels, statusLabel } from '@/lib/labels';
import type { Application, Conversation, Mission, MissionAgreement } from '@/lib/types';
import { Alert, Badge, Card, EmptyState, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

type MissionStep = {
  key: string;
  label: string;
  helper: string;
  active: boolean;
  done: boolean;
};

type MissionRow = {
  application: Application;
  conversation: Conversation | null;
  agreement: MissionAgreement | null;
  startDate?: string | null;
};

function missionStart(application: Application, agreement?: MissionAgreement | null) {
  return agreement?.startDate || application.mission?.startDate || null;
}

function missionEnd(application: Application, agreement?: MissionAgreement | null) {
  return agreement?.endDate || application.mission?.endDate || missionStart(application, agreement);
}

function startDateTime(application: Application, agreement?: MissionAgreement | null) {
  const mission = application.mission;
  const date = missionStart(application, agreement);
  const time = agreement?.startTime || mission?.startTime || '00:00';
  const day = date?.slice(0, 10);
  return day ? new Date(`${day}T${time}`) : null;
}

function endDateTime(application: Application, agreement?: MissionAgreement | null) {
  const mission = application.mission;
  const date = missionEnd(application, agreement);
  const time = agreement?.endTime || mission?.endTime || '23:59';
  const day = date?.slice(0, 10);
  return day ? new Date(`${day}T${time}`) : null;
}

function timingLabel(application: Application, agreement?: MissionAgreement | null) {
  const start = startDateTime(application, agreement);
  const end = endDateTime(application, agreement);
  const now = new Date();
  if (!start || !end) return 'Planning a confirmer';
  if (now > end) return `Terminee le ${formatDate(missionEnd(application, agreement))}`;
  if (now >= start && now <= end) return 'En mission maintenant';

  const hours = Math.ceil((start.getTime() - now.getTime()) / 3600000);
  if (hours <= 24) return 'Depart dans moins de 24 h';
  return `Depart dans ${Math.ceil(hours / 24)} jours`;
}

function missionSchedule(application: Application, agreement?: MissionAgreement | null) {
  const mission = application.mission;
  const start = missionStart(application, agreement);
  const end = missionEnd(application, agreement);
  if (!start) return 'Planning a confirmer';
  const dates = end && end !== start ? `${formatDate(start)} - ${formatDate(end)}` : formatDate(start);
  const hours = [
    agreement?.startTime || mission?.startTime,
    agreement?.endTime || mission?.endTime,
  ].filter(Boolean).join(' - ');
  return hours ? `${dates} - ${hours}` : dates;
}

function missionProgress(application: Application, agreement?: MissionAgreement | null): MissionStep[] {
  const status = agreement?.status;
  const start = startDateTime(application, agreement);
  const end = endDateTime(application, agreement);
  const now = new Date();
  const hasDetails = Boolean(application.mission?.practicalInfo || application.mission?.departmentInfo || application.mission?.teamInfo);
  const confirmed = application.status === 'ACCEPTED' || Boolean(agreement);
  const secured = ['FUNDS_SECURED', 'COMPLETED', 'PAYMENT_RELEASED'].includes(status || '');
  const active = Boolean(start && end && now >= start && now <= end);
  const completed = Boolean(status === 'COMPLETED' || status === 'PAYMENT_RELEASED' || (end && now > end));

  return [
    { key: 'accepted', label: 'Mission acceptee', helper: 'L etablissement a valide votre candidature.', active: confirmed && !hasDetails, done: confirmed },
    { key: 'details', label: 'Details recus', helper: 'Lieu, service, horaires et consignes sont disponibles.', active: hasDetails && !secured, done: hasDetails },
    { key: 'confirmed', label: 'Depart confirme', helper: secured ? 'La mission est confirmee.' : 'En attente des dernieres confirmations.', active: secured && !active, done: secured },
    { key: 'active', label: 'Sur place', helper: active ? 'Mission en cours.' : 'A effectuer le jour J.', active, done: completed },
    { key: 'closed', label: 'Fin & compta', helper: completed ? 'Suivi comptable disponible.' : 'La compta sera mise a jour apres validation.', active: completed, done: completed },
  ];
}

function missionSortValue(row: MissionRow) {
  const start = row.startDate ? new Date(row.startDate).getTime() : Number.MAX_SAFE_INTEGER;
  return Number.isNaN(start) ? Number.MAX_SAFE_INTEGER : start;
}

function establishmentAddress(mission?: Mission) {
  const establishment = mission?.establishment;
  return [
    mission?.location || establishment?.address,
    mission?.city || establishment?.city,
    establishment?.country,
  ].filter(Boolean).join(', ') || 'Adresse a confirmer';
}

function readableList(values?: string[] | null) {
  return values?.length ? values.join(', ') : null;
}

export default function CandidateCurrentMissionsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const rows = useMemo(() => {
    return applications
      .map((application) => {
        const conversation = conversationForApplication(application, conversations);
        const agreement = latestAgreement(conversation);
        return {
          application,
          conversation,
          agreement,
          startDate: missionStart(application, agreement),
        };
      })
      .filter((row) => {
        const agreementStatus = row.agreement?.status;
        return row.application.status === 'ACCEPTED'
          || ['PROPOSED', 'PAYMENT_REQUIRED', 'FUNDS_SECURED', 'COMPLETED', 'PAYMENT_RELEASED'].includes(agreementStatus || '');
      })
      .sort((a, b) => missionSortValue(a) - missionSortValue(b));
  }, [applications, conversations]);

  const selectedRow = rows.find((row) => row.application.id === selectedId) || rows[0] || null;

  useEffect(() => {
    if (!selectedId && rows[0]) setSelectedId(rows[0].application.id);
  }, [rows, selectedId]);

  if (loading) return <LoadingCard label="Chargement de vos missions en cours..." />;

  return (
    <>
      <PageHeader
        title="Missions en cours"
        description="Votre suivi de mission cote candidat : depart, consignes, etablissement et prochaines actions."
        actions={<LinkButton href="/app/messages" variant="light">Messagerie</LinkButton>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune mission en cours"
          description="Une mission apparait ici des qu'une candidature est acceptee ou qu'une proposition est envoyee par un etablissement."
          action={<LinkButton href="/app/search">Trouver une mission</LinkButton>}
        />
      ) : (
        <div className="candidate-current-layout">
          <div className="candidate-current-list">
            {rows.map((row) => {
              const mission = row.application.mission;
              const selected = selectedRow?.application.id === row.application.id;
              return (
                <button
                  key={row.application.id}
                  type="button"
                  className={`candidate-current-card ${selected ? 'selected' : ''}`}
                  onClick={() => setSelectedId(row.application.id)}
                >
                  <span className="candidate-current-card-head">
                    <Badge tone={row.agreement ? agreementTone(row.agreement.status) : 'success'}>
                      {row.agreement ? agreementLabel(row.agreement.status) : statusLabel(row.application.status)}
                    </Badge>
                    <span>{timingLabel(row.application, row.agreement)}</span>
                  </span>
                  <strong>{mission?.title || 'Mission confirmee'}</strong>
                  <span>{mission?.establishment?.name || mission?.city || 'Etablissement a confirmer'}</span>
                  <small>{missionSchedule(row.application, row.agreement)}</small>
                </button>
              );
            })}
          </div>

          {selectedRow ? (
            <MissionControlPanel row={selectedRow} />
          ) : null}
        </div>
      )}
    </>
  );
}

function MissionControlPanel({ row }: { row: MissionRow }) {
  const mission = row.application.mission;
  const establishment = mission?.establishment;
  const progress = missionProgress(row.application, row.agreement);
  const detailItems = [
    { label: 'Service', value: mission?.departmentInfo || mission?.sector },
    { label: 'Equipe', value: mission?.teamInfo },
    { label: 'Materiel', value: mission?.equipmentInfo || readableList(mission?.equipmentAvailable) },
    { label: 'Logiciel', value: mission?.softwareUsed || establishment?.softwareUsed },
    { label: 'Patients / jour', value: mission?.averagePatientsPerDay ? `${mission.averagePatientsPerDay}` : null },
    { label: 'Secretariat', value: mission?.hasSecretary ? mission.secretaryType || 'Disponible' : null },
    { label: 'Parking', value: mission?.parkingAvailable ? 'Disponible' : null },
    { label: 'Logement', value: mission?.accommodationProvided ? 'Fourni' : null },
  ].filter((item) => item.value);
  const nextStep = row.agreement ? agreementNextStep(row.agreement.status) : 'Echanger avec l etablissement pour confirmer les derniers details.';

  return (
    <Card className="candidate-current-detail">
      <div className="candidate-current-hero">
        <div>
          <Badge tone={row.agreement ? agreementTone(row.agreement.status) : 'success'}>
            {row.agreement ? agreementLabel(row.agreement.status) : 'Candidature acceptee'}
          </Badge>
          <h2>{mission?.title || 'Mission confirmee'}</h2>
          <p>{establishment?.name || mission?.city || 'Etablissement a confirmer'}</p>
        </div>
        <div className="candidate-current-timing">
          <span>{timingLabel(row.application, row.agreement)}</span>
          <strong>{missionSchedule(row.application, row.agreement)}</strong>
        </div>
      </div>

      <div className="candidate-current-route">
        {progress.map((step) => (
          <div key={step.key} className={`${step.done ? 'done' : ''} ${step.active ? 'active' : ''}`}>
            <span aria-hidden="true" />
            <div>
              <strong>{step.label}</strong>
              <small>{step.helper}</small>
            </div>
          </div>
        ))}
      </div>

      <div className="candidate-current-grid">
        <div className="candidate-current-panel">
          <span>Etablissement</span>
          <strong>{establishment?.name || 'A confirmer'}</strong>
          <p>{establishmentAddress(mission)}</p>
          <small>{establishment?.phone || establishment?.email || 'Contact via la messagerie MediLink'}</small>
        </div>

        <div className="candidate-current-panel">
          <span>Mission</span>
          <strong>{missionTypeLabel(mission?.missionType)} - {requiredLevelLabels(mission?.requiredLevels, mission?.requiredLevel)}</strong>
          <p>{formatCompensation(row.agreement || mission || {})}</p>
          <small>{mission?.specialty || 'Specialite a confirmer'}</small>
        </div>
      </div>

      <div className="candidate-current-info">
        <div>
          <h3>Consignes de l etablissement</h3>
          <p>{mission?.practicalInfo || mission?.description || 'Les consignes detaillees seront ajoutees par l etablissement ou envoyees dans la messagerie.'}</p>
        </div>
        <div>
          <h3>Prochaine action</h3>
          <p>{nextStep}</p>
        </div>
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
        {row.conversation ? <LinkButton href="/app/messages">Contacter l etablissement</LinkButton> : null}
        {mission?.id ? <LinkButton href={`/app/missions/${mission.id}`} variant="light">Voir la mission</LinkButton> : null}
        <LinkButton href="/app/billing" variant="light">Suivi compta</LinkButton>
      </div>
    </Card>
  );
}
