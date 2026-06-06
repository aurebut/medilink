'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { agreementLabel, agreementNextStep, conversationForApplication, latestAgreement } from '@/lib/candidate-workspace';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabels, statusLabel } from '@/lib/labels';
import type { Application, Conversation, Mission, MissionAgreement } from '@/lib/types';
import { Alert, EmptyState, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

type MissionStep = {
  key: string;
  label: string;
  helper: string;
  status: string;
  active: boolean;
  done: boolean;
};

type MissionRow = {
  application: Application;
  conversation: Conversation | null;
  agreement: MissionAgreement | null;
  startDate?: string | null;
};

type MissionSection = 'pilotage' | 'brief' | 'lieu' | 'compta';

const missionSections: Array<{ id: MissionSection; label: string }> = [
  { id: 'pilotage', label: 'Pilotage' },
  { id: 'brief', label: 'Brief' },
  { id: 'lieu', label: 'Lieu & contact' },
  { id: 'compta', label: 'Compta & actions' },
];

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

function missionTimeRange(application: Application, agreement?: MissionAgreement | null) {
  const mission = application.mission;
  const hours = [
    agreement?.startTime || mission?.startTime,
    agreement?.endTime || mission?.endTime,
  ].filter(Boolean).join(' - ');
  return hours || 'Horaires a confirmer';
}

function missionDateRange(application: Application, agreement?: MissionAgreement | null) {
  const start = missionStart(application, agreement);
  const end = missionEnd(application, agreement);
  if (!start) {
    return { primary: 'Dates a confirmer', secondary: missionTimeRange(application, agreement) };
  }

  const sameDay = !end || end === start;
  return {
    primary: sameDay ? formatDate(start) : `${formatDate(start)} - ${formatDate(end)}`,
    secondary: sameDay ? missionTimeRange(application, agreement) : `Debut ${formatDate(start)} - Fin ${formatDate(end)}`,
  };
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
    { key: 'accepted', label: 'Mission acceptee', helper: 'L etablissement a valide votre candidature.', status: confirmed ? 'Valide' : 'A confirmer', active: confirmed && !hasDetails, done: confirmed },
    { key: 'details', label: 'Brief operationnel', helper: 'Lieu, service, horaires et consignes sont regroupes pour le depart.', status: hasDetails ? 'Recu' : 'A completer', active: hasDetails && !secured, done: hasDetails },
    { key: 'confirmed', label: 'Depart verrouille', helper: secured ? 'La mission est confirmee.' : 'En attente des dernieres confirmations.', status: secured ? 'Confirme' : 'En attente', active: secured && !active, done: secured },
    { key: 'active', label: 'Jour J', helper: active ? 'Mission en cours.' : 'A effectuer sur place selon le planning.', status: active ? 'En cours' : 'Planifie', active, done: completed },
    { key: 'closed', label: 'Cloture & compta', helper: completed ? 'Suivi comptable disponible.' : 'La compta sera mise a jour apres validation.', status: completed ? 'Pret' : 'A venir', active: completed, done: completed },
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

function rowPriority(row: MissionRow) {
  const start = startDateTime(row.application, row.agreement);
  const end = endDateTime(row.application, row.agreement);
  const now = new Date();
  if (end && now > end) return 4;
  if (start && end && now >= start && now <= end) return 0;
  if (start && start.getTime() - now.getTime() <= 24 * 3600000) return 1;
  if (row.agreement?.status === 'PROPOSED') return 2;
  return 3;
}

function mapsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export default function CandidateCurrentMissionsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeSection, setActiveSection] = useState<MissionSection>('pilotage');
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

  const priorityRow = useMemo(() => {
    return [...rows].sort((a, b) => rowPriority(a) - rowPriority(b) || missionSortValue(a) - missionSortValue(b))[0] || null;
  }, [rows]);

  const selectedRow = priorityRow || rows[0] || null;

  if (loading) return <LoadingCard label="Chargement de vos missions en cours..." />;

  return (
    <>
      <PageHeader
        title="Missions en cours"
        description="Votre suivi de mission cote candidat : depart, consignes, etablissement et prochaines actions."
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune mission en cours"
          description="Une mission apparait ici des qu'une candidature est acceptee ou qu'une proposition est envoyee par un etablissement."
          action={<LinkButton href="/app/search">Trouver une mission</LinkButton>}
        />
      ) : (
        <>
          <div className="candidate-page-tabs billing-tabs" role="tablist" aria-label="Sections de la mission selectionnee">
            {missionSections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={activeSection === section.id ? 'active' : ''}
                onClick={() => setActiveSection(section.id)}
                role="tab"
                aria-selected={activeSection === section.id}
              >
                {section.label}
              </button>
            ))}
          </div>

          <div className="candidate-current-layout">
            {selectedRow ? (
              <MissionControlPanel row={selectedRow} activeSection={activeSection} />
            ) : null}
          </div>
        </>
      )}
    </>
  );
}

function MissionCommandStrip({ row }: { row: MissionRow }) {
  const mission = row.application.mission;
  const address = establishmentAddress(mission);
  const hasAddress = address !== 'Adresse a confirmer';
  const dates = missionDateRange(row.application, row.agreement);
  return (
    <section className="candidate-command-strip" aria-label="Mission prioritaire">
      <div className="candidate-command-main">
        <span>Prochaine mission</span>
        <h2>{mission?.title || 'Mission confirmee'}</h2>
        <p>{mission?.establishment?.name || mission?.city || 'Etablissement a confirmer'} - {address}</p>
      </div>
      <div className="candidate-command-stat">
        <span>Dates</span>
        <strong>{dates.primary}</strong>
        <small>{dates.secondary}</small>
      </div>
      <div className="candidate-command-stat">
        <span>Statut</span>
        <strong>{row.agreement ? agreementLabel(row.agreement.status) : statusLabel(row.application.status)}</strong>
        <small>{agreementNextStep(row.agreement?.status)}</small>
      </div>
      <div className="candidate-command-actions">
        {row.conversation ? <LinkButton href="/app/messages" variant="secondary">Messagerie</LinkButton> : null}
        {hasAddress ? <a className="btn btn-light" href={mapsHref(address)} target="_blank" rel="noreferrer">Itineraire</a> : null}
      </div>
    </section>
  );
}

