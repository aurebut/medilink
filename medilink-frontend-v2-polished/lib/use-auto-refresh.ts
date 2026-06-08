'use client';

import { useEffect, useRef } from 'react';

type AutoRefreshOptions = {
  enabled?: boolean;
  intervalMs: number;
};

export function useAutoRefresh(refresh: () => void | Promise<void>, options: AutoRefreshOptions) {
  const { enabled = true, intervalMs } = options;
  const refreshRef = useRef(refresh);
  const runningRef = useRef(false);

  useEffect(() => {
    refreshRef.current = refresh;
  }, [refresh]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let intervalId: number | undefined;

    async function tick() {
      if (document.visibilityState !== 'visible' || runningRef.current) return;
      runningRef.current = true;
      try {
        await refreshRef.current();
      } finally {
        runningRef.current = false;
      }
    }

    intervalId = window.setInterval(() => {
      void tick();
    }, intervalMs);

    function refreshWhenVisible() {
      if (document.visibilityState === 'visible') void tick();
    }

    document.addEventListener('visibilitychange', refreshWhenVisible);
    window.addEventListener('focus', refreshWhenVisible);

    return () => {
      if (intervalId) window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', refreshWhenVisible);
      window.removeEventListener('focus', refreshWhenVisible);
    };
  }, [enabled, intervalMs]);
}
