'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { MissionDeleteButton } from '@/components/MissionDeleteButton';
import { MissionShareActions } from '@/components/MissionShareActions';
import { Alert, Badge, Card, LinkButton, LoadingCard } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabel, statusLabel } from '@/lib/labels';
import { getMissionApplyPath } from '@/lib/mission-links';
import { defaultRouteForUser, isEstablishmentRole } from '@/lib/routes';
import type { Mission } from '@/lib/types';

export default function MissionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [mission, setMission] = useState<Mission | null>(null);
  const [canManageMission, setCanManageMission] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    async function loadMission() {
      setLoading(true);
      setError(null);
      setCanManageMission(false);

      try {
        if (isEstablishmentRole(user?.role)) {
          try {
            const managedMission = await api.get<Mission>(`/missions/mine/${id}`);
            setMission(managedMission);
            setCanManageMission(true);
            return;
          } catch {
            // If this establishment does not manage the mission, fall through to the public view.
          }
        }

        setMission(await api.get<Mission>(`/missions/${id}`));
      } catch (e: any) {
        setMission(null);
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    void loadMission();
  }, [authLoading, id, user?.role]);

  const applyPath = useMemo(() => getMissionApplyPath(id), [id]);
  const applyHref = user?.role === 'CANDIDATE'
    ? applyPath
    : `/login?next=${encodeURIComponent(applyPath)}`;

  return (
    <main className="landing-page public-mission-page">
      <div className="container">
        <nav className="public-nav">
          <Link href="/" className="brand">
            <span className="brand-mark">M</span>
            <span>Medilink</span>
          </Link>
          <div className="nav-actions">
            {authLoading ? null : user ? (
              <LinkButton variant="light" href={defaultRouteForUser(user)}>Mon espace</LinkButton>
            ) : (
              <>
                <LinkButton variant="light" href="/login">Connexion</LinkButton>
                <LinkButton href="/register">Creer un compte</LinkButton>
              </>
            )}
          </div>
        </nav>

        {loading || authLoading ? <LoadingCard label="Chargement de la mission..." /> : null}
        {error ? <Alert type="error">{error}</Alert> : null}

        {!loading && !authLoading && mission ? (
          <>
            <section className="public-mission-hero">
              <div className="section-heading">
                <div className="kicker">{canManageMission ? 'Mission etablissement' : 'Mission medicale'}</div>
                <h1>{mission.title}</h1>
                <p>{mission.establishment?.name || 'Etablissement'} - {mission.city}</p>
              </div>
              <div className="actions">
                {canManageMission ? (
                  <>
                    <LinkButton variant="light" href="/establishment/missions">Retour aux missions</LinkButton>
                    {mission.status === 'PUBLISHED' ? (
                      <MissionShareActions missionId={mission.id} showUrl showPublicLink={false} />
                    ) : null}
                    <MissionDeleteButton
                      mission={mission}
                      onDeleted={() => router.push('/establishment/missions')}
                    />
                  </>
                ) : (
                  <>
                    <LinkButton href={applyHref}>{user?.role === 'CANDIDATE' ? 'Postuler' : 'Se connecter pour postuler'}</LinkButton>
                    <LinkButton variant="light" href="/app/search">Voir les missions</LinkButton>
                  </>
                )}
              </div>
            </section>

            <div className="grid-2">
              <Card>
                <h2>Details</h2>
                <p>{mission.description || 'Aucune description.'}</p>
                <div className="tag-list">
                  <Badge>{missionTypeLabel(mission.missionType)}</Badge>
                  <Badge tone="neutral">{requiredLevelLabel(mission.requiredLevel)}</Badge>
                  <Badge tone={mission.status === 'PUBLISHED' ? 'success' : 'warning'}>{statusLabel(mission.status)}</Badge>
                  {mission.tags?.map((tag) => <Badge key={tag.id} tone="neutral">#{tag.tag}</Badge>)}
                </div>
              </Card>

              <Card className="card-highlight">
                <h2>Informations pratiques</h2>
                <div className="info-list">
                  <div><span>Date</span><strong>{formatDate(mission.startDate)}</strong></div>
                  <div><span>Horaire</span><strong>{mission.startTime || '-'} {mission.endTime ? `- ${mission.endTime}` : ''}</strong></div>
                  <div><span>Duree</span><strong>{mission.durationHours || '-'} h</strong></div>
                  <div><span>Remuneration</span><strong>{formatMoney(mission.compensationAmount, mission.compensationCurrency)}</strong></div>
                  <div><span>Localisation</span><strong>{mission.location || mission.city}</strong></div>
                </div>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
