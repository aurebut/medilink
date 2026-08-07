'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Mission } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { missionTypeLabel, statusLabel } from '@/lib/labels';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Badge, Button, LoadingCard, PageHeader, type BadgeTone } from '@/components/ui';
import { errorMessage } from '@/lib/user-facing';

function tone(status: string): BadgeTone {
  if (status === 'PUBLISHED') return 'success';
  if (status === 'PAUSED' || status === 'ARCHIVED') return 'warning';
  return 'neutral';
}

export default function AdminMissionsPage() {
  const [items, setItems] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(options: { silent?: boolean; reload?: boolean } = {}) {
    try {
      setItems(options.reload
        ? await api.reload<Mission[]>('/admin/missions')
        : await api.get<Mission[]>('/admin/missions'));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useAutoRefresh(() => load({ silent: true, reload: true }), { enabled: !loading });

  async function unpublish(id: string) {
    if (!confirm('Dépublier cette mission ?')) return;
    try {
      await api.post(`/admin/missions/${id}/unpublish`, {});
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader title="Missions" description="Modération simple des missions." />
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="table-wrap admin-table-wrap">
        <table>
          <caption className="sr-only">Liste des missions</caption>
          <thead>
            <tr>
              <th scope="col">Mission</th>
              <th scope="col">Établissement</th>
              <th scope="col">Type</th>
              <th scope="col">Date</th>
              <th scope="col">Statut</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td data-label="Mission"><strong>{m.title}</strong><div className="small">{m.city}</div></td>
                <td data-label="Établissement">{m.establishment?.name || '—'}</td>
                <td data-label="Type">{missionTypeLabel(m.missionType)}</td>
                <td data-label="Date">{formatDate(m.startDate)}</td>
                <td data-label="Statut"><Badge tone={tone(m.status)}>{statusLabel(m.status)}</Badge></td>
                <td data-label="Action"><Button variant="danger" disabled={m.status !== 'PUBLISHED'} onClick={() => unpublish(m.id)}>Dépublier</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
