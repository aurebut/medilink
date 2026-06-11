'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { api } from '@/lib/api';
import { AuthPage } from '@/components/AuthPage';
import { Alert, Button, Field, PasswordInput, LinkButton } from '@/components/ui';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post<{ message: string }>('/auth/reset-password', {
        token,
        newPassword,
      });
      setMessage(res.message);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPage
      eyebrow="Sécurité"
      title="Nouveau mot de passe"
      description="Définissez un mot de passe robuste pour protéger l'accès à votre espace Médilink."
      onSubmit={submit}
      footer={(
        <Link href="/login" className="small">
          Retour à la connexion
        </Link>
      )}
    >
      {message ? <Alert type="success">{message}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      
      {!message && (
        <>
          <Field label="Nouveau mot de passe">
            <PasswordInput
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              placeholder="Minimum 8 caractères"
            />
          </Field>

          <Field label="Confirmer le nouveau mot de passe">
            <PasswordInput
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              placeholder="Confirmez le mot de passe"
            />
          </Field>

          <Button block disabled={loading}>
            {loading ? 'Réinitialisation...' : 'Réinitialiser'}
          </Button>
        </>
      )}

      {message ? (
        <div style={{ marginTop: '16px' }}>
          <LinkButton href="/login" className="btn-block">
            Se connecter
          </LinkButton>
        </div>
      ) : null}
    </AuthPage>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}

