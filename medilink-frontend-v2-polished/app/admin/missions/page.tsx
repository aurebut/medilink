'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Mission } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { missionTypeLabel, statusLabel } from '@/lib/labels';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Badge, Button, LoadingCard, PageHeader } from '@/components/ui';

function tone(status: string) {
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
    } catch (e: any) {
      setError(e.message);
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
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader title="Missions" description="Modération simple des missions." />
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mission</th>
              <th>Établissement</th>
              <th>Type</th>
              <th>Date</th>
              <th>Statut</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {items.map((m) => (
              <tr key={m.id}>
                <td><strong>{m.title}</strong><div className="small">{m.city}</div></td>
                <td>{m.establishment?.name || '—'}</td>
                <td>{missionTypeLabel(m.missionType)}</td>
                <td>{formatDate(m.startDate)}</td>
                <td><Badge tone={tone(m.status) as any}>{statusLabel(m.status)}</Badge></td>
                <td><Button variant="danger" disabled={m.status !== 'PUBLISHED'} onClick={() => unpublish(m.id)}>Dépublier</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
