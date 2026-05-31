'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Alert, LinkButton } from '@/components/ui';

function VerifyEmailStatus() {
  const token = useSearchParams().get('token');
  const [message, setMessage] = useState('Vérification en cours...');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setMessage('Token manquant.'); return; }
    api.post<{ message: string }>('/auth/verify-email', { token })
      .then((r) => setMessage(r.message))
      .catch((e) => setError(e.message));
  }, [token]);

  return <main className="auth-page"><div className="auth-card form">
    <Link className="brand" href="/"><span>Médilink</span></Link>
    <h1>Vérification email</h1>
    {error ? <Alert type="error">{error}</Alert> : <Alert type="success">{message}</Alert>}
    <LinkButton href="/login">Aller à la connexion</LinkButton>
  </div></main>;
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailStatus />
    </Suspense>
  );
}
