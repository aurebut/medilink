'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatCompensation, formatDate } from '@/lib/format';
import { medicalStatusLabel, missionTypeLabel, requiredLevelLabels } from '@/lib/labels';
import type { Application, Mission } from '@/lib/types';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Alert, Badge, Card, LinkButton, LoadingCard, PageHeader, StatCard, Textarea } from '@/components/ui';

type MissionMoment = 'upcoming' | 'today' | 'active' | 'done';
type NotesByApplication = Record<string, string>;

function candidateName(application: Application) {
  const profile = application.candidate?.profile;
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  return name || application.candidate?.email || 'Candidat assigne';
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
    done: 'Terminee',
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
  if (!start || !end) return 'Date a confirmer';

  const diffStart = start.getTime() - now.getTime();
  if (now > end) return `Mission terminee le ${formatDate(mission?.endDate || mission?.startDate)}`;
  if (diffStart > 0) {
    const days = Math.ceil(diffStart / 86400000);
    if (days <= 1) return 'Demarre dans moins de 24 h';
    return `Demarre dans ${days} jours`;
  }

  const diffEnd = end.getTime() - now.getTime();
  const remainingDays = Math.ceil(diffEnd / 86400000);
  return remainingDays <= 1 ? 'Derniere journee en cours' : `${remainingDays} jours restants`;
}

function missionSchedule(mission?: Mission) {
  if (!mission) return 'Planning a confirmer';
  const dates = mission.endDate && mission.endDate !== mission.startDate
    ? `${formatDate(mission.startDate)} - ${formatDate(mission.endDate)}`
    : formatDate(mission.startDate);
  const hours = [mission.startTime, mission.endTime].filter(Boolean).join(' - ');
  return hours ? `${dates} - ${hours}` : dates;
}

function missionChecklist(moment: MissionMoment) {
  const steps = [
    { key: 'accepted', label: 'Candidat valide' },
    { key: 'prepared', label: 'Details partages' },
    { key: 'active', label: 'Mission suivie' },
    { key: 'closed', label: 'Fin & paiement' },
  ];
  const activeIndex = moment === 'done' ? 3 : moment === 'active' ? 2 : moment === 'today' ? 1 : 0;
  return steps.map((step, index) => ({ ...step, active: index <= activeIndex }));
}

function notesStorageKey(establishmentId: string) {
  return `medilink_current_mission_notes_${establishmentId}`;
}

