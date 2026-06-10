'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CurrentUser, Profile } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { roleLabel, statusLabel } from '@/lib/labels';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Badge, Button, LoadingCard, PageHeader } from '@/components/ui';

type AdminUser = CurrentUser & { profile?: Profile | null };

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load(options: { silent?: boolean; reload?: boolean } = {}) {
    try {
      setUsers(options.reload
        ? await api.reload<AdminUser[]>('/admin/users')
        : await api.get<AdminUser[]>('/admin/users'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useAutoRefresh(() => load({ silent: true, reload: true }), { enabled: !loading });

  async function suspend(id: string) {
    if (!confirm('Suspendre cet utilisateur ?')) return;
    try {
      await api.patch(`/admin/users/${id}/suspend`, {});
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader title="Utilisateurs" description="Liste des comptes et suspension simple." />
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>Statut</th>
              <th>Email</th>
              <th>Création</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  <strong>{u.profile?.firstName} {u.profile?.lastName}</strong>
                  <div className="small">{u.id}</div>
                </td>
                <td>{roleLabel(u.role)}</td>
                <td><Badge tone={u.status === 'ACTIVE' ? 'success' : u.status === 'SUSPENDED' ? 'danger' : 'warning'}>{statusLabel(u.status)}</Badge></td>
                <td>{u.email}<div className="small">{u.emailVerified ? 'email vérifié' : 'email non vérifié'}</div></td>
                <td>{formatDateTime(u.createdAt)}</td>
                <td><Button variant="danger" disabled={u.status === 'SUSPENDED'} onClick={() => suspend(u.id)}>Suspendre</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
