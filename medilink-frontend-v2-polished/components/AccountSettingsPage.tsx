'use client';

import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { roleLabel } from '@/lib/labels';
import { api } from '@/lib/api';
import { Alert, Badge, Button, Card, Field, Input, PageHeader } from './ui';
import { useAuth } from './AuthProvider';

export function AccountSettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [email, setEmail] = useState(user?.email || '');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function requestPasswordReset(e: FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setSendingReset(true);

    try {
      const result = await api.post<{ message: string }>('/auth/forgot-password', { email: email || user?.email });
      setMessage(result.message);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingReset(false);
    }
  }

  async function onLogout() {
    setLoggingOut(true);
    await logout();
    router.push('/login');
  }

  return (
    <>
      <PageHeader
        title="Parametres du compte"
        description="Email de connexion, securite et deconnexion de votre session Medilink."
      />

      <div className="grid-main">
        <Card>
          <h2>Compte</h2>
          <div className="info-list">
            <div>
              <span>Email</span>
              <strong>{user?.email || '-'}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>{roleLabel(user?.role)}</strong>
            </div>
            <div>
              <span>Statut</span>
              <strong>{user?.status || '-'}</strong>
            </div>
            <div>
              <span>Verification email</span>
              <strong>{user?.emailVerified ? 'Verifie' : 'En attente'}</strong>
            </div>
            <div>
              <span>Telephone</span>
              <strong>{user?.phone || '-'}</strong>
            </div>
          </div>
        </Card>

        <div className="grid">
          <Card>
            <div className="toolbar">
              <div>
                <h2>Securite</h2>
                <p className="small">Recevez un lien pour definir un nouveau mot de passe.</p>
              </div>
              <Badge tone={user?.emailVerified ? 'success' : 'warning'}>
                {user?.emailVerified ? 'Email verifie' : 'Email non verifie'}
              </Badge>
            </div>

            <form className="form" onSubmit={requestPasswordReset}>
              {message ? <Alert type="success">{message}</Alert> : null}
              {error ? <Alert type="error">{error}</Alert> : null}
              <Field label="Email du compte">
                <Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
              </Field>
              <Button disabled={sendingReset}>{sendingReset ? 'Envoi...' : 'Envoyer un lien de reinitialisation'}</Button>
            </form>
          </Card>

          <Card>
            <h2>Session</h2>
            <p>Deconnectez cette session sur cet appareil.</p>
            <div className="actions">
              <Button variant="danger" disabled={loggingOut} onClick={onLogout}>
                {loggingOut ? 'Deconnexion...' : 'Se deconnecter'}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
