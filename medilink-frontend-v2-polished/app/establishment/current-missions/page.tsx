'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { api, getApiUrl, getAuthToken, isMockStorageUrl, openDocumentPreviewWindow, showDocumentInPreview } from '@/lib/api';
import { agreementLabel, agreementNextStep, latestAgreement } from '@/lib/candidate-workspace';
import { formatCompensation, formatDate } from '@/lib/format';
import { documentTypeLabel, medicalStatusLabel, missionTypeLabel, requiredLevelLabels, statusLabel } from '@/lib/labels';
import type { Application, Conversation, Document, Mission, MissionAgreement, CandidateProfileForApplication } from '@/lib/types';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Alert, Badge, Card, LinkButton, LoadingCard, PageHeader, StatCard, Textarea, Button, Input } from '@/components/ui';

type MissionMoment = 'upcoming' | 'today' | 'active' | 'done';
type NotesByApplication = Record<string, string>;

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

type MissionSection = 'pilotage' | 'brief' | 'candidat' | 'documents' | 'compta';

const missionSections: Array<{ id: MissionSection; label: string }> = [
  { id: 'pilotage', label: 'Pilotage' },
  { id: 'brief', label: 'Brief & notes' },
  { id: 'candidat', label: 'Candidat & contact' },
  { id: 'documents', label: 'Documents validés' },
  { id: 'compta', label: 'Compta & facturation' },
];

function candidateName(application: Application) {
  const profile = application.candidate?.profile;
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  return name || application.candidate?.email || 'Candidat assigné';
}

function missionDate(mission?: Mission, kind: 'start' | 'end' = 'start') {
  if (!mission) return null;
  const dateValue = kind === 'end' ? mission.endDate || mission.startDate : mission.startDate;
  const timeValue = kind === 'end' ? mission.endTime || '23:59' : mission.startTime || '00:00';
  const day = dateValue?.slice(0, 10);
  if (!day) return null;
  return new Date(`${day}T${timeValue}`);
}

function missionMoment(mission?: Mission): MissionMoment {
  const now = new Date();
  const start = missionDate(mission, 'start');
  const end = missionDate(mission, 'end');
  if (!start || !end) return 'upcoming';

  const sameDay = start.toDateString() === now.toDateString();
  if (now < start) return sameDay ? 'today' : 'upcoming';
  if (now <= end) return 'active';
  return 'done';
}

function momentLabel(moment: MissionMoment) {
  const labels: Record<MissionMoment, string> = {
    upcoming: 'A venir',
    today: "Aujourd'hui",
    active: 'En cours',
    done: 'Terminée',
  };
  return labels[moment];
}

function momentTone(moment: MissionMoment) {
  if (moment === 'active') return 'success';
  if (moment === 'today') return 'warning';
  if (moment === 'done') return 'neutral';
  return 'neutral';
}

function nextTiming(application: Application) {
  const mission = application.mission;
  const start = missionDate(mission, 'start');
  const end = missionDate(mission, 'end');
  const now = new Date();
  if (!start || !end) return 'Date à confirmer';

  const diffStart = start.getTime() - now.getTime();
  if (now > end) return `Mission terminée le ${formatDate(mission?.endDate || mission?.startDate)}`;
  if (diffStart > 0) {
    const days = Math.ceil(diffStart / 86400000);
    if (days <= 1) return 'Démarre dans moins de 24 h';
    return `Démarre dans ${days} jours`;
  }

  const diffEnd = end.getTime() - now.getTime();
  const remainingDays = Math.ceil(diffEnd / 86400000);
  return remainingDays <= 1 ? 'Dernière journée en cours' : `${remainingDays} jours restants`;
}

function missionSchedule(mission?: Mission) {
  if (!mission) return 'Planning à confirmer';
  const dates = mission.endDate && mission.endDate !== mission.startDate
    ? `${formatDate(mission.startDate)} - ${formatDate(mission.endDate)}`
    : formatDate(mission.startDate);
  const hours = [mission.startTime, mission.endTime].filter(Boolean).join(' - ');
  return hours ? `${dates} - ${hours}` : dates;
}

function notesStorageKey(establishmentId: string) {
  return `medilink_current_mission_notes_${establishmentId}`;
}

