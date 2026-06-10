'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { AuthPage } from '@/components/AuthPage';
import { Alert, Button, Field, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);
    try {
      const res = await api.post<{ message: string }>('/auth/forgot-password', { email });
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
      title="Mot de passe oublié"
      description="Entrez votre email pour recevoir un lien sécurisé de réinitialisation."
      onSubmit={submit}
      footer={(
        <Link href="/login" className="small">
          Retour à la connexion
        </Link>
      )}
    >
      {message ? <Alert type="success">{message}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      <Field label="Email">
        <Input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="vous@example.com"
          disabled={loading}
        />
      </Field>
      <Button block disabled={loading}>
        {loading ? 'Envoi...' : 'Envoyer le lien'}
      </Button>
    </AuthPage>
  );
}

