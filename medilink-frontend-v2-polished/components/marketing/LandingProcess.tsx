'use client';

import { useEffect } from 'react';
import { createFirstProcessScene } from './process-first-scene';
import { initializeProcessNavigation } from './process-navigation';

export function LandingProcess() {
  useEffect(() => {
    const scene = createFirstProcessScene();
    const disposeNavigation = initializeProcessNavigation(scene);
    return () => {
      disposeNavigation?.();
      scene?.destroy();
    };
  }, []);
  return null;
}
