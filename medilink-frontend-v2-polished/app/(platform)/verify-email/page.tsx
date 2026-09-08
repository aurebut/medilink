'use client';

import Link from 'next/link';
import { Suspense, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Alert, LinkButton } from '@/components/ui';
import { api } from '@/lib/api';
import { defaultRouteForUser } from '@/lib/routes';
import { useOneTimeUrlToken } from '@/lib/useOneTimeUrlToken';
import { errorMessage } from '@/lib/user-facing';

function VerifyEmailStatus() {
  const { token, ready } = useOneTimeUrlToken();
  const { user, refresh } = useAuth();
  const submittedToken = useRef<string | null>(null);
  const [message, setMessage] = useState(
    'Consultez votre boîte email pour activer votre compte.',
  );
  const [error, setError] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!ready || !token || submittedToken.current === token) return;

    submittedToken.current = token;
    setMessage('Vérification en cours...');
    api.post<{ message: string }>('/auth/verify-email', { token })
      .then(async (result) => {
        await refresh();
        setVerified(true);
        setMessage(result.message);
      })
      .catch((requestError) => setError(errorMessage(requestError)));
  }, [ready, refresh, token]);

  async function resend() {
    setResending(true);
    setError(null);
    try {
      const result = await api.post<{ message: string }>('/auth/resend-verification');
      setMessage(result.message);
    } catch (requestError) {
      setError(errorMessage(requestError));
    } finally {
      setResending(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-card form">
        <Link className="brand" href="/"><span>Médi<em style={{ fontStyle: 'italic' }}>Link</em></span></Link>
        <h1>Vérification email</h1>
        {error ? <Alert type="error">{error}</Alert> : <Alert type="success">{message}</Alert>}
        {ready && !token && user && !user.emailVerified ? (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={resend}
            disabled={resending}
          >
            {resending ? 'Envoi...' : 'Renvoyer l’email de vérification'}
          </button>
        ) : null}
        <LinkButton href={verified ? defaultRouteForUser(user) : '/login'}>
          {verified ? 'Continuer' : 'Aller à la connexion'}
        </LinkButton>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailStatus />
    </Suspense>
  );
}