function MissionControlPanel({ row, activeSection }: { row: MissionRow; activeSection: MissionSection }) {
  const mission = row.application.mission;
  const establishment = mission?.establishment;
  const progress = missionProgress(row.application, row.agreement);
  const address = establishmentAddress(mission);
  const hasAddress = address !== 'Adresse a confirmer';
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
    <section className="candidate-current-detail candidate-current-unified">
      {activeSection === 'pilotage' ? <MissionCommandStrip row={row} /> : null}

      {activeSection === 'pilotage' ? (
        <>
          <div className="candidate-current-pilotage-grid">
            <section className="candidate-current-route" aria-label="Timeline de mission">
              <div className="candidate-current-route-head">
                <div>
                  <span>Timeline</span>
                  <strong>Avancement mission</strong>
                </div>
                <small>{nextStep}</small>
              </div>
              <div className="candidate-current-route-list">
                {progress.map((step, index) => (
                  <div key={step.key} className={`${step.done ? 'done' : ''} ${step.active ? 'active' : ''}`}>
                    <span aria-hidden="true">{step.done ? '' : index + 1}</span>
                    <div>
                      <div className="candidate-current-route-title">
                        <strong>{step.label}</strong>
                        <small>{step.status}</small>
                      </div>
                      <p>{step.helper}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </>
      ) : null}

      {activeSection === 'brief' ? (
        <div className="candidate-current-tab-panel">
          <div className="candidate-current-grid">
            <div className="candidate-current-panel">
              <span>Mission</span>
              <strong>{missionTypeLabel(mission?.missionType)} - {requiredLevelLabels(mission?.requiredLevels, mission?.requiredLevel)}</strong>
              <p>{formatCompensation(row.agreement || mission || {})}</p>
              <small>{mission?.specialty || 'Specialite a confirmer'}</small>
            </div>
            <div className="candidate-current-panel">
              <span>Contexte</span>
              <strong>{mission?.departmentInfo || mission?.sector || 'Service a confirmer'}</strong>
              <p>{mission?.teamInfo || 'Equipe et organisation a confirmer dans la messagerie.'}</p>
              <small>{mission?.patientType || establishment?.patientType || 'Patientele a confirmer'}</small>
            </div>
          </div>

          <div className="candidate-current-info">
            <div>
              <h3>Consignes de l etablissement</h3>
              <p>{mission?.practicalInfo || mission?.description || 'Les consignes detaillees seront ajoutees par l etablissement ou envoyees dans la messagerie.'}</p>
            </div>
            <div>
              <h3>Materiel & environnement</h3>
              <p>{mission?.equipmentInfo || readableList(mission?.equipmentAvailable) || 'Materiel a confirmer avant le depart.'}</p>
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
        </div>
      ) : null}

      {activeSection === 'lieu' ? (
        <div className="candidate-current-tab-panel">
          <div className="candidate-current-grid">
            <div className="candidate-current-panel candidate-current-map-panel">
              <span>Adresse</span>
              <strong>{address}</strong>
              <p>{mission?.city || establishment?.city || 'Ville a confirmer'}</p>
              {hasAddress ? <a className="btn btn-light" href={mapsHref(address)} target="_blank" rel="noreferrer">Ouvrir l itineraire</a> : null}
            </div>
            <div className="candidate-current-panel">
              <span>Contact</span>
              <strong>{establishment?.name || 'Etablissement a confirmer'}</strong>
              <p>{establishment?.phone || establishment?.email || 'Contact via la messagerie MediLink'}</p>
              <small>{establishment?.website || 'Site web non renseigne'}</small>
            </div>
          </div>

          <div className="candidate-current-info">
            <div>
              <h3>Acces</h3>
              <p>{mission?.parkingAvailable ? 'Parking disponible.' : 'Parking a confirmer.'} {mission?.accommodationProvided ? 'Logement fourni.' : 'Logement non renseigne.'}</p>
            </div>
            <div>
              <h3>Point de contact</h3>
              <p>{row.conversation ? 'Conversation ouverte avec l etablissement.' : 'Aucune conversation rattachee pour le moment.'}</p>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'compta' ? (
        <div className="candidate-current-tab-panel">
          <div className="candidate-current-grid">
            <div className="candidate-current-panel">
              <span>Remuneration</span>
              <strong>{formatCompensation(row.agreement || mission || {})}</strong>
              <p>{row.agreement ? agreementLabel(row.agreement.status) : statusLabel(row.application.status)}</p>
              <small>{row.agreement?.terms || 'Conditions a retrouver dans la proposition ou la messagerie.'}</small>
            </div>
            <div className="candidate-current-panel">
              <span>Prochaine action</span>
              <strong>{nextStep}</strong>
              <p>Le suivi comptable sera alimente au fil des validations de mission et de paiement.</p>
            </div>
          </div>

          <div className="actions">
            {row.conversation ? <LinkButton href="/app/messages">Contacter l etablissement</LinkButton> : null}
            {mission?.id ? <LinkButton href={`/app/missions/${mission.id}`} variant="light">Voir la mission</LinkButton> : null}
            <LinkButton href="/app/billing" variant="light">Suivi compta</LinkButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}
