'use client';

import { useEffect } from 'react';
import { createFirstProcessScene } from './process-first-scene';
import { createPilotProcessScene } from './process-pilot-scene';
import { createConcludeProcessScene } from './process-conclude-scene';
import { initializeProcessNavigation } from './process-navigation';

export function LandingProcess() {
  useEffect(() => {
    const scene = createFirstProcessScene();
    const pilot = createPilotProcessScene();
    const conclude = createConcludeProcessScene();
    const disposeNavigation = initializeProcessNavigation(scene, pilot, conclude);
    return () => {
      disposeNavigation?.();
      scene?.destroy();
      pilot?.destroy();
      conclude?.destroy();
    };
  }, []);
  return null;
}
