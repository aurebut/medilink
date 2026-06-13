'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Application, ApplicationStatus, Mission, MissionType, Paginated, Profile, RequiredLevel } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { missionTypeOptions, requiredLevelOptions, statusLabel } from '@/lib/labels';
import { Alert, Badge, Button, Card, EmptyState, Field, Input, LoadingCard, PageHeader, Select } from '@/components/ui';
import { MissionCard } from '@/components/MissionCard';
import { establishmentDepartmentOptions, patientTypeOptions, sectorOptions, softwareOptions } from '@/lib/profile-options';
import { getCandidateConversationPath, getCandidateMissionPath, getMissionApplyPath } from '@/lib/mission-links';
import { formatDateTime } from '@/lib/format';

const emptyFilters = {
  q: '',
  city: '',
  departmentInfo: '',
  specialty: '',
  missionType: '',
  requiredLevel: '',
  sector: '',
  patientType: '',
  softwareUsed: '',
  hasSecretary: '',
  dateFrom: '',
  retrocessionMin: '',
  retrocessionMax: '',
};

type SearchTab = 'recommended' | 'search' | 'applications';

const tabs: Array<{ id: SearchTab; label: string }> = [
  { id: 'recommended', label: 'Missions pour vous' },
  { id: 'search', label: 'Recherche' },
  { id: 'applications', label: 'Candidatures' },
];

function applicationTone(status: string) {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED' || status === 'WITHDRAWN') return 'danger';
  if (status === 'VIEWED') return 'warning';
  return 'neutral';
}

const closedApplicationStatuses: ApplicationStatus[] = ['ACCEPTED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'];

function isClosedApplication(status: ApplicationStatus) {
  return closedApplicationStatuses.includes(status);
}

function ApplicationActionIcon({ type }: { type: 'message' | 'mission' | 'withdraw' }) {
  if (type === 'message') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M21 12a8 8 0 0 1-8 8H6l-3 2 1.2-4A8 8 0 1 1 21 12Z" />
        <path d="M8 11h8M8 14h5" />
      </svg>
    );
  }

  if (type === 'mission') {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M8 4h8l3 3v13H5V4h3Z" />
        <path d="M15 4v4h4M8 12h8M8 16h6" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M6 7h12M10 11v6M14 11v6M9 7l1-3h4l1 3M8 7l1 13h6l1-13" />
    </svg>
  );
}

const secondaryFilterKeys = [
  'missionType',
  'requiredLevel',
  'sector',
  'patientType',
  'softwareUsed',
  'hasSecretary',
  'dateFrom',
  'retrocessionMin',
  'retrocessionMax',
];

function normalize(value?: string | null) {
  return (value || '').trim().toLowerCase();
}

function includesMatch(source?: string | null, target?: string | null) {
  const a = normalize(source);
  const b = normalize(target);
  return !!a && !!b && (a.includes(b) || b.includes(a));
}

function scoreMissionForProfile(mission: Mission, profile: Profile | null, appliedMissionIds: Set<string>) {
  let score = 0;

  if (appliedMissionIds.has(mission.id)) score -= 100;
  if (mission.status === 'PUBLISHED') score += 8;
  if (profile?.preferredCities?.some((city) => includesMatch(mission.city, city))) score += 12;
  if (includesMatch(mission.city, profile?.city)) score += 8;
  if (includesMatch(mission.specialty, profile?.specialty)) score += 10;
  if (profile?.medicalStatus && (mission.requiredLevels || [mission.requiredLevel]).includes(profile.medicalStatus as RequiredLevel)) score += 6;
  if (mission.patientType && profile?.acceptedPatientTypes?.some((patientType) => includesMatch(mission.patientType, patientType))) score += 5;
  if (mission.softwareUsed && profile?.knownSoftware?.some((software) => includesMatch(mission.softwareUsed, software))) score += 4;
  if (mission.missionType && profile?.acceptedMissionTypes?.includes(mission.missionType)) score += 5;
  if (profile?.minimumCompensation && mission.retrocessionPercentage && mission.retrocessionPercentage >= profile.minimumCompensation) score += 3;

  return score;
}

