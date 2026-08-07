'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './api';
import { errorMessage } from '@/lib/user-facing';

export type WorkspaceNote = {
  key: string;
  content: string;
  updatedAt: string;
  updatedById: string;
};

type Options = {
  establishmentId?: string | null;
  prefix: 'agenda:' | 'mission:';
  enabled?: boolean;
};

export function useWorkspaceNotes({
  establishmentId,
  prefix,
  enabled = true,
}: Options) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const listPath = useMemo(() => {
    const params = new URLSearchParams({ prefix });
    if (establishmentId) params.set('establishmentId', establishmentId);
    return `/workspace-notes?${params.toString()}`;
  }, [establishmentId, prefix]);

  const load = useCallback(async (reload = false) => {
    if (!enabled) {
      setNotes({});
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const rows = reload
        ? await api.reload<WorkspaceNote[]>(listPath)
        : await api.get<WorkspaceNote[]>(listPath);
      setNotes(Object.fromEntries(rows.map((row) => [row.key.slice(prefix.length), row.content])));
    } catch (caught) {
      setError(errorMessage(caught) || 'Impossible de charger les notes.');
    } finally {
      setLoading(false);
    }
  }, [enabled, listPath, prefix]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(async (key: string, value: string) => {
    const content = value.trim();
    const previous = notes[key];
    setNotes((current) => {
      const next = { ...current };
      if (content) next[key] = content;
      else delete next[key];
      return next;
    });
    setSavingKey(key);
    setError(null);

    try {
      await api.patch(`/workspace-notes/${encodeURIComponent(`${prefix}${key}`)}`, {
        content,
        ...(establishmentId ? { establishmentId } : {}),
      });
      return true;
    } catch (caught) {
      setNotes((current) => {
        const next = { ...current };
        if (previous) next[key] = previous;
        else delete next[key];
        return next;
      });
      setError(errorMessage(caught) || 'Impossible d’enregistrer la note.');
      return false;
    } finally {
      setSavingKey(null);
    }
  }, [establishmentId, notes, prefix]);

  return {
    notes,
    loading,
    error,
    savingKey,
    save,
    reload: () => load(true),
  };
}
