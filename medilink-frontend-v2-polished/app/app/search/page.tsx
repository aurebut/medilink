'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Mission, MissionType, Paginated, RequiredLevel } from '@/lib/types';
import { missionTypeOptions, requiredLevelOptions } from '@/lib/labels';
import { Alert, Button, Card, Field, Input, LoadingCard, PageHeader, Select } from '@/components/ui';
import { MissionCard } from '@/components/MissionCard';
import { establishmentDepartmentOptions, patientTypeOptions, sectorOptions, softwareOptions } from '@/lib/profile-options';

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

export default function SearchMissionsPage() {
  const [items, setItems] = useState<Mission[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(emptyFilters);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const activeFilters = Object.values(filters).filter(Boolean).length;

  async function load() {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
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

  useEffect(() => { void load(); }, []);

  function set(name: string, value: string) {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    setFiltersOpen(false);
    void load();
  }

  return (
    <>
      <PageHeader
        title="Recherche de missions"
        description="Filtre les gardes, remplacements, vacations, stages et aides opératoires disponibles."
      />

      <div className="grid-main">
        <Card className={`search-filters ${filtersOpen ? 'search-filters-open' : ''}`}>
          <div className="search-filters-head">
            <div>
              <h2>Filtres</h2>
              <p>
                {activeFilters > 0 ? <span className="search-filters-count">{activeFilters} actif(s)</span> : 'Affinez votre recherche'}
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
            <p>Affinez la recherche selon votre disponibilité, votre niveau et votre localisation.</p>
            <form className="form" onSubmit={submit}>
              <Field label="Recherche">
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
              <div className="actions">
                <Button disabled={loading}>{loading ? 'Recherche...' : 'Rechercher'}</Button>
                <Button
                  type="button"
                  variant="light"
                  onClick={() => setFilters(emptyFilters)}
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
              {items.map((mission) => <MissionCard key={mission.id} mission={mission} applyHref={`/app/missions/${mission.id}/apply`} />)}
              {!loading && items.length === 0 ? <Card><p>Aucune mission publiée ne correspond aux filtres.</p></Card> : null}
            </>
          )}
        </div>
      </div>
    </>
  );
}
