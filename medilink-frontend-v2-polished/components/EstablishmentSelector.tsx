'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Establishment } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';

export function useEstablishments() {
  const cachedEstablishments = api.getSync<Establishment[]>('/establishments/me');
  const [establishments, setEstablishments] = useState<Establishment[]>(cachedEstablishments || []);
  const [loading, setLoading] = useState(!cachedEstablishments);
  const [error, setError] = useState<string | null>(null);

  async function load(options: { silent?: boolean; reload?: boolean } = {}) {
    if (!options.silent) setLoading(true);
    try {
      setEstablishments(options.reload
        ? await api.reload<Establishment[]>('/establishments/me')
        : await api.get<Establishment[]>('/establishments/me'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useAutoRefresh(() => load({ silent: true, reload: true }), { enabled: !loading });
  return { establishments, primary: establishments[0] || null, loading, error, reload: load };
}
