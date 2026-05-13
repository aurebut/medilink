'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import { Alert, Button, Field, Input, Select } from '@/components/ui';

export default function RegisterPage() {
  const [accountType, setAccountType] = useState<'candidate' | 'establishment'>('candidate');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setMessage(null);
    try {
      const res = await api.post<{ message: string; userId: string }>('/auth/register', { accountType, email, password, firstName, lastName, phone });
      setMessage(res.message + ' En mode email mock, le lien est visible dans les logs du backend.');
    } catch (err: any) {
      setError(err.message || 'Inscription impossible.');
    } finally { setLoading(false); }
  }

  return <main className="auth-page"><form className="auth-card form" onSubmit={submit}>
    <Link className="brand" href="/"><span className="brand-mark">M</span><span>Médilink</span></Link>
    <div><h1>Créer un compte</h1><p>Choisis le type de compte à créer pour le MVP.</p></div>
    {message ? <Alert type="success">{message}</Alert> : null}
    {error ? <Alert type="error">{error}</Alert> : null}
    <Field label="Type de compte"><Select value={accountType} onChange={(e) => setAccountType(e.target.value as any)}><option value="candidate">Candidat médical</option><option value="establishment">Établissement / recruteur</option></Select></Field>
    <div className="form-row"><Field label="Prénom"><Input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field><Field label="Nom"><Input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field></div>
    <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
    <Field label="Téléphone"><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></Field>
    <Field label="Mot de passe"><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
    <Button block disabled={loading}>{loading ? 'Création...' : 'Créer le compte'}</Button>
    <Link href="/login" className="small">J’ai déjà un compte</Link>
  </form></main>;
}
