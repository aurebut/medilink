'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Mission, MissionType, Paginated, RequiredLevel } from '@/lib/types';
import { missionTypeOptions, requiredLevelOptions } from '@/lib/labels';
import { Alert, Button, Card, Field, Input, PageHeader, Select } from '@/components/ui';
import { MissionCard } from '@/components/MissionCard';

export default function SearchMissionsPage() {
  const [items, setItems] = useState<Mission[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({ q: '', city: '', specialty: '', missionType: '', requiredLevel: '', dateFrom: '' });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    void load();
  }

  return (
    <>
      <PageHeader
        title="Recherche de missions"
        description="Filtre les gardes, remplacements, vacations, stages et aides operatoires disponibles."
      />

      <div className="grid-main">
        <Card>
          <h2>Filtres</h2>
          <p>Affinez la recherche selon votre disponibilite, votre niveau et votre localisation.</p>
          <form className="form" onSubmit={submit}>
            <Field label="Recherche">
              <Input value={filters.q} onChange={(e) => set('q', e.target.value)} placeholder="Urgences, pediatrie..." />
            </Field>
            <Field label="Ville">
              <Input value={filters.city} onChange={(e) => set('city', e.target.value)} placeholder="Lyon" />
            </Field>
            <Field label="Specialite">
              <Input value={filters.specialty} onChange={(e) => set('specialty', e.target.value)} placeholder="Urgences" />
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
            <Field label="A partir du">
              <Input type="date" value={filters.dateFrom} onChange={(e) => set('dateFrom', e.target.value)} />
            </Field>
            <div className="actions">
              <Button disabled={loading}>{loading ? 'Recherche...' : 'Rechercher'}</Button>
              <Button
                type="button"
                variant="light"
                onClick={() => setFilters({ q: '', city: '', specialty: '', missionType: '', requiredLevel: '', dateFrom: '' })}
              >
                Reinitialiser
              </Button>
            </div>
          </form>
        </Card>

        <div className="grid">
          {error ? <Alert type="error">{error}</Alert> : null}
          <div className="toolbar">
            <div>
              <strong>{total} resultat(s)</strong>
              <div className="small">Missions publiees disponibles</div>
            </div>
          </div>
          {items.map((mission) => <MissionCard key={mission.id} mission={mission} applyHref={`/app/missions/${mission.id}/apply`} />)}
          {!loading && items.length === 0 ? <Card><p>Aucune mission publiee ne correspond aux filtres.</p></Card> : null}
        </div>
      </div>
    </>
  );
}
