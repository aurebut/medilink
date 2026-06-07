'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Application, Mission, MissionType, Paginated, RequiredLevel } from '@/lib/types';
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

type SearchTab = 'missions' | 'applications';

const tabs: Array<{ id: SearchTab; label: string }> = [
  { id: 'missions', label: 'Missions' },
  { id: 'applications', label: 'Candidatures' },
];

function applicationTone(status: string) {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED' || status === 'WITHDRAWN') return 'danger';
  if (status === 'VIEWED') return 'warning';
  return 'neutral';
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

export default function SearchMissionsPage() {
  const [activeTab, setActiveTab] = useState<SearchTab>('missions');
  const [items, setItems] = useState<Mission[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [extraFiltersOpen, setExtraFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const activeFilters = Object.values(filters).filter(Boolean).length;
  const activeSecondaryFilters = secondaryFilterKeys.filter(
    (key) => !!filters[key as keyof typeof filters]
  ).length;

  // Applications state
  const [applications, setApplications] = useState<Application[]>([]);
  const [applicationsLoading, setApplicationsLoading] = useState(true);

  async function loadMissions(currentFilters = filters) {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    Object.entries(currentFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set('limit', '50');

    try {
      const result = await api.get<Paginated<Mission>>(`/missions?${params}`);
      setItems(result.items);
      setTotal(result.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
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

  async function loadApplications() {
    setApplicationsLoading(true);
    setError(null);
    try {
      setApplications(await api.get<Application[]>('/me/applications'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setApplicationsLoading(false);
    }
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const queryTab = new URLSearchParams(window.location.search).get('tab');
    if (queryTab === 'applications') {
      setActiveTab('applications');
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'missions') {
      void loadMissions();
    } else {
      void loadApplications();
    }
  }, [activeTab]);

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
        description="Recherchez des missions et suivez vos candidatures depuis le même espace."
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
                if (tab.id === 'applications') {
                  url.searchParams.set('tab', 'applications');
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

      {activeTab === 'missions' ? (
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
                <Button onClick={() => setActiveTab('missions')}>
                  Chercher une mission
                </Button>
              }
            />
          ) : (
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
                  {applications.map((a) => (
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
                      <td className="actions">
                        {a.conversation ? (
                          <Link
                            className="btn btn-light"
                            href={getCandidateConversationPath(a.conversation.id)}
                          >
                            Messagerie
                          </Link>
                        ) : null}
                        {a.missionId ? (
                          <Link
                            className="btn btn-secondary"
                            href={getCandidateMissionPath(a.missionId)}
                          >
                            Voir mission
                          </Link>
                        ) : null}
                        <Button
                          variant="danger"
                          onClick={() => withdraw(a.id)}
                          disabled={['ACCEPTED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(a.status)}
                        >
                          Retirer
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </>
  );
}
