'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, isMockStorageUrl } from '@/lib/api';
import { agreementLabel, agreementNextStep, conversationForApplication, latestAgreement } from '@/lib/candidate-workspace';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabels, statusLabel } from '@/lib/labels';
import { getCandidateBillingMissionPath, getCandidateConversationPath } from '@/lib/mission-links';
import type { Application, Conversation, Mission, MissionAgreement } from '@/lib/types';
import { Alert, Button, EmptyState, Input, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

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
    return { primary: 'A confirmer', secondary: 'Fin a confirmer' };
  }

  return {
    primary: formatDate(start),
    secondary: end ? `Fin ${formatDate(end)}` : 'Fin a confirmer',
  };
}

function missionProgress(application: Application, agreement?: MissionAgreement | null): MissionStep[] {
  const status = agreement?.status;
  const start = startDateTime(application, agreement);
  const end = endDateTime(application, agreement);
  const now = new Date();
  const mission = application.mission;
  const hasLocation = Boolean(mission?.location || mission?.establishment?.address || mission?.city || mission?.establishment?.city);
  const hasEstablishmentInfo = Boolean(
    mission?.practicalInfo
      || mission?.departmentInfo
      || mission?.teamInfo
      || mission?.equipmentInfo
      || mission?.equipmentAvailable?.length
  );
  const detailsProvided = hasLocation && hasEstablishmentInfo;
  const confirmed = application.status === 'ACCEPTED' || Boolean(agreement);
  const active = Boolean(start && end && now >= start && now <= end);
  const scheduleStarted = Boolean(start && now >= start);
  const scheduleEnded = Boolean(end && now > end);
  const completed = Boolean(status === 'COMPLETED' || status === 'PAYMENT_RELEASED' || agreement?.completedAt);
  const paymentReleased = Boolean(status === 'PAYMENT_RELEASED' || agreement?.payment?.releasedAt);
  const paymentSecured = Boolean(status === 'FUNDS_SECURED' || status === 'COMPLETED' || paymentReleased || agreement?.payment?.securedAt);

  return [
    { key: 'confirmed', label: 'Mission confirmee', helper: 'La mission est validee avec l etablissement.', status: confirmed ? 'Valide' : 'A confirmer', active: confirmed && !detailsProvided, done: confirmed },
    { key: 'establishment-info', label: 'Informations fournies par l etablissement', helper: detailsProvided ? 'Lieu et informations operationnelles sont renseignes.' : 'Lieu, consignes ou contexte doivent encore etre renseignes.', status: detailsProvided ? 'Renseigne' : 'A completer', active: confirmed && !detailsProvided, done: detailsProvided },
    { key: 'documents', label: 'Documents de mission', helper: 'Deposer les fichiers generes pendant toute la duree de la mission.', status: scheduleStarted ? 'A deposer' : 'A venir', active: active || (scheduleStarted && !completed), done: false },
    { key: 'completed', label: 'Fin de mission', helper: completed ? 'La fin de mission a ete validee.' : scheduleEnded ? 'La date de fin est passee, en attente de validation.' : 'Cette etape se validera apres la fin de mission.', status: completed ? 'Validee' : scheduleEnded ? 'A valider' : 'A venir', active: scheduleEnded && !completed, done: completed },
    { key: 'payment', label: 'Situation de paiement', helper: paymentReleased ? 'Le paiement candidat est libere.' : paymentSecured ? 'Paiement securise, liberation apres validation.' : 'Paiement en attente de confirmation.', status: paymentReleased ? 'Libere' : paymentSecured ? 'Securise' : 'En attente', active: completed && !paymentReleased, done: paymentReleased },
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
        <span>Debut</span>
        <strong>{dates.primary}</strong>
        <small>{dates.secondary}</small>
      </div>
      <div className="candidate-command-stat">
        <span>Statut</span>
        <strong>{row.agreement ? agreementLabel(row.agreement.status) : statusLabel(row.application.status)}</strong>
        <small>{agreementNextStep(row.agreement?.status)}</small>
      </div>
      <div className="candidate-command-actions">
        {row.conversation ? <LinkButton href={getCandidateConversationPath(row.conversation.id)} variant="secondary">Messagerie</LinkButton> : null}
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

      {activeSection === 'documents' ? (
        <MissionDocumentsPanel row={row} />
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
            {row.conversation ? <LinkButton href={getCandidateConversationPath(row.conversation.id)}>Contacter l etablissement</LinkButton> : null}
            {mission?.id ? <LinkButton href={`/app/missions/${mission.id}`} variant="light">Voir la mission</LinkButton> : null}
            <LinkButton href={getCandidateBillingMissionPath(row.conversation, row.agreement)} variant="light">Suivi compta</LinkButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MissionDocumentsPanel({ row }: { row: MissionRow }) {
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const missionTitle = row.application.mission?.title || 'mission';

  async function uploadFiles() {
    if (files.length === 0) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      for (const file of files) {
        const uploadResponse = await api.post<UploadResponse>('/documents/upload-url', {
          documentType: 'OTHER',
          fileName: file.name,
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

        await api.post(`/documents/${uploadResponse.documentId}/confirm-upload`, {});
      }
      setFiles([]);
      setMessage(`${files.length} fichier(s) ajoute(s) aux documents de mission.`);
    } catch (e: any) {
      setError(e.message || 'Upload impossible.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="candidate-current-tab-panel">
      <div className="candidate-current-documents">
        <div>
          <span>Documents de mission</span>
          <strong>Fichiers produits pendant la mission</strong>
          <p>Ajoutez ici les documents generes pendant la duree de la mission {missionTitle}. Ils seront conserves dans votre dossier documents MediLink.</p>
        </div>
        <label className="candidate-current-dropzone">
          <Input
            type="file"
            multiple
            onChange={(event) => setFiles(Array.from(event.target.files || []))}
          />
          <strong>{files.length ? `${files.length} fichier(s) selectionne(s)` : 'Selectionner des fichiers'}</strong>
          <span>Comptes rendus, feuilles de soin, justificatifs ou pieces utiles a transmettre.</span>
        </label>
        {files.length > 0 ? (
          <div className="candidate-current-file-list">
            {files.map((file) => (
              <div key={`${file.name}-${file.size}`}>
                <strong>{file.name}</strong>
                <span>{Math.max(1, Math.round(file.size / 1024))} Ko</span>
              </div>
            ))}
          </div>
        ) : null}
        {message ? <Alert type="success">{message}</Alert> : null}
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="actions">
          <Button type="button" disabled={files.length === 0 || submitting} onClick={() => void uploadFiles()}>
            {submitting ? 'Envoi...' : 'Envoyer les fichiers'}
          </Button>
          <LinkButton href="/app/profile" variant="light">Voir mon dossier</LinkButton>
        </div>
      </div>
    </div>
  );
}
