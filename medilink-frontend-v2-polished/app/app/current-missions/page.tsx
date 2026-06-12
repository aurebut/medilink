'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, clearApiCache, isMockStorageUrl, subscribeApiCache } from '@/lib/api';
import { agreementLabel, agreementNextStep, conversationForApplication, latestAgreement } from '@/lib/candidate-workspace';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabels, statusLabel } from '@/lib/labels';
import { getCandidateBillingMissionPath, getCandidateConversationPath } from '@/lib/mission-links';
import type { Application, Conversation, Mission, MissionAgreement } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Button, EmptyState, Input, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

type MissionStep = {
  key: string;
  label: string;
  helper: string;
  status: string;
  dateLabel?: string;

  active: boolean;
  done: boolean;
};

type MissionRow = {
  application: Application;
  conversation: Conversation | null;
  agreement: MissionAgreement | null;
  startDate?: string | null;
};

type MissionSection = 'pilotage' | 'brief' | 'lieu' | 'documents' | 'compta';

const missionSections: Array<{ id: MissionSection; label: string }> = [
  { id: 'pilotage', label: 'Pilotage' },
  { id: 'brief', label: 'Brief' },
  { id: 'lieu', label: 'Lieu & contact' },
  { id: 'documents', label: 'Documents de mission' },
  { id: 'compta', label: 'Compta & actions' },
];

type UploadResponse = {
  documentId: string;
  uploadUrl: string;
  method: string;
  headers: Record<string, string>;
};

type MissionDocumentDay = {
  key: string;
  label: string;
  dateLabel: string;
  uploadNamePrefix: string;
};

function missionStart(application: Application, agreement?: MissionAgreement | null) {
  return agreement?.startDate || application.mission?.startDate || null;
}

