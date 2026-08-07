'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { CurrentUser, Profile } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { roleLabel, statusLabel } from '@/lib/labels';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Badge, Button, LoadingCard, PageHeader } from '@/components/ui';
import { errorMessage } from '@/lib/user-facing';

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
    } catch (e) {
      setError(errorMessage(e));
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
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader title="Utilisateurs" description="Liste des comptes et suspension simple." />
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="table-wrap admin-table-wrap">
        <table>
          <caption className="sr-only">Liste des utilisateurs</caption>
          <thead>
            <tr>
              <th scope="col">Utilisateur</th>
              <th scope="col">Rôle</th>
              <th scope="col">Statut</th>
              <th scope="col">Email</th>
              <th scope="col">Création</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td data-label="Utilisateur">
                  <strong>{u.profile?.firstName} {u.profile?.lastName}</strong>
                  <div className="small">{u.id}</div>
                </td>
                <td data-label="Rôle">{roleLabel(u.role)}</td>
                <td data-label="Statut"><Badge tone={u.status === 'ACTIVE' ? 'success' : u.status === 'SUSPENDED' ? 'danger' : 'warning'}>{statusLabel(u.status)}</Badge></td>
                <td data-label="Email">{u.email}<div className="small">{u.emailVerified ? 'email vérifié' : 'email non vérifié'}</div></td>
                <td data-label="Création">{formatDateTime(u.createdAt)}</td>
                <td data-label="Action"><Button variant="danger" disabled={u.status === 'SUSPENDED'} onClick={() => suspend(u.id)}>Suspendre</Button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
