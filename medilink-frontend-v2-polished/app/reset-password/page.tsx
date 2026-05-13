'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { Alert, Button, Field, Input, LinkButton } from '@/components/ui';

export default function ResetPasswordPage() {
  const token = useSearchParams().get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault(); setError(null); setMessage(null);
    try { const res = await api.post<{ message: string }>('/auth/reset-password', { token, newPassword }); setMessage(res.message); }
    catch (e: any) { setError(e.message); }
  }

  return <main className="auth-page"><form className="auth-card form" onSubmit={submit}>
    <Link className="brand" href="/"><span className="brand-mark">M</span><span>Médilink</span></Link>
    <h1>Nouveau mot de passe</h1>
    {message ? <Alert type="success">{message}</Alert> : null}{error ? <Alert type="error">{error}</Alert> : null}
    <Field label="Nouveau mot de passe"><Input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /></Field>
    <Button>Réinitialiser</Button>
    {message ? <LinkButton href="/login">Se connecter</LinkButton> : null}
  </form></main>;
}
