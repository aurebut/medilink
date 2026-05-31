'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { FormEvent, Suspense, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AuthPage } from '@/components/AuthPage';
import { Alert, Button, Field, Input } from '@/components/ui';
import { defaultRouteForUser } from '@/lib/routes';

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const user = await login(email, password);
      router.push(search.get('next') || defaultRouteForUser(user));
    } catch (err: any) {
      setError(err.message || 'Connexion impossible.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPage
      eyebrow="Ravi de vous revoir"
      title="Connexion"
      description="Retrouvez vos missions, vos candidatures et vos échanges en quelques secondes."
      onSubmit={submit}
      footer={(
        <>
          <Link href="/forgot-password" className="small">Mot de passe oublié ?</Link>
          <Link href="/register" className="small auth-card-footer-strong">Créer un compte</Link>
        </>
      )}
    >
        {error ? <Alert type="error">{error}</Alert> : null}
        <Field label="Email"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="vous@example.com" /></Field>
        <Field label="Mot de passe"><Input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Votre mot de passe" /></Field>
        <Button block disabled={loading}>{loading ? 'Connexion...' : 'Se connecter'}</Button>
    </AuthPage>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
