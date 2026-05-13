'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Alert, Button, Field, Input } from '@/components/ui';
import { defaultRouteForUser } from '@/lib/routes';

export default function LoginPage() {
  const router = useRouter();
  const search = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    try {
      const user = await login(email, password);
      router.push(search.get('next') || defaultRouteForUser(user));
    } catch (err: any) {
      setError(err.message || 'Connexion impossible.');
    } finally { setLoading(false); }
  }

  return <main className="auth-page"><form className="auth-card form" onSubmit={submit}>
    <Link className="brand" href="/"><span className="brand-mark">M</span><span>Médilink</span></Link>
    <div><h1>Connexion</h1><p>Connecte-toi pour accéder à ton espace.</p></div>
    {error ? <Alert type="error">{error}</Alert> : null}
    <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
    <Field label="Mot de passe"><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
    <Button block disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</Button>
    <div className="actions"><Link href="/forgot-password" className="small">Mot de passe oublié ?</Link><Link href="/register" className="small">Créer un compte</Link></div>
  </form></main>;
}