export default function SearchMissionsPage() {
  const cachedMissions = api.getSync<Paginated<Mission>>('/missions?limit=50');
  const cachedApplications = api.getSync<Application[]>('/me/applications');
  const cachedProfile = api.getSync<Profile>('/me/profile');
  const [activeTab, setActiveTab] = useState<SearchTab>('recommended');
  const [items, setItems] = useState<Mission[]>(cachedMissions?.items || []);
  const [total, setTotal] = useState(cachedMissions?.total || 0);
  const [profile, setProfile] = useState<Profile | null>(cachedProfile || null);
  const [filters, setFilters] = useState(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [extraFiltersOpen, setExtraFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!cachedMissions);

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const activeSecondaryFilters = secondaryFilterKeys.filter(
    (key) => !!filters[key as keyof typeof filters]
  ).length;

  // Applications state
  const [applications, setApplications] = useState<Application[]>(cachedApplications || []);
  const [applicationsLoading, setApplicationsLoading] = useState(!cachedApplications);

  const appliedMissionIds = useMemo(
    () => new Set(applications.map((application) => application.missionId)),
    [applications]
  );

  const recommendedMissions = useMemo(() => {
    return [...items]
      .filter((mission) => mission.status === 'PUBLISHED' && !appliedMissionIds.has(mission.id))
      .sort((a, b) => {
        const scoreDelta = scoreMissionForProfile(b, profile, appliedMissionIds) - scoreMissionForProfile(a, profile, appliedMissionIds);
        if (scoreDelta !== 0) return scoreDelta;
        return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
      })
      .slice(0, 8);
  }, [appliedMissionIds, items, profile]);

  async function loadMissions(currentFilters = filters, options: { silent?: boolean; reload?: boolean } = {}) {
    if (!options.silent) setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    Object.entries(currentFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set('limit', '50');

    try {
      const path = `/missions?${params}`;
      const result = options.reload
        ? await api.reload<Paginated<Mission>>(path)
        : await api.get<Paginated<Mission>>(path);
      setItems(result.items);
      setTotal(result.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  const toggleExtraFilters = () => {
    setExtraFiltersOpen((prev) => {
      const next = !prev;
      if (!next) {
        // Clear all secondary filters and reload
        const updated = { ...filters };
        let changed = false;
        secondaryFilterKeys.forEach((key) => {
          if (updated[key as keyof typeof filters] !== '') {
            (updated as any)[key] = '';
            changed = true;
          }
        });
        if (changed) {
          setFilters(updated);
          void loadMissions(updated);
        }
      }
      return next;
    });
  };

  const resetExtraFilters = () => {
    const updated = { ...filters };
    let changed = false;
    secondaryFilterKeys.forEach((key) => {
      if (updated[key as keyof typeof filters] !== '') {
        (updated as any)[key] = '';
        changed = true;
      }
    });
    if (changed) {
      setFilters(updated);
      void loadMissions(updated);
    }
  };

  const resetAllFilters = () => {
    setFilters(emptyFilters);
    setExtraFiltersOpen(false);
    void loadMissions(emptyFilters);
  };

  async function loadApplications(options: { silent?: boolean; reload?: boolean } = {}) {
    if (!options.silent) setApplicationsLoading(true);
    setError(null);
    try {
      setApplications(options.reload
        ? await api.reload<Application[]>('/me/applications')
        : await api.get<Application[]>('/me/applications'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!options.silent) setApplicationsLoading(false);
    }
  }

  async function loadProfile() {
    try {
      setProfile(await api.get<Profile>('/me/profile'));
    } catch {
      setProfile(null);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const queryTab = new URLSearchParams(window.location.search).get('tab');
    if (queryTab === 'applications' || queryTab === 'search') setActiveTab(queryTab);
  }, []);

  useEffect(() => {
    if (activeTab === 'recommended') {
      void loadMissions(emptyFilters);
      void loadApplications({ silent: true });
      void loadProfile();
    } else if (activeTab === 'search') {
      void loadMissions();
    } else {
      void loadApplications();
    }
  }, [activeTab]);

  useAutoRefresh(() => {
    if (activeTab === 'recommended') {
      return loadMissions(emptyFilters, { silent: true, reload: true });
    }
    if (activeTab === 'search') {
      return loadMissions(filters, { silent: true, reload: true });
    }
    return loadApplications({ silent: true, reload: true });
  }, { enabled: activeTab === 'applications' ? !applicationsLoading : !loading });

  function set(name: string, value: string) {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setFiltersOpen(false);
    void loadMissions();
  }

  async function withdraw(id: string) {
    if (!confirm('Retirer cette candidature ?')) return;
    try {
      await api.post(`/applications/${id}/withdraw`, {});
      await loadApplications();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <>
      <PageHeader
        title="Annonce et candidature"
        description="Consultez les missions adaptées à votre profil, recherchez librement et suivez vos candidatures."
      />

      <div className="billing-tabs" role="tablist" aria-label="Sections des annonces" style={{ marginBottom: 18 }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => {
              setActiveTab(tab.id);
              if (typeof window !== 'undefined') {
                const url = new URL(window.location.href);
                if (tab.id === 'applications' || tab.id === 'search') {
                  url.searchParams.set('tab', tab.id);
                } else {
                  url.searchParams.delete('tab');
                }
                window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
              }
            }}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'recommended' ? (
        <div className="grid recommended-missions">
          {error ? <Alert type="error">{error}</Alert> : null}
          {loading ? (
            <LoadingCard label="Chargement des missions pour vous..." />
          ) : (
            <>
              <div className="toolbar">
                <div>
                  <strong>Missions pour vous</strong>
                  <div className="small">
                    {recommendedMissions.length} mission(s) publiée(s) priorisée(s) selon votre profil.
                  </div>
                </div>
                <Button type="button" variant="light" onClick={() => setActiveTab('search')}>Recherche avancée</Button>
              </div>
              {recommendedMissions.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  detailHref={getCandidateMissionPath(mission.id)}
                  applyHref={getMissionApplyPath(mission.id)}
                />
              ))}
            </>
          )}
        </div>
      ) : activeTab === 'search' ? (
        <div className="grid-main">
          <Card className={`search-filters ${filtersOpen ? 'search-filters-open' : ''}`}>
            <div className="search-filters-head">
              <div>
                <h2>Filtres</h2>
                <p>
                  {activeFilters > 0 ? <span className="search-filters-count">{activeFilters} actif(s)</span> : 'Affinez les annonces'}
                </p>
              </div>
              <Button
                type="button"
                variant="light"
                className="search-filters-toggle"
                aria-expanded={filtersOpen}
                aria-controls="mission-search-filters"
                aria-label={filtersOpen ? 'Masquer les filtres' : 'Afficher les filtres'}
                onClick={() => setFiltersOpen((open) => !open)}
              />
            </div>
            <div className="search-filters-body" id="mission-search-filters">
              <p>Affinez les annonces selon votre disponibilité, votre niveau et votre localisation.</p>
              <form className="form" onSubmit={submit}>
                <Field label="Mot-clé">
                  <Input value={filters.q} onChange={(e) => set('q', e.target.value)} placeholder="Urgences, pédiatrie..." />
                </Field>
                <Field label="Ville">
                  <Input value={filters.city} onChange={(e) => set('city', e.target.value)} placeholder="Lyon" />
                </Field>
                <Field label="Département / service">
                  <Select value={filters.departmentInfo} onChange={(e) => set('departmentInfo', e.target.value)}>
                    <option value="">Tous</option>
                    {establishmentDepartmentOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </Field>
                <Field label="Spécialité">
                  <Input value={filters.specialty} onChange={(e) => set('specialty', e.target.value)} placeholder="Urgences" />
                </Field>

                <button
                  type="button"
                  className="extra-filters-toggle-btn"
                  onClick={toggleExtraFilters}
                  aria-expanded={extraFiltersOpen}
                  aria-controls="extra-search-filters"
                >
                  <span>{extraFiltersOpen ? 'Masquer les options' : 'Plus de filtres'}</span>
                  {activeSecondaryFilters > 0 && (
                    <span className="extra-filters-badge">{activeSecondaryFilters}</span>
                  )}
                  <svg
                    className={`chevron-icon ${extraFiltersOpen ? 'open' : ''}`}
                    viewBox="0 0 24 24"
                    width="16"
                    height="16"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                <div
                  className={`extra-filters-content ${extraFiltersOpen ? 'open' : ''}`}
                  id="extra-search-filters"
                >
                  <Field label="Secteur conventionné">
                    <Select value={filters.sector} onChange={(e) => set('sector', e.target.value)}>
                      <option value="">Tous</option>
                      {sectorOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Type de patientèle">
                    <Select value={filters.patientType} onChange={(e) => set('patientType', e.target.value)}>
                      <option value="">Tous</option>
                      {patientTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Logiciel utilisé">
                    <Select value={filters.softwareUsed} onChange={(e) => set('softwareUsed', e.target.value)}>
                      <option value="">Tous</option>
                      {softwareOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Présence de secrétaire">
                    <Select value={filters.hasSecretary} onChange={(e) => set('hasSecretary', e.target.value)}>
                      <option value="">Tous</option>
                      <option value="true">Oui</option>
                      <option value="false">Non</option>
                    </Select>
                  </Field>
                  <Field label="Type mission">
                    <Select value={filters.missionType} onChange={(e) => set('missionType', e.target.value as MissionType)}>
                      <option value="">Tous</option>
                      {missionTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="Niveau requis">
                    <Select value={filters.requiredLevel} onChange={(e) => set('requiredLevel', e.target.value as RequiredLevel)}>
                      <option value="">Tous</option>
                      {requiredLevelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  </Field>
                  <Field label="À partir du">
                    <Input type="date" value={filters.dateFrom} onChange={(e) => set('dateFrom', e.target.value)} />
                  </Field>
                  <div className="form-row">
                    <Field label="Rétrocession minimum">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={filters.retrocessionMin}
                        onChange={(e) => set('retrocessionMin', e.target.value)}
                        placeholder="70"
                      />
                    </Field>
                    <Field label="Rétrocession maximum">
                      <Input
                        type="number"
                        min="1"
                        max="100"
                        value={filters.retrocessionMax}
                        onChange={(e) => set('retrocessionMax', e.target.value)}
                        placeholder="90"
                      />
                    </Field>
                  </div>
                  {activeSecondaryFilters > 0 && (
                    <button
                      type="button"
                      className="extra-filters-reset-btn"
                      onClick={resetExtraFilters}
                    >
                      Effacer les filtres additionnels
                    </button>
                  )}
                </div>

                <div className="actions">
                  <Button disabled={loading}>{loading ? 'Chargement...' : 'Rechercher'}</Button>
                  <Button
                    type="button"
                    variant="light"
                    onClick={resetAllFilters}
                  >
                    Réinitialiser
                  </Button>
                </div>
              </form>
            </div>
          </Card>

          <div className="grid search-results">
            {error ? <Alert type="error">{error}</Alert> : null}
            {loading ? (
              <LoadingCard label="Chargement des missions..." />
            ) : (
              <>
                <div className="toolbar">
                  <div>
                    <strong>{total} résultat(s)</strong>
                    <div className="small">Missions publiées disponibles</div>
                  </div>
                </div>
                {items.map((mission) => (
                  <MissionCard
                    key={mission.id}
                    mission={mission}
                    detailHref={getCandidateMissionPath(mission.id)}
                    applyHref={getMissionApplyPath(mission.id)}
                  />
                ))}
                {!loading && items.length === 0 ? <Card><p>Aucune mission publiée ne correspond aux filtres.</p></Card> : null}
              </>
            )}
          </div>
        </div>
      ) : (
        <>
          {error ? <Alert type="error">{error}</Alert> : null}
          {applicationsLoading ? (
            <LoadingCard label="Chargement des candidatures..." />
          ) : applications.length === 0 ? (
            <EmptyState
              title="Aucune candidature"
              description="Commence par chercher une mission."
              action={
                <Button onClick={() => setActiveTab('search')}>
                  Chercher une mission
                </Button>
              }
            />
          ) : (
            <ApplicationsTab applications={applications} withdraw={withdraw} />
          )}
        </>
      )}
    </>
  );
}

function ApplicationsTab({
  applications,
  withdraw,
}: {
  applications: Application[];
  withdraw: (id: string) => Promise<void>;
}) {
  const currentApplications = applications.filter((application) => !isClosedApplication(application.status));
  const historicalApplications = applications.filter((application) => isClosedApplication(application.status));

  return (
    <div className="establishment-application-sections">
      <ApplicationSection
        title="Candidatures d'actualité"
        description="Candidatures envoyées ou vues, avec une action encore possible."
        variant="current"
        applications={currentApplications}
        emptyLabel="Aucune candidature d'actualité."
        withdraw={withdraw}
      />
      <ApplicationSection
        title="Historique des candidatures"
        description="Candidatures acceptées, refusées, retirées ou annulées, conservées pour suivi."
        variant="history"
        applications={historicalApplications}
        emptyLabel="Aucune candidature dans l'historique."
        withdraw={withdraw}
      />
    </div>
  );
}

function ApplicationSection({
  title,
  description,
  variant,
  applications,
  emptyLabel,
  withdraw,
}: {
  title: string;
  description: string;
  variant: 'current' | 'history';
  applications: Application[];
  emptyLabel: string;
  withdraw: (id: string) => Promise<void>;
}) {
  return (
    <section className={`establishment-application-section establishment-application-section-${variant}`}>
      <div className="establishment-application-section-head">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        <Badge tone={applications.length ? 'neutral' : 'warning'}>{applications.length}</Badge>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mission</th>
              <th>Établissement</th>
              <th>Statut</th>
              <th>Date</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {applications.length > 0 ? applications.map((a) => (
              <tr key={a.id}>
                <td>
                  <strong>{a.mission?.title}</strong>
                  <div className="small">{a.mission?.city}</div>
                </td>
                <td>{a.mission?.establishment?.name || '—'}</td>
                <td>
                  <Badge tone={applicationTone(a.status) as any}>
                    {statusLabel(a.status)}
                  </Badge>
                </td>
                <td>{formatDateTime(a.createdAt)}</td>
                <td className="actions application-icon-actions">
                  {a.conversation ? (
                    <Link
                      className="application-icon-action"
                      href={getCandidateConversationPath(a.conversation.id)}
                      aria-label={`Ouvrir la messagerie pour ${a.mission?.title || 'cette candidature'}`}
                      title="Messagerie"
                    >
                      <ApplicationActionIcon type="message" />
                      <span className="sr-only">Messagerie</span>
                    </Link>
                  ) : null}
                  {a.missionId ? (
                    <Link
                      className="application-icon-action application-icon-action-primary"
                      href={getCandidateMissionPath(a.missionId)}
                      aria-label={`Voir la mission ${a.mission?.title || ''}`.trim()}
                      title="Voir mission"
                    >
                      <ApplicationActionIcon type="mission" />
                      <span className="sr-only">Voir mission</span>
                    </Link>
                  ) : null}
                  <Button
                    variant="danger"
                    className="application-icon-action application-icon-action-danger"
                    onClick={() => withdraw(a.id)}
                    disabled={isClosedApplication(a.status)}
                    aria-label={`Retirer la candidature ${a.mission?.title || ''}`.trim()}
                    title="Retirer"
                  >
                    <ApplicationActionIcon type="withdraw" />
                    <span className="sr-only">Retirer</span>
                  </Button>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan={5}>{emptyLabel}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
