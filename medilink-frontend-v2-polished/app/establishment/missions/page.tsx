'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Application, ApplicationStatus, Mission } from '@/lib/types';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { formatDateTime } from '@/lib/format';
import { candidateNoun } from '@/lib/grammar';
import { statusLabel } from '@/lib/labels';
import { MissionDeleteButton } from '@/components/MissionDeleteButton';
import { MissionCard } from '@/components/MissionCard';
import { Alert, Badge, Button, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

type AnnouncementTab = 'missions' | 'applications';

const tabs: Array<{ id: AnnouncementTab; label: string }> = [
  { id: 'missions', label: 'Missions' },
  { id: 'applications', label: 'Candidatures' },
];

function applicationTone(status: string) {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'VIEWED') return 'warning';
  return 'neutral';
}

export default function EstablishmentMissionsPage() {
  const { primary, loading } = useEstablishments();
  const [activeTab, setActiveTab] = useState<AnnouncementTab>('missions');
  const [missions, setMissions] = useState<Mission[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const queryTab = new URLSearchParams(window.location.search).get('tab');
    if (queryTab === 'applications') setActiveTab('applications');
  }, []);

  function selectTab(tab: AnnouncementTab) {
    setActiveTab(tab);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (tab === 'applications') {
      url.searchParams.set('tab', 'applications');
    } else {
      url.searchParams.delete('tab');
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  async function loadMissions() {
    if (!primary) return;

    setMissionsLoading(true);
    try {
      setError(null);
      setMissions(await api.get<Mission[]>(`/missions/mine?establishmentId=${primary.id}`));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setMissionsLoading(false);
    }
  }

  async function loadApplications() {
    if (!primary) return;

    setApplicationsLoading(true);
    try {
      setError(null);
      const data = await api.get<Application[]>(`/establishment/applications?establishmentId=${primary.id}`);
      setApplications(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplicationsLoading(false);
    }
  }

  useEffect(() => {
    if (!primary) {
      setMissions([]);
      setApplications([]);
      return;
    }

    void loadMissions();
    void loadApplications();
  }, [primary]);

  async function updateApplication(id: string, status: ApplicationStatus) {
    try {
      setError(null);
      setUpdatingId(id);
      await api.patch(`/applications/${id}/status`, { status });
      await loadApplications();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading || (primary && activeTab === 'missions' && missionsLoading) || (primary && activeTab === 'applications' && applicationsLoading)) {
    return <LoadingCard label={activeTab === 'applications' ? 'Chargement des candidatures...' : 'Chargement des missions...'} />;
  }

  return (
    <>
      <PageHeader
        title="Annonce et candidature"
        description="Publiez vos missions et traitez les candidatures reçues depuis le même espace."
        actions={
          primary ? (
            <LinkButton href="/establishment/missions/new">Créer mission</LinkButton>
          ) : (
            <LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton>
          )
        }
      />
      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="billing-tabs" role="tablist" aria-label="Sections des annonces" style={{ marginBottom: 18 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => selectTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!primary ? (
        <Card className="card-highlight">
          <h2>Aucun établissement rattaché</h2>
          <p>Créez d'abord un établissement pour pouvoir publier une mission et pré-remplir les informations de lieu.</p>
          <LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton>
        </Card>
      ) : activeTab === 'missions' ? (
        <MissionsTab
          missions={missions}
          onMissionDeleted={(missionId) => setMissions((current) => current.filter((mission) => mission.id !== missionId))}
        />
      ) : (
        <ApplicationsTab
          applications={applications}
          updatingId={updatingId}
          updateApplication={updateApplication}
          onMissionDeleted={(missionId) => setApplications((current) => current.filter((item) => item.missionId !== missionId))}
        />
      )}
    </>
  );
}

function MissionsTab({
  missions,
  onMissionDeleted,
}: {
  missions: Mission[];
  onMissionDeleted: (missionId: string) => void;
}) {
  if (missions.length === 0) {
    return (
      <Card>
        <h2>Aucune mission</h2>
        <p>Créez une mission pour la publier, la partager ou la gérer depuis cet espace.</p>
        <LinkButton href="/establishment/missions/new">Créer une mission</LinkButton>
      </Card>
    );
  }

  return (
    <div className="grid mission-list">
      {missions.map((m) => (
        <MissionCard
          key={m.id}
          mission={m}
          detailHref={`/establishment/missions/${m.id}`}
          canDelete
          onDeleted={() => onMissionDeleted(m.id)}
        />
      ))}
    </div>
  );
}

function ApplicationsTab({
  applications,
  updatingId,
  updateApplication,
  onMissionDeleted,
}: {
  applications: Application[];
  updatingId: string | null;
  updateApplication: (id: string, status: ApplicationStatus) => Promise<void>;
  onMissionDeleted: (missionId: string) => void;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Candidat</th>
            <th>Mission</th>
            <th>Statut</th>
            <th>Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications.map((application) => {
            const isFinal = application.status === 'ACCEPTED' || application.status === 'REJECTED' || application.status === 'WITHDRAWN';
            const isUpdating = updatingId === application.id;

            return (
              <tr key={application.id}>
                <td>
                  <strong>{application.candidate?.profile?.firstName} {application.candidate?.profile?.lastName}</strong>
                  <div className="small">{application.candidate?.email}</div>
                </td>
                <td>
                  {application.mission?.title}
                  <div className="small">{application.mission?.city}</div>
                </td>
                <td><Badge tone={applicationTone(application.status) as any}>{statusLabel(application.status)}</Badge></td>
                <td>{formatDateTime(application.createdAt)}</td>
                <td className="actions">
                  <LinkButton variant="light" href={`/establishment/candidates/${application.id}`}>
                    Voir profil {candidateNoun(application.candidate?.profile)}
                  </LinkButton>

                  {application.mission ? (
                    <MissionDeleteButton
                      mission={application.mission}
                      onDeleted={() => onMissionDeleted(application.missionId)}
                    />
                  ) : null}

                  {isFinal ? (
                    <span className="small">Décision enregistrée</span>
                  ) : (
                    <>
                      <Button variant="success" disabled={isUpdating} onClick={() => void updateApplication(application.id, 'ACCEPTED')}>
                        {isUpdating ? '...' : 'Accepter'}
                      </Button>
                      <Button variant="danger" disabled={isUpdating} onClick={() => void updateApplication(application.id, 'REJECTED')}>
                        {isUpdating ? '...' : 'Refuser'}
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {applications.length === 0 ? (
            <tr>
              <td colSpan={5}>Aucune candidature.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
