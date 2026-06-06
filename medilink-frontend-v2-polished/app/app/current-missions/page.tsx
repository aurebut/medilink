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

type MissionSection = 'pilotage' | 'brief' | 'lieu' | 'compta';

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

function missionTimeRange(application: Application, agreement?: MissionAgreement | null) {
  const mission = application.mission;
  const hours = [
    agreement?.startTime || mission?.startTime,
    agreement?.endTime || mission?.endTime,
  ].filter(Boolean).join(' - ');
  return hours || 'Horaires a confirmer';
}

function missionDuration(application: Application, agreement?: MissionAgreement | null) {
  const start = startDateTime(application, agreement);
  const end = endDateTime(application, agreement);
  if (start && end) {
    const hours = Math.max(0, Math.round(((end.getTime() - start.getTime()) / 3600000) * 10) / 10);
    if (hours > 0) return `${hours} h`;
  }
  return application.mission?.durationHours ? `${application.mission.durationHours} h` : 'Duree a confirmer';
}

function dayShortLabel(application: Application, agreement?: MissionAgreement | null) {
  const start = missionStart(application, agreement);
  if (!start) return 'Date a confirmer';
  const date = new Date(start);
  return date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
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

function missionReadiness(row: MissionRow) {
  const mission = row.application.mission;
  const checks = [
    Boolean(missionStart(row.application, row.agreement)),
    Boolean(mission?.location || mission?.establishment?.address || mission?.city),
    Boolean(mission?.practicalInfo || mission?.departmentInfo || mission?.teamInfo),
    Boolean(row.conversation),
    Boolean(row.agreement || row.application.status === 'ACCEPTED'),
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

function mapsHref(address: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
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

  const propositionsRows = useMemo(() => {
    return rows.filter((row) => {
      const status = row.agreement?.status;
      return status === 'PROPOSED' || (row.application.status === 'ACCEPTED' && !row.agreement);
    });
  }, [rows]);

  const confirmedRows = useMemo(() => {
    return rows.filter((row) => {
      const status = row.agreement?.status;
      const end = endDateTime(row.application, row.agreement);
      const isPast = end ? new Date() > end : false;
      return (status === 'PAYMENT_REQUIRED' || status === 'FUNDS_SECURED') && !isPast;
    });
  }, [rows]);

  const completedRows = useMemo(() => {
    return rows.filter((row) => {
      const status = row.agreement?.status;
      const end = endDateTime(row.application, row.agreement);
      const isPast = end ? new Date() > end : false;
      return status === 'COMPLETED' || status === 'PAYMENT_RELEASED' || isPast;
    });
  }, [rows]);

  const priorityRow = useMemo(() => {
    return [...rows].sort((a, b) => rowPriority(a) - rowPriority(b) || missionSortValue(a) - missionSortValue(b))[0] || null;
  }, [rows]);

  const selectedRow = useMemo(() => {
    return rows.find((row) => row.application.id === selectedId) || priorityRow || rows[0] || null;
  }, [priorityRow, rows, selectedId]);

  useEffect(() => {
    if (rows.length > 0) {
      const isSelectedInRows = rows.some((row) => row.application.id === selectedId);
      if (!isSelectedInRows) {
        setSelectedId((priorityRow || rows[0]).application.id);
      }
    } else {
      setSelectedId(null);
    }
  }, [priorityRow, rows, selectedId]);

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
        <>
          {priorityRow ? (
            <MissionCommandStrip
              row={priorityRow}
              stats={{
                total: rows.length,
                soon: confirmedRows.length,
                proposals: propositionsRows.length,
                done: completedRows.length,
              }}
            />
          ) : null}

          <div className="candidate-current-layout">
            <div className="candidate-current-list">
              {rows.map((row) => {
                const mission = row.application.mission;
                const selected = selectedRow?.application.id === row.application.id;
                const readiness = missionReadiness(row);
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
                    <small>{dayShortLabel(row.application, row.agreement)} - {missionTimeRange(row.application, row.agreement)}</small>
                    <span className="candidate-current-card-meta">
                      <span>{formatCompensation(row.agreement || mission || {})}</span>
                      <span>{readiness}% pret</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {selectedRow ? (
              <MissionControlPanel row={selectedRow} />
            ) : null}
          </div>
        </>
      )}
    </>
  );
}

function MissionCommandStrip({
  row,
  stats,
}: {
  row: MissionRow;
  stats: { total: number; soon: number; proposals: number; done: number };
}) {
  const mission = row.application.mission;
  const address = establishmentAddress(mission);
  const hasAddress = address !== 'Adresse a confirmer';
  return (
    <section className="candidate-command-strip" aria-label="Mission prioritaire">
      <div className="candidate-command-main">
        <span>Prochaine mission</span>
        <h2>{mission?.title || 'Mission confirmee'}</h2>
        <p>{mission?.establishment?.name || mission?.city || 'Etablissement a confirmer'} - {address}</p>
      </div>
      <div className="candidate-command-stat">
        <span>Depart</span>
        <strong>{timingLabel(row.application, row.agreement)}</strong>
        <small>{dayShortLabel(row.application, row.agreement)} - {missionTimeRange(row.application, row.agreement)}</small>
      </div>
      <div className="candidate-command-stat">
        <span>Prepa</span>
        <strong>{missionReadiness(row)}%</strong>
        <small>{stats.total} mission(s), {stats.done} terminee(s)</small>
      </div>
      <div className="candidate-command-actions">
        {row.conversation ? <LinkButton href="/app/messages" variant="secondary">Messagerie</LinkButton> : null}
        {hasAddress ? <a className="btn btn-light" href={mapsHref(address)} target="_blank" rel="noreferrer">Itineraire</a> : null}
      </div>
    </section>
  );
}

function MissionControlPanel({ row }: { row: MissionRow }) {
  const [activeSection, setActiveSection] = useState<MissionSection>('pilotage');
  const mission = row.application.mission;
  const establishment = mission?.establishment;
  const progress = missionProgress(row.application, row.agreement);
  const address = establishmentAddress(mission);
  const hasAddress = address !== 'Adresse a confirmer';
  const readiness = missionReadiness(row);
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
  const prepItems = [
    { label: 'Adresse', value: address, ready: address !== 'Adresse a confirmer' },
    { label: 'Contact', value: establishment?.phone || establishment?.email || 'Via messagerie MediLink', ready: Boolean(establishment?.phone || establishment?.email || row.conversation) },
    { label: 'Consignes', value: mission?.practicalInfo || mission?.departmentInfo || mission?.teamInfo || 'A demander avant depart', ready: Boolean(mission?.practicalInfo || mission?.departmentInfo || mission?.teamInfo) },
    { label: 'Materiel', value: mission?.equipmentInfo || readableList(mission?.equipmentAvailable) || 'A confirmer', ready: Boolean(mission?.equipmentInfo || mission?.equipmentAvailable?.length) },
  ];
  const sections: Array<{ id: MissionSection; label: string; count?: number }> = [
    { id: 'pilotage', label: 'Pilotage' },
    { id: 'brief', label: 'Brief', count: detailItems.length },
    { id: 'lieu', label: 'Lieu & contact' },
    { id: 'compta', label: 'Compta & actions' },
  ];

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

      <div className="candidate-mission-tabs billing-tabs" role="tablist" aria-label="Sections de la mission selectionnee">
        {sections.map((section) => (
          <button
            key={section.id}
            type="button"
            className={activeSection === section.id ? 'active' : ''}
            onClick={() => setActiveSection(section.id)}
            role="tab"
            aria-selected={activeSection === section.id}
          >
            {section.label}
            {section.count ? <span className="tab-count-badge">{section.count}</span> : null}
          </button>
        ))}
      </div>

      {activeSection === 'pilotage' ? (
        <>
          <div className="candidate-current-dispatch">
            <div>
              <span>Date</span>
              <strong>{dayShortLabel(row.application, row.agreement)}</strong>
              <small>{missionTimeRange(row.application, row.agreement)}</small>
            </div>
            <div>
              <span>Duree</span>
              <strong>{missionDuration(row.application, row.agreement)}</strong>
              <small>{mission?.missionType ? missionTypeLabel(mission.missionType) : 'Mission'}</small>
            </div>
            <div>
              <span>Lieu</span>
              <strong>{mission?.city || establishment?.city || 'A confirmer'}</strong>
              <small>{establishment?.name || 'Etablissement'}</small>
            </div>
            <div>
              <span>Preparation</span>
              <strong>{readiness}%</strong>
              <small>Infos critiques reunies</small>
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

          <div className="candidate-current-prep">
            {prepItems.map((item) => (
              <div key={item.label} className={item.ready ? 'ready' : 'waiting'}>
                <span>{item.ready ? 'Pret' : 'A verifier'}</span>
                <strong>{item.label}</strong>
                <p>{item.value}</p>
              </div>
            ))}
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
    </Card>
  );
}
