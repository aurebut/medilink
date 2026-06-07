'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MissionDeleteButton } from '@/components/MissionDeleteButton';
import { MissionShareActions } from '@/components/MissionShareActions';
import { Alert, Badge, Button, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCompensation, formatDate, formatDateTime } from '@/lib/format';
import { candidateNoun } from '@/lib/grammar';
import { missionTypeLabel, requiredLevelLabels, statusLabel } from '@/lib/labels';
import { getMissionPublicPath } from '@/lib/mission-links';
import type { Application, ApplicationStatus, Mission } from '@/lib/types';

function applicationTone(status: ApplicationStatus) {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED' || status === 'WITHDRAWN' || status === 'CANCELLED') return 'danger';
  if (status === 'VIEWED') return 'warning';
  return 'neutral';
}

function missionTone(status: Mission['status']) {
  if (status === 'PUBLISHED' || status === 'FILLED') return 'success';
  if (status === 'PAUSED') return 'warning';
  if (status === 'ARCHIVED') return 'neutral';
  return 'warning';
}

function candidateName(application: Application) {
  const profile = application.candidate?.profile;
  const name = [profile?.firstName, profile?.lastName].filter(Boolean).join(' ');
  return name || application.candidate?.email || 'Candidat à identifier';
}

function missionSchedule(mission: Mission) {
  const dates = mission.endDate && mission.endDate !== mission.startDate
    ? `${formatDate(mission.startDate)} - ${formatDate(mission.endDate)}`
    : formatDate(mission.startDate);
  const hours = [mission.startTime, mission.endTime].filter(Boolean).join(' - ');
  return hours ? `${dates} - ${hours}` : dates;
}

