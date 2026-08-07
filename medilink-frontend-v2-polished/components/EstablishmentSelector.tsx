'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, subscribeApiCache } from '@/lib/api';
import {
  activeEstablishmentStorageKey,
  persistActiveEstablishmentId,
  readActiveEstablishmentId,
} from '@/lib/establishment-context';
import type { Establishment } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { useAuth } from './AuthProvider';
import { Button, Card, LoadingCard } from './ui';
import { errorMessage } from '@/lib/user-facing';

type LoadOptions = { silent?: boolean; reload?: boolean };

type EstablishmentContextValue = {
  establishments: Establishment[];
  primary: Establishment | null;
  activeEstablishmentId: string | null;
  selectionRequired: boolean;
  loading: boolean;
  error: string | null;
  setActiveEstablishmentId: (establishmentId: string) => void;
  reload: (options?: LoadOptions) => Promise<void>;
};

const EstablishmentContext = createContext<EstablishmentContextValue | null>(null);

function initialActiveId(userId: string | undefined, establishments: Establishment[]) {
  const storedId = readActiveEstablishmentId(userId);
  if (storedId && establishments.some((item) => item.id === storedId)) return storedId;
  return establishments.length === 1 ? establishments[0].id : storedId;
}

export function EstablishmentProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const cachedEstablishments = api.getSync<Establishment[]>('/establishments/me') || [];
  const [establishments, setEstablishments] = useState<Establishment[]>(cachedEstablishments);
  const [activeEstablishmentId, setActiveId] = useState<string | null>(
    () => initialActiveId(userId, cachedEstablishments),
  );
  const [loading, setLoading] = useState(cachedEstablishments.length === 0);
  const [error, setError] = useState<string | null>(null);

  const reconcileSelection = useCallback((items: Establishment[]) => {
    setActiveId((currentId) => {
      if (currentId && items.some((item) => item.id === currentId)) return currentId;

      const storedId = readActiveEstablishmentId(userId);
      if (storedId && items.some((item) => item.id === storedId)) return storedId;
      return items.length === 1 ? items[0].id : null;
    });
  }, [userId]);

  const applyEstablishments = useCallback((items: Establishment[]) => {
    setEstablishments(items);
    reconcileSelection(items);
  }, [reconcileSelection]);

  const load = useCallback(async (options: LoadOptions = {}) => {
    if (!options.silent) setLoading(true);
    try {
      setError(null);
      const items = options.reload
        ? await api.reload<Establishment[]>('/establishments/me')
        : await api.get<Establishment[]>('/establishments/me');
      applyEstablishments(items);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      if (!options.silent) setLoading(false);
    }
  }, [applyEstablishments]);

  useEffect(() => {
    const nextCachedEstablishments = api.getSync<Establishment[]>('/establishments/me') || [];
    setEstablishments(nextCachedEstablishments);
    setActiveId(initialActiveId(userId, nextCachedEstablishments));
    void load();
  }, [load, userId]);

  useEffect(() => subscribeApiCache<Establishment[]>('/establishments/me', applyEstablishments), [applyEstablishments]);

  useEffect(() => {
    if (!userId) return;
    persistActiveEstablishmentId(userId, activeEstablishmentId);
  }, [activeEstablishmentId, userId]);

  useEffect(() => {
    if (!userId) return;
    const key = activeEstablishmentStorageKey(userId);

    function syncSelection(event: StorageEvent) {
      if (event.key !== key) return;
      const nextId = event.newValue;
      if (nextId && establishments.some((item) => item.id === nextId)) {
        setActiveId(nextId);
      } else if (establishments.length === 1) {
        setActiveId(establishments[0].id);
      } else {
        setActiveId(null);
      }
    }

    window.addEventListener('storage', syncSelection);
    return () => window.removeEventListener('storage', syncSelection);
  }, [establishments, userId]);

  useAutoRefresh(() => load({ silent: true, reload: true }), {
    enabled: Boolean(user) && !loading,
    refreshOnMount: false,
  });

  const setActiveEstablishmentId = useCallback((establishmentId: string) => {
    if (!establishments.some((item) => item.id === establishmentId)) return;
    setActiveId(establishmentId);
    if (userId) persistActiveEstablishmentId(userId, establishmentId);
  }, [establishments, userId]);

  const primary = useMemo(
    () => establishments.find((item) => item.id === activeEstablishmentId) || null,
    [activeEstablishmentId, establishments],
  );
  const selectionRequired = !loading && establishments.length > 1 && !primary;
  const value = useMemo<EstablishmentContextValue>(() => ({
    establishments,
    primary,
    activeEstablishmentId,
    selectionRequired,
    loading,
    error,
    setActiveEstablishmentId,
    reload: load,
  }), [
    activeEstablishmentId,
    error,
    establishments,
    load,
    loading,
    primary,
    selectionRequired,
    setActiveEstablishmentId,
  ]);

  return <EstablishmentContext.Provider value={value}>{children}</EstablishmentContext.Provider>;
}

export function useOptionalEstablishments() {
  return useContext(EstablishmentContext);
}

export function useEstablishments() {
  const context = useOptionalEstablishments();
  if (!context) {
    throw new Error('useEstablishments doit être utilisé dans EstablishmentProvider');
  }
  return context;
}

export function EstablishmentSelectionGate({ children }: { children: React.ReactNode }) {
  const {
    establishments,
    selectionRequired,
    loading,
    error,
    setActiveEstablishmentId,
  } = useEstablishments();

  if (loading && establishments.length === 0) {
    return <LoadingCard label="Chargement de vos établissements..." />;
  }

  if (!selectionRequired) return <>{children}</>;

  return (
    <Card className="establishment-selection-card">
      <span className="eyebrow">Contexte de travail</span>
      <h1>Choisissez un établissement</h1>
      <p>Ce choix détermine les missions, candidatures et données comptables affichées. Il sera conservé pour votre prochaine visite.</p>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <div className="establishment-selection-actions">
        {establishments.map((establishment) => (
          <Button
            key={establishment.id}
            type="button"
            variant="light"
            onClick={() => setActiveEstablishmentId(establishment.id)}
          >
            {establishment.name}
          </Button>
        ))}
      </div>
    </Card>
  );
}