function readableList(values?: string[] | null) {
  return values?.length ? values.join(', ') : null;
}

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
    return { primary: 'A confirmer', secondary: 'Fin à confirmer' };
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
  const mission = application.mission;
  const hasLocation = Boolean(mission?.location || mission?.city);
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
    { key: 'confirmed', label: 'Candidat validé', helper: "L'affectation du candidat est confirmée.", status: confirmed ? 'Confirmé' : 'A confirmer', active: confirmed && !detailsProvided, done: confirmed },
    { key: 'establishment-info', label: 'Brief opérationnel', helper: detailsProvided ? 'Les infos terrain et consignes sont renseignées.' : 'Consignes, équipe ou matériel à renseigner.', status: detailsProvided ? 'Complet' : 'A renseigner', active: confirmed && !detailsProvided, done: detailsProvided },
    { key: 'documents', label: 'Documents de mission', helper: 'Fichiers et pièces utiles déposés pour la mission.', status: scheduleStarted ? 'A suivre' : 'A venir', active: active || (scheduleStarted && !completed), done: false },
    { key: 'completed', label: 'Clôture de mission', helper: completed ? 'La fin de mission est validée.' : scheduleEnded ? 'A valider après la fin de mission.' : 'Cette étape sera validée après la fin de mission.', status: completed ? 'Validée' : scheduleEnded ? 'A valider' : 'A venir', active: scheduleEnded && !completed, done: completed },
    { key: 'payment', label: 'Règlement / Rétrocession', helper: paymentReleased ? 'Le paiement a été libéré au candidat.' : paymentSecured ? 'Fonds sécurisés sur le compte tiers.' : 'En attente de versement.', status: paymentReleased ? 'Libéré' : paymentSecured ? 'Sécurisé' : 'En attente', active: completed && !paymentReleased, done: paymentReleased },
  ];
}

