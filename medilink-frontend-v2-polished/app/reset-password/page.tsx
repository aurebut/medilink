'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { api } from '@/lib/api';
import { Alert, Button, Field, PasswordInput, LinkButton } from '@/components/ui';

function ResetPasswordForm() {
  const token = useSearchParams().get('token') || '';
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setError('Le nouveau mot de passe et sa confirmation ne correspondent pas.');
      return;
    }

    try {
      const res = await api.post<{ message: string }>('/auth/reset-password', {
        token,
        oldPassword,
        newPassword,
      });
      setMessage(res.message);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <main className="auth-page">
      <form className="auth-card form" onSubmit={submit}>
        <Link className="brand" href="/">
          <span>Médilink</span>
        </Link>
        <h1>Nouveau mot de passe</h1>
        {message ? <Alert type="success">{message}</Alert> : null}
        {error ? <Alert type="error">{error}</Alert> : null}
        
        <Field label="Ancien mot de passe">
          <PasswordInput
            required
            value={oldPassword}
            onChange={(e) => setOldPassword(e.target.value)}
          />
        </Field>

        <Field label="Nouveau mot de passe">
          <PasswordInput
            required
            minLength={8}
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />
        </Field>

        <Field label="Confirmer le nouveau mot de passe">
          <PasswordInput
            required
            minLength={8}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
        </Field>

        <Button>Réinitialiser</Button>
        {message ? <LinkButton href="/login">Se connecter</LinkButton> : null}
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
