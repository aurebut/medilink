'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Application } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { statusLabel } from '@/lib/labels';
import { Alert, Badge, Button, EmptyState, LoadingCard, PageHeader } from '@/components/ui';

function tone(status: string) {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED' || status === 'WITHDRAWN') return 'danger';
  if (status === 'VIEWED') return 'warning';
  return 'neutral';
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setApplications(await api.get<Application[]>('/me/applications'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function withdraw(id: string) {
    if (!confirm('Retirer cette candidature ?')) return;
    try {
      await api.post(`/applications/${id}/withdraw`, {});
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader title="Mes candidatures" description="Suivi des candidatures envoyées." />
      {error ? <Alert type="error">{error}</Alert> : null}
      {applications.length === 0 ? (
        <EmptyState
          title="Aucune candidature"
          description="Commence par chercher une mission."
          action={<Link className="btn btn-primary" href="/app/search">Chercher une mission</Link>}
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
                  <td><strong>{a.mission?.title}</strong><div className="small">{a.mission?.city}</div></td>
                  <td>{a.mission?.establishment?.name || '—'}</td>
                  <td><Badge tone={tone(a.status) as any}>{statusLabel(a.status)}</Badge></td>
                  <td>{formatDateTime(a.createdAt)}</td>
                  <td className="actions">
                    {a.conversation ? <Link className="btn btn-light" href="/app/messages">Messagerie</Link> : null}
                    <Button variant="danger" onClick={() => withdraw(a.id)} disabled={['ACCEPTED', 'REJECTED', 'WITHDRAWN', 'CANCELLED'].includes(a.status)}>Retirer</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
