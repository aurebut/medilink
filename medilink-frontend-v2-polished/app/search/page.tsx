'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Mission, MissionType, Paginated } from '@/lib/types';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, missionTypeOptions, requiredLevelLabel } from '@/lib/labels';
import { Alert, Badge, Button, Card, Field, Input, LoadingCard, Select } from '@/components/ui';

const emptyFilters = {
  q: '',
  city: '',
  missionType: '' as MissionType | '',
};

export default function PublicSearchPage() {
  const [items, setItems] = useState<Mission[]>([]);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState(emptyFilters);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q') || '';
    const city = params.get('city') || '';
    const mt = params.get('missionType') || '';
    const initialFilters = { q, city, missionType: (missionTypeOptions.find((o) => o.value === mt) ? mt : '') as MissionType | '' };
    setFilters(initialFilters);
    void loadMissions(initialFilters);
  }, []);

  async function loadMissions(currentFilters = filters, options: { silent?: boolean; reload?: boolean } = {}) {
    if (!options.silent) setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    Object.entries(currentFilters).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set('limit', '50');

    try {
      const result = options.reload
        ? await api.reload<Paginated<Mission>>(`/missions?${params}`)
        : await api.get<Paginated<Mission>>(`/missions?${params}`);
      setItems(result.items);
      setTotal(result.total);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  function set(name: string, value: string) {
    setFilters((prev) => ({ ...prev, [name]: value }));
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    void loadMissions();
  }

  return (
    <main className="landing-page public-mission-page">
      <div className="container">
        <nav className="public-nav">
          <Link href="/" className="brand">
            <span>Médi<em style={{ fontStyle: 'italic' }}>Link</em></span>
          </Link>
          <div className="nav-actions">
            <Link className="btn btn-light" href="/login">Connexion</Link>
            <Link className="btn btn-primary" href="/register">Créer un compte</Link>
          </div>
        </nav>

        <section className="public-search-head">
          <h1>Rechercher une mission</h1>
          <p>Parcourir les missions publiées par les établissements partenaires.</p>

          <div className="card public-search-form">
            <form className="form" onSubmit={submit}>
              <div className="public-search-fields">
                <Field label="Mot-clé">
                  <Input value={filters.q} onChange={(e) => set('q', e.target.value)} placeholder="Spécialité, établissement…" />
                </Field>
                <Field label="Ville">
                  <Input value={filters.city} onChange={(e) => set('city', e.target.value)} placeholder="Ville, département" />
                </Field>
                <Field label="Type de mission">
                  <Select value={filters.missionType} onChange={(e) => set('missionType', e.target.value)}>
                    <option value="">Tous</option>
                    {missionTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                </Field>
                <Button disabled={loading}>
                  {loading ? 'Chargement...' : 'Rechercher'}
                </Button>
              </div>
            </form>
          </div>
        </section>

        <section className="public-search-results">
          {error ? <Alert type="error">{error}</Alert> : null}

          {loading ? (
            <LoadingCard label="Recherche des missions..." />
          ) : (
            <>
              <div className="toolbar">
                <div>
                  <strong style={{ fontSize: 18 }}>{total} résultat(s)</strong>
                  <div className="small">Missions publiées disponibles</div>
                </div>
              </div>
              <div className="grid">
                {items.length > 0 ? items.map((mission) => (
                  <PublicMissionCard key={mission.id} mission={mission} />
                )) : (
                  <Card><p>Aucune mission publiée ne correspond à votre recherche.</p></Card>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function PublicMissionCard({ mission }: { mission: Mission }) {
  const establishmentPhoto = mission.establishment?.photos?.[0]?.url;

  return (
    <Card className={`mission-card${establishmentPhoto ? ' mission-card--with-image' : ''}`}>
      {establishmentPhoto ? (
        <Link className="mission-card-image" href={`/missions/${mission.id}`} aria-label={`Voir ${mission.title}`}>
          <img src={establishmentPhoto} alt={mission.establishment?.name || 'Établissement'} />
        </Link>
      ) : null}
      <div className="mission-top">
        <div className="grid" style={{ gap: 10 }}>
          <div className="actions">
            <Badge>{missionTypeLabel(mission.missionType)}</Badge>
            <Badge tone="neutral">{requiredLevelLabel(mission.requiredLevel)}</Badge>
          </div>
          <h3>{mission.title}</h3>
        </div>
        <div className="mission-pay">
          <span className="small">Rémunération</span>
          <strong>{formatCompensation(mission)}</strong>
        </div>
      </div>

      <p>{mission.description || 'Aucune description pour cette mission.'}</p>

      <div className="mission-meta">
        <span>{mission.establishment?.name || 'Établissement'}</span>
        <span>-</span>
        <span>{mission.city}</span>
        <span>-</span>
        <span>{formatDate(mission.startDate)}</span>
        {mission.startTime ? (
          <>
            <span>-</span>
            <span>{mission.startTime}{mission.endTime ? ` - ${mission.endTime}` : ''}</span>
          </>
        ) : null}
      </div>

      {mission.patientType || mission.softwareUsed || mission.hasSecretary != null || mission.tags?.length ? (
        <div className="tag-list">
          {mission.patientType ? <Badge tone="neutral">{mission.patientType}</Badge> : null}
          {mission.softwareUsed ? <Badge tone="neutral">{mission.softwareUsed}</Badge> : null}
          {mission.hasSecretary != null ? <Badge tone="neutral">Secrétaire : {mission.hasSecretary ? 'oui' : 'non'}</Badge> : null}
          {mission.tags?.map((tag) => <Badge key={tag.id} tone="neutral">#{tag.tag}</Badge>)}
        </div>
      ) : null}

      <div className="actions">
        <Link className="btn btn-light" href={`/missions/${mission.id}`}>Voir détail</Link>
        <Link className="btn btn-primary" href={`/login?next=${encodeURIComponent(`/missions/${mission.id}`)}`}>Se connecter pour postuler</Link>
      </div>
    </Card>
  );
}