export default function EstablishmentCurrentMissionsPage() {
  const { primary, loading } = useEstablishments();
  const [applications, setApplications] = useState<Application[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<NotesByApplication>({});

  const [selectedApplicationId, setSelectedApplicationId] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [candidateProfile, setCandidateProfile] = useState<CandidateProfileForApplication | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [activeSection, setActiveSection] = useState<MissionSection>('pilotage');

  useEffect(() => {
    if (!primary) {
      setApplications([]);
      setMissionsLoading(false);
      return;
    }

    setMissionsLoading(true);
    setError(null);
    api.get<Application[]>(`/establishment/applications?establishmentId=${primary.id}`)
      .then(setApplications)
      .catch((e: any) => setError(e.message))
      .finally(() => setMissionsLoading(false));
  }, [primary]);

  useEffect(() => {
    if (!primary || typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(notesStorageKey(primary.id));
      setNotes(stored ? JSON.parse(stored) : {});
    } catch {
      setNotes({});
    }
  }, [primary]);

  const currentApplications = useMemo(() => {
    return applications
      .filter((application) => application.status === 'ACCEPTED' && application.mission?.status !== 'ARCHIVED')
      .sort((a, b) => {
        const aDate = missionDate(a.mission, 'start')?.getTime() || 0;
        const bDate = missionDate(b.mission, 'start')?.getTime() || 0;
        return aDate - bDate;
      });
  }, [applications]);

  // Set default selected application id
  useEffect(() => {
    if (currentApplications.length > 0 && !selectedApplicationId) {
      setSelectedApplicationId(currentApplications[0].id);
    }
  }, [currentApplications, selectedApplicationId]);

  // Fetch candidate profile and full conversation dynamically on select
  useEffect(() => {
    if (!selectedApplicationId) {
      setSelectedConversation(null);
      setCandidateProfile(null);
      return;
    }

    const app = currentApplications.find(a => a.id === selectedApplicationId);
    if (!app) return;

    setLoadingDetails(true);
    const promises: Promise<any>[] = [
      api.get<CandidateProfileForApplication>(`/establishment/applications/${selectedApplicationId}/candidate-profile`)
    ];

    const convId = app.conversation?.id;
    if (convId) {
      promises.push(api.get<Conversation>(`/conversations/${convId}`));
    } else {
      setSelectedConversation(null);
    }

    Promise.all(promises)
      .then(([profileRes, convRes]) => {
        setCandidateProfile(profileRes);
        if (convRes) {
          setSelectedConversation(convRes);
        }
      })
      .catch((e: any) => setError(e.message))
      .finally(() => setLoadingDetails(false));
  }, [selectedApplicationId, currentApplications]);

  const stats = useMemo(() => {
    const moments = currentApplications.map((application) => missionMoment(application.mission));
    return {
      active: moments.filter((moment) => moment === 'active' || moment === 'today').length,
      upcoming: moments.filter((moment) => moment === 'upcoming').length,
      done: moments.filter((moment) => moment === 'done').length,
    };
  }, [currentApplications]);

  function updateNote(missionId: string, value: string) {
    const next = { ...notes, [missionId]: value };
    setNotes(next);
    if (primary && typeof window !== 'undefined') {
      window.localStorage.setItem(notesStorageKey(primary.id), JSON.stringify(next));
    }
  }

  function updateLocalMission(missionId: string, updatedFields: Partial<Mission>) {
    setApplications((current) =>
      current.map((app) => {
        if (app.missionId === missionId && app.mission) {
          return {
            ...app,
            mission: {
              ...app.mission,
              ...updatedFields,
            },
          };
        }
        return app;
      })
    );

    setCandidateProfile((current) => {
      if (current && current.mission.id === missionId) {
        return {
          ...current,
          mission: {
            ...current.mission,
            ...updatedFields,
          },
        };
      }
      return current;
    });
  }

  const selectedRow: MissionRow | null = useMemo(() => {
    if (!selectedApplicationId) return null;
    const app = currentApplications.find(a => a.id === selectedApplicationId);
    if (!app) return null;

    const conv = selectedConversation || app.conversation || null;
    const agreement = latestAgreement(conv);

    return {
      application: app,
      conversation: conv,
      agreement,
      startDate: agreement?.startDate || app.mission?.startDate || null,
    };
  }, [selectedApplicationId, currentApplications, selectedConversation]);

  if (loading || missionsLoading) return <LoadingCard label="Chargement des missions en cours..." />;

  return (
    <>
      <PageHeader
        title="Missions en cours"
        description="Suivez les missions pourvues, le candidat assigné et les détails opérationnels à garder sous la main."
        actions={<LinkButton href="/establishment/applications">Voir les candidatures</LinkButton>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      {!primary ? (
        <Card className="card-highlight">
          <h2>Aucun établissement rattaché</h2>
          <p>Créez votre fiche établissement pour publier des missions puis suivre les missions confirmées ici.</p>
          <LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton>
        </Card>
      ) : currentApplications.length === 0 ? (
        <Card className="card-highlight current-missions-empty">
          <h2>Aucune mission en cours</h2>
          <p>Les missions apparaissent ici dès qu'une candidature est acceptée. Vous pourrez ensuite suivre le planning, contacter le candidat et ajouter vos notes terrain.</p>
          <div className="actions">
            <LinkButton href="/establishment/applications">Traiter les candidatures</LinkButton>
            <LinkButton variant="light" href="/establishment/missions/new">Créer une mission</LinkButton>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid-3 current-missions-stats" style={{ marginBottom: 20 }}>
            <StatCard label="En route aujourd'hui" value={stats.active} helper="Missions actives ou qui démarrent aujourd'hui" />
            <StatCard label="A venir" value={stats.upcoming} helper="Missions confirmées à préparer" />
            <StatCard label="Terminées" value={stats.done} helper="Missions acceptées déjà passées" />
          </div>

          <div className="grid-main">
            {/* Sidebar with active missions list */}
            <Card>
              <h3 style={{ margin: '0 0 12px 0', fontSize: 16, color: 'var(--heading)' }}>Missions ({currentApplications.length})</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {currentApplications.map((app) => {
                  const isSelected = app.id === selectedApplicationId;
                  const moment = missionMoment(app.mission);
                  return (
                    <button
                      key={app.id}
                      type="button"
                      onClick={() => setSelectedApplicationId(app.id)}
                      style={{
                        display: 'grid',
                        gap: 6,
                        padding: 12,
                        borderRadius: 10,
                        border: '1px solid',
                        borderColor: isSelected ? 'var(--navy)' : 'var(--line)',
                        background: isSelected ? 'rgba(20, 39, 74, 0.04)' : '#fff',
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: isSelected ? '0 4px 12px rgba(20, 39, 74, 0.06)' : 'none',
                        width: '100%',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6, width: '100%' }}>
                        <strong style={{ fontSize: 14, color: isSelected ? 'var(--navy)' : 'var(--heading)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '140px' }}>
                          {candidateName(app)}
                        </strong>
                        <Badge tone={momentTone(moment)}>{momentLabel(moment)}</Badge>
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--heading)', opacity: 0.9, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {app.mission?.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                        {nextTiming(app)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>

            {/* Selected Mission Detail Sub-tabs and Control Panel */}
            <div>
              {selectedRow ? (
                <>
                  <div className="candidate-page-tabs billing-tabs" role="tablist" aria-label="Sections de la mission sélectionnée" style={{ marginBottom: 16 }}>
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

                  {loadingDetails ? (
                    <LoadingCard label="Chargement des détails de la mission..." />
                  ) : (
                    <div className="candidate-current-layout">
                      <MissionControlPanel
                        row={selectedRow}
                        activeSection={activeSection}
                        notes={notes}
                        updateNote={updateNote}
                        candidateProfile={candidateProfile}
                        profileLoading={loadingDetails}
                        setError={setError}
                        updateLocalMission={updateLocalMission}
                      />
                    </div>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </>
      )}
    </>
  );
}

function MissionCommandStrip({ row }: { row: MissionRow }) {
  const mission = row.application.mission;
  const dates = missionDateRange(row.application, row.agreement);
  const profile = row.application.candidate?.profile;
  const candidateFullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || row.application.candidate?.email || 'Candidat';

  return (
    <section className="candidate-command-strip" aria-label="Mission prioritaire">
      <div className="candidate-command-main">
        <span>Candidat assigné</span>
        <h2>{candidateFullName}</h2>
        <p>{mission?.title || 'Mission'} · {mission?.city || 'Lieu à confirmer'}</p>
      </div>
      <div className="candidate-command-stat">
        <span>Dates de mission</span>
        <strong>{dates.primary}</strong>
        <small>{dates.secondary}</small>
      </div>
      <div className="candidate-command-stat">
        <span>Statut contractuel</span>
        <strong>{row.agreement ? agreementLabel(row.agreement.status) : statusLabel(row.application.status)}</strong>
        <small>{agreementNextStep(row.agreement?.status)}</small>
      </div>
      <div className="candidate-command-actions">
        {row.application.conversation ? (
          <LinkButton href="/establishment/messages" variant="secondary">Messagerie</LinkButton>
        ) : null}
        <LinkButton href={`/establishment/candidates/${row.application.id}`} variant="light">
          Profil candidat
        </LinkButton>
      </div>
    </section>
  );
}

function MissionControlPanel({
  row,
  activeSection,
  notes,
  updateNote,
  candidateProfile,
  profileLoading,
  setError,
  updateLocalMission,
}: {
  row: MissionRow;
  activeSection: MissionSection;
  notes: NotesByApplication;
  updateNote: (missionId: string, val: string) => void;
  candidateProfile: CandidateProfileForApplication | null;
  profileLoading: boolean;
  setError: (err: string | null) => void;
  updateLocalMission: (missionId: string, updatedFields: Partial<Mission>) => void;
}) {
  const mission = row.application.mission;
  const progress = missionProgress(row.application, row.agreement);
  const nextStep = row.agreement ? agreementNextStep(row.agreement.status) : 'Échanger avec le candidat pour confirmer les derniers détails.';

  const [isEditingBrief, setIsEditingBrief] = useState(false);
  const [editDepartmentInfo, setEditDepartmentInfo] = useState('');
  const [editTeamInfo, setEditTeamInfo] = useState('');
  const [editSoftwareUsed, setEditSoftwareUsed] = useState('');
  const [editPracticalInfo, setEditPracticalInfo] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [savingBrief, setSavingBrief] = useState(false);

  useEffect(() => {
    setIsEditingBrief(false);
  }, [row.application.id]);

  const startEditing = () => {
    setEditDepartmentInfo(mission?.departmentInfo || '');
    setEditTeamInfo(mission?.teamInfo || '');
    setEditSoftwareUsed(mission?.softwareUsed || '');
    setEditPracticalInfo(mission?.practicalInfo || '');
    setEditDescription(mission?.description || '');
    setIsEditingBrief(true);
  };

  const saveBrief = async () => {
    if (!mission?.id) return;
    setSavingBrief(true);
    try {
      await api.patch(`/missions/${mission.id}`, {
        departmentInfo: editDepartmentInfo,
        teamInfo: editTeamInfo,
        softwareUsed: editSoftwareUsed,
        practicalInfo: editPracticalInfo,
        description: editDescription,
      });

      updateLocalMission(mission.id, {
        departmentInfo: editDepartmentInfo,
        teamInfo: editTeamInfo,
        softwareUsed: editSoftwareUsed,
        practicalInfo: editPracticalInfo,
        description: editDescription,
      });

      setIsEditingBrief(false);
    } catch (e: any) {
      setError(e.message || 'Impossible de sauvegarder le brief.');
    } finally {
      setSavingBrief(false);
    }
  };

  const detailItems = [
    { label: 'Service', value: mission?.departmentInfo || mission?.sector },
    { label: 'Equipe', value: mission?.teamInfo },
    { label: 'Matériel', value: mission?.equipmentInfo || readableList(mission?.equipmentAvailable) },
    { label: 'Logiciel', value: mission?.softwareUsed },
    { label: 'Patients / jour', value: mission?.averagePatientsPerDay ? `${mission.averagePatientsPerDay}` : null },
    { label: 'Secrétariat', value: mission?.hasSecretary ? mission.secretaryType || 'Disponible' : null },
    { label: 'Parking', value: mission?.parkingAvailable ? 'Disponible' : null },
    { label: 'Logement', value: mission?.accommodationProvided ? 'Fourni' : null },
  ].filter((item) => item.value);

  const profile = candidateProfile?.candidate?.profile;
  const candidateFullName = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || row.application.candidate?.email || 'Candidat';

  async function openDocument(document: Document) {
    const previewWindow = openDocumentPreviewWindow();
    try {
      const res = await api.get<{ provider: string; downloadUrl: string }>(`/documents/${document.id}/download-url`);
      if (isMockStorageUrl(res.downloadUrl)) {
        previewWindow?.close();
        alert('Storage mock : aucun fichier réel à ouvrir en local.');
        return;
      }
      showDocumentInPreview(res.downloadUrl, previewWindow);
    } catch (e: any) {
      previewWindow?.close();
      setError(e.message);
    }
  }

  async function downloadRecruiterInvoice(conversationId: string) {
    try {
      const token = getAuthToken();
      const response = await fetch(getApiUrl(`/conversations/${conversationId}/invoices/recruiter.pdf`), {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!response.ok) throw new Error('Impossible de télécharger la facture.');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const disposition = response.headers.get('Content-Disposition');
      const match = disposition?.match(/filename="?([^"]+)"?/);
      link.download = match?.[1] || 'facture-etablissement.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || 'Erreur lors du téléchargement.');
    }
  }

  return (
    <section className="candidate-current-detail candidate-current-unified">
      {activeSection === 'pilotage' ? (
        <>
          <MissionCommandStrip row={row} />
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h3 style={{ fontSize: 18, margin: 0, color: 'var(--heading)' }}>
              {isEditingBrief ? 'Modification du brief' : 'Brief & notes'}
            </h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {isEditingBrief ? (
                <>
                  <Button variant="success" disabled={savingBrief} onClick={() => void saveBrief()}>
                    {savingBrief ? 'Enregistrement...' : 'Enregistrer'}
                  </Button>
                  <Button variant="light" onClick={() => setIsEditingBrief(false)}>
                    Annuler
                  </Button>
                </>
              ) : (
                <Button variant="light" onClick={startEditing}>
                  Modifier le brief
                </Button>
              )}
            </div>
          </div>

          {isEditingBrief ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="candidate-current-grid">
                <div className="candidate-current-panel" style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Service / Département</span>
                  <Input
                    type="text"
                    value={editDepartmentInfo}
                    onChange={(e) => setEditDepartmentInfo(e.target.value)}
                    placeholder="Ex: Urgences, Cardiologie..."
                  />
                </div>
                <div className="candidate-current-panel" style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Équipe & Organisation</span>
                  <Input
                    type="text"
                    value={editTeamInfo}
                    onChange={(e) => setEditTeamInfo(e.target.value)}
                    placeholder="Ex: 2 infirmiers, 1 aide-soignant..."
                  />
                </div>
              </div>

              <div className="candidate-current-grid">
                <div className="candidate-current-panel" style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Logiciel utilisé</span>
                  <Input
                    type="text"
                    value={editSoftwareUsed}
                    onChange={(e) => setEditSoftwareUsed(e.target.value)}
                    placeholder="Ex: Doctolib, Axi Santé..."
                  />
                </div>
                <div className="candidate-current-panel" style={{ display: 'grid', gap: 6 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)' }}>Description de la mission</span>
                  <Input
                    type="text"
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder="Ex: Remplacement médecin généraliste..."
                  />
                </div>
              </div>

              <div className="candidate-current-info">
                <div style={{ display: 'grid', gap: 6 }}>
                  <h3 style={{ fontSize: 16, margin: 0, color: 'var(--heading)' }}>Consignes de l'établissement (publiées au candidat)</h3>
                  <Textarea
                    value={editPracticalInfo}
                    rows={5}
                    placeholder="Ex: consignes d'arrivée, parking, déroulement de la journée..."
                    onChange={(e) => setEditPracticalInfo(e.target.value)}
                  />
                </div>
                <div style={{ display: 'grid', gap: 6 }}>
                  <h3 style={{ fontSize: 16, margin: 0, color: 'var(--heading)' }}>Notes internes (privées à l'établissement)</h3>
                  <Textarea
                    value={notes[mission?.id || ''] || ''}
                    rows={5}
                    placeholder="Ex: code d'entrée, contact sur place, code parking, documents à vérifier..."
                    onChange={(event) => updateNote(mission?.id || '', event.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            <>
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
                  <p>{mission?.teamInfo || 'Equipe et organisation à confirmer dans la messagerie.'}</p>
                  <small>{mission?.patientType || 'Patientèle à confirmer'}</small>
                </div>
              </div>

              <div className="candidate-current-info">
                <div>
                  <h3>Consignes publiées</h3>
                  <p>{mission?.practicalInfo || mission?.description || 'Aucune consigne spécifique de l\'établissement renseignée.'}</p>
                </div>
                <div>
                  <h3>Notes internes (privées)</h3>
                  <Textarea
                    value={notes[mission?.id || ''] || ''}
                    rows={5}
                    placeholder="Ex: code d'entrée, contact sur place, code parking, documents à vérifier..."
                    onChange={(event) => updateNote(mission?.id || '', event.target.value)}
                  />
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
            </>
          )}
        </div>
      ) : null}

      {activeSection === 'candidat' ? (
        <div className="candidate-current-tab-panel">
          <div className="candidate-current-grid">
            <div className="candidate-current-panel">
              <span>Candidat</span>
              <strong>{candidateFullName}</strong>
              <p>{medicalStatusLabel(profile?.medicalStatus, profile)} - {profile?.specialty || mission?.specialty || 'Spécialité à confirmer'}</p>
              <small>{profile?.hospitalOrFaculty || 'Aucun établissement / faculté renseigné'}</small>
            </div>
            <div className="candidate-current-panel">
              <span>Contact</span>
              <strong>Coordonnées</strong>
              <p>{candidateProfile?.candidate?.email || 'Pas d\'email'}</p>
              <small>{candidateProfile?.candidate?.phone || 'Pas de téléphone'}</small>
            </div>
          </div>

          <div className="candidate-current-info">
            <div>
              <h3>Présentation / Bio</h3>
              <p>{profile?.bio || 'Le candidat n\'a pas rédigé de biographie.'}</p>
            </div>
            <div>
              <h3>Compétences & Logiciels</h3>
              <div style={{ display: 'grid', gap: 10 }}>
                {profile?.userSkills?.length ? (
                  <div>
                    <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Compétences validées :</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {profile.userSkills.map((item) => (
                        <Badge key={item.id} tone="success">{item.skill.name}</Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div>
                  <span style={{ fontSize: 12, color: 'var(--muted)', display: 'block', marginBottom: 4 }}>Logiciels maîtrisés :</span>
                  <p>{readableList(profile?.knownSoftware) || 'Non précisé.'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {activeSection === 'documents' ? (
        <CandidateDocumentsPanel
          candidateProfile={candidateProfile}
          loading={profileLoading}
          openDocument={openDocument}
        />
      ) : null}

      {activeSection === 'compta' ? (
        <div className="candidate-current-tab-panel">
          <div className="candidate-current-grid">
            <div className="candidate-current-panel">
              <span>Rémunération de mission</span>
              <strong>{formatCompensation(row.agreement || mission || {})}</strong>
              <p>{row.agreement ? agreementLabel(row.agreement.status) : statusLabel(row.application.status)}</p>
              <small>{row.agreement?.terms || 'Conditions financières à retrouver dans l\'accord.'}</small>
            </div>
            <div className="candidate-current-panel">
              <span>Détails financiers</span>
              <strong>Honoraires nets : {row.agreement ? `${row.agreement.candidateAmount} €` : '—'}</strong>
              <p>Frais de service MediLink : {row.agreement ? `${row.agreement.platformFee} €` : '—'}</p>
              <small>Montant total payé : {row.agreement ? `${row.agreement.amount} €` : '—'}</small>
            </div>
          </div>

          {row.agreement?.invoices?.length ? (
            <div style={{ marginTop: 20 }}>
              <h3 style={{ fontSize: 16, margin: '0 0 10px 0', color: 'var(--heading)' }}>Factures & Justificatifs</h3>
              <div className="table-wrap" style={{ background: '#fff', padding: 8, borderRadius: 8, border: '1px solid var(--line)' }}>
                <table style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>N° Facture</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Type</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Montant</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Date d'émission</th>
                      <th style={{ textAlign: 'left', padding: '8px 12px' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {row.agreement.invoices.map((inv) => (
                      <tr key={inv.id} style={{ borderTop: '1px solid var(--line)' }}>
                        <td style={{ padding: '8px 12px' }}><strong>{inv.number}</strong></td>
                        <td style={{ padding: '8px 12px' }}>{inv.type === 'RECRUITER_INVOICE' ? 'Facture Établissement' : 'Justificatif Candidat'}</td>
                        <td style={{ padding: '8px 12px' }}>{inv.amount.toLocaleString('fr-FR', { style: 'currency', currency: inv.currency })}</td>
                        <td style={{ padding: '8px 12px' }}>{formatDate(inv.issuedAt)}</td>
                        <td style={{ padding: '8px 12px' }}>
                          {inv.type === 'RECRUITER_INVOICE' ? (
                            <Button
                              variant="light"
                              onClick={() => void downloadRecruiterInvoice(row.conversation?.id || '')}
                            >
                              Télécharger
                            </Button>
                          ) : (
                            <span style={{ fontSize: 12, color: 'var(--muted)' }}>Candidat</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          <div className="actions" style={{ marginTop: 20 }}>
            {row.application.conversation ? (
              <LinkButton href="/establishment/messages">Contacter le candidat</LinkButton>
            ) : null}
            {mission?.id ? (
              <LinkButton href={`/establishment/missions/${mission.id}`} variant="light">Voir l'annonce</LinkButton>
            ) : null}
            <LinkButton href="/establishment/billing" variant="light">Suivi facturation complet</LinkButton>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function CandidateDocumentsPanel({
  candidateProfile,
  loading,
  openDocument,
}: {
  candidateProfile: CandidateProfileForApplication | null;
  loading: boolean;
  openDocument: (doc: Document) => Promise<void>;
}) {
  if (loading) return <LoadingCard label="Chargement des documents du candidat..." />;
  if (!candidateProfile) return <Alert type="info">Profil du candidat indisponible.</Alert>;

  const documents = candidateProfile.candidate.documents || [];

  return (
    <div className="candidate-current-tab-panel">
      <div className="candidate-current-documents">
        <div>
          <span>Documents validés</span>
          <strong>Pièces justificatives du candidat</strong>
          <p>Documents professionnels vérifiés par MediLink pour ce candidat.</p>
        </div>

        <div className="table-wrap" style={{ marginTop: 14, background: '#fff', padding: 8, borderRadius: 8, border: '1px solid var(--line)' }}>
          <table style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Type</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Fichier</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Vérification</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '8px 12px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} style={{ borderTop: '1px solid var(--line)' }}>
                  <td style={{ padding: '8px 12px' }}><strong>{documentTypeLabel(doc.documentType)}</strong></td>
                  <td style={{ padding: '8px 12px' }}>{doc.fileName}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <Badge tone={doc.verificationStatus === 'APPROVED' ? 'success' : 'neutral'}>
                      {statusLabel(doc.verificationStatus)}
                    </Badge>
                  </td>
                  <td style={{ padding: '8px 12px' }}>{formatDate(doc.createdAt)}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <Button variant="light" onClick={() => void openDocument(doc)}>
                      Voir
                    </Button>
                  </td>
                </tr>
              ))}
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '16px var(--muted)' }}>
                    Aucun document professionnel validé disponible pour ce candidat.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
