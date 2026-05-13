'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Establishment } from '@/lib/types';

export function useEstablishments() {
  const [establishments, setEstablishments] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setEstablishments(await api.get<Establishment[]>('/establishments/me'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  return { establishments, primary: establishments[0] || null, loading, error, reload: load };
}