export default function EstablishmentCurrentMissionsPage() {
  const { primary, loading } = useEstablishments();
  const [applications, setApplications] = useState<Application[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState<NotesByApplication>({});

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

  const stats = useMemo(() => {
    const moments = currentApplications.map((application) => missionMoment(application.mission));
    return {
      active: moments.filter((moment) => moment === 'active' || moment === 'today').length,
      upcoming: moments.filter((moment) => moment === 'upcoming').length,
      done: moments.filter((moment) => moment === 'done').length,
    };
  }, [currentApplications]);

  function updateNote(applicationId: string, value: string) {
    const next = { ...notes, [applicationId]: value };
    setNotes(next);
    if (primary && typeof window !== 'undefined') {
      window.localStorage.setItem(notesStorageKey(primary.id), JSON.stringify(next));
    }
  }

  if (loading || missionsLoading) return <LoadingCard label="Chargement des missions en cours..." />;

  return (
    <>
      <PageHeader
        title="Missions en cours"
        description="Suivez les missions pourvues, le candidat assigne et les details operationnels a garder sous la main."
        actions={<LinkButton href="/establishment/applications">Voir les candidatures</LinkButton>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      {!primary ? (
        <Card className="card-highlight">
          <h2>Aucun etablissement rattache</h2>
          <p>Creez votre fiche etablissement pour publier des missions puis suivre les missions confirmees ici.</p>
          <LinkButton href="/establishment/onboarding">Creer mon etablissement</LinkButton>
        </Card>
      ) : currentApplications.length === 0 ? (
        <Card className="card-highlight current-missions-empty">
          <h2>Aucune mission en cours</h2>
          <p>Les missions apparaissent ici des qu'une candidature est acceptee. Vous pourrez ensuite suivre le planning, contacter le candidat et ajouter vos notes terrain.</p>
          <div className="actions">
            <LinkButton href="/establishment/applications">Traiter les candidatures</LinkButton>
            <LinkButton variant="light" href="/establishment/missions/new">Creer une mission</LinkButton>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid-3 current-missions-stats">
            <StatCard label="En route aujourd'hui" value={stats.active} helper="Missions actives ou qui demarrent aujourd'hui" />
            <StatCard label="A venir" value={stats.upcoming} helper="Missions confirmees a preparer" />
            <StatCard label="Terminees" value={stats.done} helper="Missions acceptees deja passees" />
          </div>

          <div className="current-missions-list">
            {currentApplications.map((application) => {
              const mission = application.mission;
              const profile = application.candidate?.profile;
              const moment = missionMoment(mission);
              const checklist = missionChecklist(moment);
              const practicalItems = [
                mission?.departmentInfo,
                mission?.teamInfo,
                mission?.equipmentInfo,
                mission?.practicalInfo,
              ].filter((item): item is string => Boolean(item));

              return (
                <Card key={application.id} className="current-mission-card">
                  <div className="current-mission-head">
                    <div>
                      <div className="current-mission-kicker">
                        <Badge tone={momentTone(moment)}>{momentLabel(moment)}</Badge>
                        <span>{nextTiming(application)}</span>
                      </div>
                      <h2>{mission?.title || 'Mission a confirmer'}</h2>
                      <p>{missionSchedule(mission)} - {mission?.city || primary.city || 'Lieu a confirmer'}</p>
                    </div>
                    <div className="current-mission-actions">
                      {application.conversation ? (
                        <LinkButton variant="light" href="/establishment/messages">Message</LinkButton>
                      ) : null}
                      <LinkButton href={`/establishment/candidates/${application.id}`}>Profil candidat</LinkButton>
                    </div>
                  </div>

                  <div className="current-mission-route" aria-label="Progression de la mission">
                    {checklist.map((step) => (
                      <div key={step.key} className={`current-mission-step ${step.active ? 'active' : ''}`}>
                        <span />
                        <strong>{step.label}</strong>
                      </div>
                    ))}
                  </div>

                  <div className="current-mission-grid">
                    <div className="current-mission-panel">
                      <span className="current-mission-label">Candidat</span>
                      <strong>{candidateName(application)}</strong>
                      <p>{medicalStatusLabel(profile?.medicalStatus, profile)} - {profile?.specialty || mission?.specialty || 'Specialite a confirmer'}</p>
                      <div className="current-mission-mini">
                        <span>{application.candidate?.email || 'Email non renseigne'}</span>
                        <span>{application.candidate?.phone || 'Telephone non renseigne'}</span>
                      </div>
                    </div>

                    <div className="current-mission-panel">
                      <span className="current-mission-label">Mission</span>
                      <strong>{missionTypeLabel(mission?.missionType)} - {requiredLevelLabels(mission?.requiredLevels, mission?.requiredLevel)}</strong>
                      <p>{formatCompensation(mission || {})}</p>
                      <div className="current-mission-mini">
                        <span>{mission?.sector || primary.sector || 'Secteur a confirmer'}</span>
                        <span>{mission?.softwareUsed || primary.softwareUsed || 'Logiciel a renseigner'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="current-mission-details">
                    <div>
                      <h3>Details terrain</h3>
                      {practicalItems.length > 0 ? (
                        <ul>
                          {practicalItems.map((item) => <li key={item}>{item}</li>)}
                        </ul>
                      ) : (
                        <p>Ajoutez les consignes utiles dans la mission ou dans vos notes internes.</p>
                      )}
                    </div>
                    <label className="current-mission-note">
                      <span>Notes internes</span>
                      <Textarea
                        value={notes[application.id] || ''}
                        rows={5}
                        placeholder="Ex: entree personnel, contact sur place, code parking, documents a verifier..."
                        onChange={(event) => updateNote(application.id, event.target.value)}
                      />
                    </label>
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
