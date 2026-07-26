'use client';

import { useEffect, useState } from 'react';

export function useOneTimeUrlToken() {
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ''));
    const legacyQuery = new URLSearchParams(window.location.search);
    const rawToken = fragment.get('token') || legacyQuery.get('token');

    window.history.replaceState({}, '', window.location.pathname);
    setToken(rawToken && /^[a-f0-9]{64}$/i.test(rawToken) ? rawToken : null);
    setReady(true);
  }, []);

  return { token, ready };
}