export default function EstablishmentMissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    try {
      const nextMission = await api.get<Mission>(`/missions/mine/${id}`);
      setMission(nextMission);

      try {
        const allApplications = await api.get<Application[]>(`/establishment/applications?establishmentId=${nextMission.establishmentId}`);
        setApplications(allApplications.filter((application) => application.missionId === nextMission.id));
      } catch {
        setApplications([]);
      }
    } catch (e: any) {
      setError(e.message);
      setMission(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  const stats = useMemo(() => {
    return {
      pending: applications.filter((application) => application.status === 'SUBMITTED' || application.status === 'VIEWED').length,
      accepted: applications.filter((application) => application.status === 'ACCEPTED').length,
      rejected: applications.filter((application) => application.status === 'REJECTED').length,
    };
  }, [applications]);

  async function changeStatus(action: 'publish' | 'pause' | 'archive') {
    setStatusBusy(action);
    setError(null);
    setSuccess(null);

    try {
      await api.post(`/missions/${id}/${action}`, {});
      await load();
      setSuccess(action === 'publish' ? 'Mission publiée.' : action === 'pause' ? 'Mission mise en pause.' : 'Mission archivée.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setStatusBusy(null);
    }
  }

  if (loading) return <LoadingCard label="Chargement de la mission..." />;

  if (!mission) {
    return (
      <>
        <PageHeader title="Mission" description="Impossible de charger cette mission établissement." />
        {error ? <Alert type="error">{error}</Alert> : null}
        <Card>
          <p>La mission est introuvable ou vous n'avez pas les droits de gestion.</p>
          <LinkButton href="/establishment/missions">Retour aux missions</LinkButton>
        </Card>
      </>
    );
  }

  return (
    <div className="establishment-mission-detail-page">
      <PageHeader
        title={mission.title}
        description="Page interne de pilotage : aperçu, édition, publication et candidatures liées."
        actions={
          <>
            <LinkButton variant="light" href="/establishment/missions">Toutes les missions</LinkButton>
            <LinkButton href={`/establishment/missions/${mission.id}/edit`}>Modifier l'annonce</LinkButton>
            {mission.status === 'PUBLISHED' ? <LinkButton variant="light" href={getMissionPublicPath(mission.id)}>Voir le public</LinkButton> : null}
          </>
        }
      />

      {error ? <Alert type="error">{error}</Alert> : null}
      {success ? <Alert type="success">{success}</Alert> : null}

      <section className="establishment-command-strip" aria-label="Pilotage mission">
        <div className="establishment-command-main">
          <Badge tone={missionTone(mission.status)}>{statusLabel(mission.status)}</Badge>
          <h2>{mission.establishment?.name || 'Établissement'} - {mission.city}</h2>
          <p>{missionSchedule(mission)}</p>
        </div>
        <div className="candidate-command-stat">
          <span>Candidatures</span>
          <strong>{applications.length}</strong>
          <small>{stats.pending} à traiter</small>
        </div>
        <div className="candidate-command-stat">
          <span>Rémunération</span>
          <strong>{formatCompensation(mission)}</strong>
          <small>{missionTypeLabel(mission.missionType)}</small>
        </div>
        <div className="establishment-command-actions">
          {mission.status !== 'PUBLISHED' ? (
            <Button type="button" variant="secondary" disabled={Boolean(statusBusy)} onClick={() => void changeStatus('publish')}>
              {statusBusy === 'publish' ? 'Publication...' : 'Publier'}
            </Button>
          ) : (
            <Button type="button" variant="light" disabled={Boolean(statusBusy)} onClick={() => void changeStatus('pause')}>
              {statusBusy === 'pause' ? 'Pause...' : 'Mettre en pause'}
            </Button>
          )}
          {mission.status !== 'ARCHIVED' ? (
            <Button type="button" variant="light" disabled={Boolean(statusBusy)} onClick={() => void changeStatus('archive')}>
              {statusBusy === 'archive' ? 'Archivage...' : 'Archiver'}
            </Button>
          ) : null}
        </div>
      </section>

      <div className="establishment-mission-grid">
        <Card className="establishment-mission-preview">
          <div className="dashboard-section-head">
            <div>
              <span>Aperçu candidat</span>
              <h2>Annonce publiée</h2>
            </div>
            {mission.status === 'PUBLISHED' ? <MissionShareActions missionId={mission.id} showPublicLink={false} /> : null}
          </div>
          <div className="candidate-current-grid">
            <div className="candidate-current-panel">
              <span>Besoin</span>
              <strong>{missionTypeLabel(mission.missionType)} - {requiredLevelLabels(mission.requiredLevels, mission.requiredLevel)}</strong>
              <p>{mission.description || 'Aucune description pour cette mission.'}</p>
              <small>{mission.specialty || 'Spécialité à confirmer'}</small>
            </div>
            <div className="candidate-current-panel">
              <span>Planning</span>
              <strong>{formatDate(mission.startDate)}</strong>
              <p>{[mission.startTime, mission.endTime].filter(Boolean).join(' - ') || 'Horaires à confirmer'}</p>
              <small>{mission.location || mission.city}</small>
            </div>
          </div>
          <div className="candidate-current-detail-grid">
            <div><span>Service</span><strong>{mission.departmentInfo || mission.sector || '-'}</strong></div>
            <div><span>Patientèle</span><strong>{mission.patientType || '-'}</strong></div>
            <div><span>Logiciel</span><strong>{mission.softwareUsed || '-'}</strong></div>
            <div><span>Équipe</span><strong>{mission.teamInfo || '-'}</strong></div>
          </div>
        </Card>

        <Card className="establishment-mission-side">
          <div className="dashboard-section-head">
            <div>
              <span>Actions</span>
              <h2>Gestion</h2>
            </div>
          </div>
          <div className="dashboard-dossier-summary">
            <div><span>À traiter</span><strong>{stats.pending}</strong></div>
            <div><span>Acceptées</span><strong>{stats.accepted}</strong></div>
            <div><span>Refusées</span><strong>{stats.rejected}</strong></div>
          </div>
          <div className="establishment-action-stack">
            <LinkButton href="/establishment/missions?tab=applications" variant="secondary">Voir les candidatures</LinkButton>
            <LinkButton href={`/establishment/missions/${mission.id}/edit`}>Modifier l'annonce</LinkButton>
            <LinkButton href="/establishment/messages" variant="light">Messagerie</LinkButton>
            {mission.status === 'PUBLISHED' ? <MissionShareActions missionId={mission.id} showUrl /> : null}
            <MissionDeleteButton mission={mission} onDeleted={() => router.push('/establishment/missions')} />
          </div>
        </Card>
      </div>

      <div className="establishment-mission-workspace compact-workspace">
        <Card className="establishment-applications-panel">
          <div className="toolbar">
            <div>
              <h2>Candidatures liées</h2>
              <p className="small">Vue rapide des profils reçus sur cette mission.</p>
            </div>
            <LinkButton href="/establishment/missions?tab=applications" variant="light">Tout voir</LinkButton>
          </div>
          {applications.length > 0 ? (
            <div className="dashboard-list">
              {applications.map((application) => (
                <div key={application.id} className="dashboard-list-item">
                  <div>
                    <strong>{candidateName(application)}</strong>
                    <span>{application.candidate?.email || `Profil ${candidateNoun(application.candidate?.profile)}`}</span>
                  </div>
                  <div className="dashboard-list-meta">
                    <Badge tone={applicationTone(application.status)}>{statusLabel(application.status)}</Badge>
                    <span className="small">{formatDateTime(application.createdAt)}</span>
                    <LinkButton href={`/establishment/candidates/${application.id}`} variant="light">Voir</LinkButton>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty compact">
              <strong>Aucune candidature</strong>
              <p>Les candidatures apparaîtront ici quand l'annonce sera visible et partagée.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
