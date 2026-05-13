'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { Alert, Button, Field, Input } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null); setMessage(null);
    try { const res = await api.post<{ message: string }>('/auth/forgot-password', { email }); setMessage(res.message); }
    catch (e: any) { setError(e.message); }
  }

  return <main className="auth-page"><form className="auth-card form" onSubmit={submit}>
    <Link className="brand" href="/"><span className="brand-mark">M</span><span>Médilink</span></Link>
    <h1>Mot de passe oublié</h1>
    <p>Entre ton email. En mode mock, le lien apparaît dans les logs backend.</p>
    {message ? <Alert type="success">{message}</Alert> : null}{error ? <Alert type="error">{error}</Alert> : null}
    <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
    <Button>Envoyer le lien</Button>
  </form></main>;
}