function missionEnd(application: Application, agreement?: MissionAgreement | null) {
  return agreement?.endDate || application.mission?.endDate || null;
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

function missionDateRange(application: Application, agreement?: MissionAgreement | null) {
  const start = missionStart(application, agreement);
  const end = missionEnd(application, agreement);
  if (!start) {
    return { primary: 'À confirmer', secondary: 'Fin à confirmer' };
  }

  return {
    primary: formatDate(start),
    secondary: end ? `Fin ${formatDate(end)}` : 'Fin à confirmer',
  };
}

function missionProgress(application: Application, agreement?: MissionAgreement | null): MissionStep[] {
  const status = agreement?.status;
  const start = startDateTime(application, agreement);
  const end = endDateTime(application, agreement);
  const now = new Date();
  const confirmed = application.status === 'ACCEPTED' || Boolean(agreement);
  const active = Boolean(start && end && now >= start && now <= end);
  const scheduleStarted = Boolean(start && now >= start);
  const scheduleEnded = Boolean(end && now > end);
  const completed = Boolean(status === 'COMPLETED' || status === 'PAYMENT_RELEASED' || agreement?.completedAt);
  const paymentReleased = Boolean(status === 'PAYMENT_RELEASED' || agreement?.payment?.releasedAt);
  const paymentSecured = Boolean(status === 'FUNDS_SECURED' || status === 'COMPLETED' || paymentReleased || agreement?.payment?.securedAt);

  const startDate = missionStart(application, agreement);

  const endDate = missionEnd(application, agreement);

  const startLabel = startDate ? formatDate(startDate) : 'Date à confirmer';

  const endLabel = endDate ? formatDate(endDate) : 'Date à confirmer';

  return [
    { key: 'confirmed', label: 'Mission confirmée', helper: 'La mission est validée avec l’établissement.', status: confirmed ? 'Validé' : 'À confirmer', active: confirmed && !scheduleStarted, done: confirmed },
    { key: 'started', label: 'Début de mission', helper: scheduleStarted ? 'La mission a démarré selon le planning confirmé.' : 'Cette étape se validera au début de la mission.', status: scheduleStarted ? 'Démarrée' : 'À venir', dateLabel: startLabel, active: confirmed && !scheduleStarted, done: scheduleStarted },
    { key: 'ended', label: 'Fin de mission', helper: scheduleEnded ? 'La date de fin de mission est passée.' : 'Cette étape se validera à la date de fin de mission.', status: scheduleEnded ? 'Terminée' : 'À venir', dateLabel: endLabel, active: active, done: scheduleEnded },
    { key: 'documents', label: 'Documents de mission', helper: 'Déposer les fichiers générés pendant la mission.', status: scheduleEnded ? 'À finaliser' : scheduleStarted ? 'À préparer' : 'À venir', active: scheduleEnded && !completed, done: completed },
    { key: 'completed', label: 'Validation de mission', helper: completed ? 'La mission a été validée.' : scheduleEnded ? 'La mission est terminée, en attente de validation.' : 'Cette étape suivra la fin de mission et les documents.', status: completed ? 'Validée' : scheduleEnded ? 'À valider' : 'À venir', active: scheduleEnded && !completed, done: completed },
    { key: 'payment', label: 'Règlement', helper: paymentReleased ? 'Le paiement candidat est libéré.' : paymentSecured ? 'Paiement sécurisé, libération après validation.' : 'Paiement en attente de confirmation.', status: paymentReleased ? 'Libéré' : paymentSecured ? 'Sécurisé' : 'En attente', active: completed && !paymentReleased, done: paymentReleased },
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
  ].filter(Boolean).join(', ') || 'Adresse à confirmer';
}

function readableList(values?: string[] | null) {
  return values?.length ? values.join(', ') : null;
}

function localDateFromMissionDay(value?: string | null) {
  const day = value?.slice(0, 10);
  if (!day) return null;
  const date = new Date(`${day}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dayKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addCalendarDays(value: Date, count: number) {
  const date = new Date(value.getFullYear(), value.getMonth(), value.getDate());
  date.setDate(date.getDate() + count);
  return date;
}

function missionDocumentDays(application: Application, agreement?: MissionAgreement | null): MissionDocumentDay[] {
  const start = localDateFromMissionDay(missionStart(application, agreement));
  const end = localDateFromMissionDay(missionEnd(application, agreement)) || start;
  if (!start || !end || end < start) {
    return [{
      key: 'undated',
      label: 'Journée à confirmer',
      dateLabel: 'Planning à confirmer',
      uploadNamePrefix: 'journee-a-confirmer',
    }];
  }

  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 86400000) + 1);
  return Array.from({ length: days }, (_, index) => {
    const date = addCalendarDays(start, index);
    const key = dayKey(date);
    return {
      key,
      label: `Jour ${index + 1}`,
      dateLabel: formatDate(key),
      uploadNamePrefix: key,
    };
  });
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

function mapsEmbedHref(address: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

export default function CandidateCurrentMissionsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeSection, setActiveSection] = useState<MissionSection>('pilotage');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeApplications = subscribeApiCache<Application[]>('/me/applications', setApplications);
    const unsubscribeConversations = subscribeApiCache<Conversation[]>('/conversations', setConversations);

    Promise.all([
      api.get<Application[]>('/me/applications'),
      api.get<Conversation[]>('/conversations'),
    ]).then(([nextApplications, nextConversations]) => {
      setApplications(nextApplications);
      setConversations(nextConversations);
    }).catch((e: any) => {
      setError(e.message);
    }).finally(() => setLoading(false));

    return () => {
      unsubscribeApplications();
      unsubscribeConversations();
    };
  }, []);

  useAutoRefresh(async () => {
    const [nextApplications, nextConversations] = await Promise.all([
      api.reload<Application[]>('/me/applications'),
      api.reload<Conversation[]>('/conversations'),
    ]);
    setApplications(nextApplications);
    setConversations(nextConversations);
  }, { enabled: !loading });

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
        description="Votre suivi de mission côté candidat : départ, consignes, établissement et prochaines actions."
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      {rows.length === 0 ? (
        <EmptyState
          title="Aucune mission en cours"
          description="Une mission apparaît ici dès qu’une candidature est acceptée ou qu’une proposition est envoyée par un établissement."
          action={<LinkButton href="/app/search">Trouver une mission</LinkButton>}
        />
      ) : (
        <>
          <div className="candidate-page-tabs billing-tabs" role="tablist" aria-label="Sections de la mission sélectionnée">
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
  const hasAddress = address !== 'Adresse à confirmer';
  const dates = missionDateRange(row.application, row.agreement);
  return (
    <section className="candidate-command-strip" aria-label="Mission prioritaire">
      <div className="candidate-command-main">
        <span>Prochaine mission</span>
        <h2>{mission?.title || 'Mission confirmée'}</h2>
        <p>{mission?.establishment?.name || mission?.city || 'Établissement à confirmer'} - {address}</p>
      </div>
      <div className="candidate-command-stat">
        <span>Début</span>
        <strong>{dates.primary}</strong>
        <small>{dates.secondary}</small>
      </div>
      <div className="candidate-command-stat">
        <span>Statut</span>
        <strong>{row.agreement ? agreementLabel(row.agreement.status) : statusLabel(row.application.status)}</strong>
        <small>{agreementNextStep(row.agreement?.status)}</small>
      </div>
      <div className="candidate-command-map">
        {hasAddress ? (
          <iframe
            title={`Carte de ${mission?.title || 'la mission'}`}
            src={mapsEmbedHref(address)}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="candidate-command-map-empty">Adresse à confirmer</div>
        )}
        <div className="candidate-command-map-label">
          <span>Adresse mission</span>
          <strong>{address}</strong>
        </div>
      </div>
      <div className="candidate-command-actions">
        {row.conversation ? (
          <LinkButton href={getCandidateConversationPath(row.conversation.id)} variant="secondary">
            <span className="command-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M4 6.8C4 5.8 4.8 5 5.8 5h12.4c1 0 1.8.8 1.8 1.8v7.4c0 1-.8 1.8-1.8 1.8H9l-4.2 3v-3.2c-.5-.3-.8-.9-.8-1.6V6.8Z" />
              </svg>
            </span>
            Message
          </LinkButton>
        ) : null}
        {hasAddress ? (
          <a className="btn btn-light" href={mapsHref(address)} target="_blank" rel="noreferrer">
            <span className="command-action-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" focusable="false">
                <path d="M12 21s6-5.3 6-11a6 6 0 0 0-12 0c0 5.7 6 11 6 11Z" />
                <path d="M12 12.2a2.2 2.2 0 1 0 0-4.4 2.2 2.2 0 0 0 0 4.4Z" />
              </svg>
            </span>
            Itinéraire
          </a>
        ) : null}
      </div>
    </section>
  );
}

function MissionControlPanel({ row, activeSection }: { row: MissionRow; activeSection: MissionSection }) {
  const mission = row.application.mission;
  const establishment = mission?.establishment;
  const progress = missionProgress(row.application, row.agreement);
  const address = establishmentAddress(mission);
  const hasAddress = address !== 'Adresse à confirmer';
  const detailItems = [
    { label: 'Service', value: mission?.departmentInfo || mission?.sector },
    { label: 'Équipe', value: mission?.teamInfo },
    { label: 'Matériel', value: mission?.equipmentInfo || readableList(mission?.equipmentAvailable) },
    { label: 'Logiciel', value: mission?.softwareUsed || establishment?.softwareUsed },
    { label: 'Patients / jour', value: mission?.averagePatientsPerDay ? `${mission.averagePatientsPerDay}` : null },
    { label: 'Secrétariat', value: mission?.hasSecretary ? mission.secretaryType || 'Disponible' : null },
    { label: 'Parking', value: mission?.parkingAvailable ? 'Disponible' : null },
    { label: 'Logement', value: mission?.accommodationProvided ? 'Fourni' : null },
  ].filter((item) => item.value);

  const nextStep = row.agreement ? agreementNextStep(row.agreement.status) : 'Échanger avec l’établissement pour confirmer les derniers détails.';
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
                      {step.dateLabel ? <span className="candidate-current-route-date">{step.dateLabel}</span> : null}
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
              <small>{mission?.specialty || 'Spécialité à confirmer'}</small>
            </div>
            <div className="candidate-current-panel">
              <span>Contexte</span>
              <strong>{mission?.departmentInfo || mission?.sector || 'Service à confirmer'}</strong>
              <p>{mission?.teamInfo || 'Équipe et organisation à confirmer dans la messagerie.'}</p>
              <small>{mission?.patientType || establishment?.patientType || 'Patientèle à confirmer'}</small>
            </div>
          </div>

          <div className="candidate-current-info">
            <div>
              <h3>Consignes de l’établissement</h3>
              <p>{mission?.practicalInfo || mission?.description || 'Les consignes détaillées seront ajoutées par l’établissement ou envoyées dans la messagerie.'}</p>
            </div>
            <div>
              <h3>Matériel & environnement</h3>
              <p>{mission?.equipmentInfo || readableList(mission?.equipmentAvailable) || 'Matériel à confirmer avant le départ.'}</p>
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
              <p>{mission?.city || establishment?.city || 'Ville à confirmer'}</p>
              {hasAddress ? <a className="btn btn-light" href={mapsHref(address)} target="_blank" rel="noreferrer">Ouvrir l’itinéraire</a> : null}
            </div>
            <div className="candidate-current-panel">
              <span>Contact</span>
              <strong>{establishment?.name || 'Établissement à confirmer'}</strong>
              <p>{establishment?.phone || establishment?.email || 'Contact via la messagerie MediLink'}</p>
              <small>{establishment?.website || 'Site web non renseigné'}</small>
            </div>
          </div>

          <div className="candidate-current-info">
            <div>
              <h3>Accès</h3>
              <p>{mission?.parkingAvailable ? 'Parking disponible.' : 'Parking à confirmer.'} {mission?.accommodationProvided ? 'Logement fourni.' : 'Logement non renseigné.'}</p>
            </div>
            <div>
              <h3>Point de contact</h3>
              <p>{row.conversation ? 'Conversation ouverte avec l’établissement.' : 'Aucune conversation rattachée pour le moment.'}</p>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'documents' ? (
        <MissionDocumentsPanel row={row} />
      ) : null}

      {activeSection === 'compta' ? (
        <div className="candidate-current-tab-panel">
          <div className="candidate-current-grid">
            <div className="candidate-current-panel">
              <span>Rémunération</span>
              <strong>{formatCompensation(row.agreement || mission || {})}</strong>
              <p>{row.agreement ? agreementLabel(row.agreement.status) : statusLabel(row.application.status)}</p>
              <small>{row.agreement?.terms || 'Conditions à retrouver dans la proposition ou la messagerie.'}</small>
            </div>
            <div className="candidate-current-panel">
              <span>Prochaine action</span>
              <strong>{nextStep}</strong>
              <p>Le suivi comptable sera alimenté au fil des validations de mission et de paiement.</p>
            </div>
          </div>

          <div className="actions">
            {row.conversation ? <LinkButton href={getCandidateConversationPath(row.conversation.id)}>Contacter l’établissement</LinkButton> : null}
            {mission?.id ? <LinkButton href={`/app/missions/${mission.id}`} variant="light">Voir la mission</LinkButton> : null}
            <LinkButton href={getCandidateBillingMissionPath(row.conversation, row.agreement)} variant="light">Suivi compta</LinkButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MissionDocumentsPanel({ row }: { row: MissionRow }) {
  const documentDays = useMemo(() => missionDocumentDays(row.application, row.agreement), [row.application, row.agreement]);
  const [filesByDay, setFilesByDay] = useState<Record<string, File[]>>({});
  const [submittingDay, setSubmittingDay] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const missionTitle = row.application.mission?.title || 'mission';
  const selectedCount = Object.values(filesByDay).reduce((total, files) => total + files.length, 0);

  useEffect(() => {
    setFilesByDay({});
    setSubmittingDay(null);
    setMessage(null);
    setError(null);
  }, [row.application.id, row.agreement?.id]);

  function setDayFiles(dayKey: string, files: File[]) {
    setFilesByDay((current) => ({
      ...current,
      [dayKey]: files,
    }));
    setMessage(null);
    setError(null);
  }

  async function uploadFiles(day: MissionDocumentDay) {
    const files = filesByDay[day.key] || [];
    if (files.length === 0) return;
    setSubmittingDay(day.key);
    setMessage(null);
    setError(null);
    try {
      for (const file of files) {
        const categorizedFileName = `${day.uploadNamePrefix} - ${file.name}`;
        const uploadResponse = await api.postSilent<UploadResponse>('/documents/upload-url', {
          documentType: 'OTHER',
          fileName: categorizedFileName,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        });

        if (!isMockStorageUrl(uploadResponse.uploadUrl)) {
          const put = await fetch(uploadResponse.uploadUrl, {
            method: uploadResponse.method,
            headers: uploadResponse.headers,
            body: file,
          });
          if (!put.ok) throw new Error(`Upload impossible pour ${file.name}.`);
        }

        await api.postSilent(`/documents/${uploadResponse.documentId}/confirm-upload`, {});
      }
      clearApiCache('/me/documents');
      setFilesByDay((current) => ({
        ...current,
        [day.key]: [],
      }));
      setMessage(`${files.length} fichier(s) ajouté(s) pour ${day.label.toLowerCase()} - ${day.dateLabel}.`);
    } catch (e: any) {
      setError(e.message || 'Upload impossible.');
    } finally {
      setSubmittingDay(null);
    }
  }

  return (
    <div className="candidate-current-tab-panel">
      <div className="candidate-current-documents">
        <div>
          <span>Documents de mission</span>
          <strong>Fichiers produits par journée</strong>
          <p>Ajoutez les documents générés pendant chaque journée de la mission {missionTitle}. Chaque envoi est classé avec la date correspondante dans votre dossier documents MediLink.</p>
        </div>

        <div className="candidate-current-doc-summary">
          <div>
            <span>Durée couverte</span>
            <strong>{documentDays.length} journée{documentDays.length > 1 ? 's' : ''}</strong>
          </div>
          <div>
            <span>Fichiers prêts</span>
            <strong>{selectedCount}</strong>
          </div>
        </div>

        <div className="candidate-current-day-documents">
          {documentDays.map((day) => {
            const files = filesByDay[day.key] || [];
            const isSubmitting = submittingDay === day.key;
            return (
              <section key={day.key} className="candidate-current-day-document">
                <div className="candidate-current-day-head">
                  <div>
                    <span>{day.label}</span>
                    <strong>{day.dateLabel}</strong>
                  </div>
                  <small>{files.length ? `${files.length} fichier(s)` : 'Aucun fichier'}</small>
                </div>

                <label className="candidate-current-dropzone">
                  <Input
                    type="file"
                    multiple
                    onChange={(event) => setDayFiles(day.key, Array.from(event.target.files || []))}
                  />
                  <strong>{files.length ? `${files.length} fichier(s) sélectionné(s)` : 'Sélectionner les documents du jour'}</strong>
                  <span>Compte rendu, feuilles de soin, justificatifs ou pièces utiles produits ce jour-là.</span>
                </label>

                {files.length > 0 ? (
                  <div className="candidate-current-file-list">
                    {files.map((file) => (
                      <div key={`${day.key}-${file.name}-${file.size}`}>
                        <strong>{file.name}</strong>
                        <span>{Math.max(1, Math.round(file.size / 1024))} Ko</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="actions">
                  <Button type="button" disabled={files.length === 0 || Boolean(submittingDay)} onClick={() => void uploadFiles(day)}>
                    {isSubmitting ? 'Envoi...' : 'Envoyer cette journée'}
                  </Button>
                </div>
              </section>
            );
          })}
        </div>

        {message ? <Alert type="success">{message}</Alert> : null}
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="actions">
          <LinkButton href="/app/profile" variant="light">Voir mon dossier</LinkButton>
        </div>
      </div>
    </div>
  );
}
