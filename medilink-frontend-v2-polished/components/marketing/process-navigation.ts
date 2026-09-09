export type ProcessScene = {
  duration: number;
  render: (elapsed: number) => void;
  reset: () => void;
  canPlay: () => boolean;
};

// Each animated illustration owns its reading time before the next tab starts.
export function initializeProcessNavigation(firstScene?: ProcessScene, pilotScene?: ProcessScene, concludeScene?: ProcessScene) {
  const scenes = [firstScene, pilotScene, concludeScene];
  const section = document.querySelector<HTMLElement>('.ml-process');
  if (!section) return;
  const tabsContainer = section.querySelector<HTMLElement>('.ml-process-tabs');
  const tabs = Array.from(section.querySelectorAll<HTMLButtonElement>('[role="tab"]'));
  const panels = Array.from(section.querySelectorAll<HTMLElement>('[role="tabpanel"]'));
  const PLAYBACK_RATE = 1.5;
  const STEP_DURATION = 5500;
  const INTERACTION_DELAY = 4000 / PLAYBACK_RATE;
  const listeners = new AbortController();
  const signal = listeners.signal;
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  let currentIndex = 0;
  let isPlaying = !motionPreference.matches;
  let resumeAt = 0;
  let isInView = false;
  let startTime: number | null = null;
  let elapsedBeforePause = 0;
  let animationFrameId = 0;

  function centerTab(tab: HTMLButtonElement) {
    if (!tab || !tabsContainer) return;
    const targetScroll = tab.offsetLeft - (tabsContainer.offsetWidth - tab.offsetWidth) / 2;
    tabsContainer.scrollTo({ left: Math.max(0, targetScroll), behavior: motionPreference.matches ? 'instant' : 'smooth' });
  }

  function updateTabProgress(index: number, progress: number) {
    tabs.forEach((tab, i) => {
      const fill = tab.querySelector<HTMLElement>('.ml-tab-fill');
      if (fill) fill.style.width = i === index ? (progress * 100).toFixed(2) + '%' : '0%';
    });
  }

  function pauseTimer() {
    if (startTime !== null) {
      elapsedBeforePause = performance.now() - startTime;
      startTime = null;
    }
  }

  function select(index: number, shouldCenter = true) {
    currentIndex = index;
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      if (panels[i]) panels[i].hidden = !selected;
    });
    if (shouldCenter) centerTab(tabs[index]);
    elapsedBeforePause = 0;
    startTime = null;
    updateTabProgress(currentIndex, 0);
    scenes[index]?.reset();
  }

  function step(timestamp: number) {
    const scene = scenes[currentIndex];
    const sceneReady = !scene || scene.canPlay();
    if (isPlaying && isInView && !document.hidden && sceneReady && timestamp >= resumeAt) {
      if (startTime === null) startTime = timestamp - elapsedBeforePause;
      // Scale the shared scene clock so movement, transformations, reading holds
      // and tab progress accelerate together. Pause bookkeeping stays in wall time.
      const elapsed = (timestamp - startTime) * PLAYBACK_RATE;
      const duration = scene?.duration ?? STEP_DURATION;
      const progress = Math.min(elapsed / duration, 1);
      updateTabProgress(currentIndex, progress);
      scene?.render(Math.min(elapsed, duration));
      if (progress >= 1) select((currentIndex + 1) % tabs.length);
    } else {
      pauseTimer();
    }
    animationFrameId = requestAnimationFrame(step);
  }

  function delayPlayback() {
    pauseTimer();
    resumeAt = performance.now() + INTERACTION_DELAY;
  }

  function selectManually(index: number) {
    select(index);
    delayPlayback();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectManually(index), { signal });
    tab.addEventListener('keydown', event => {
      let next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      selectManually(next);
      tabs[next].focus();
    }, { signal });
  });

  const nav = section.querySelector('.ml-process-nav') || tabsContainer;
  nav?.addEventListener('mouseenter', delayPlayback, { signal });
  let observer: IntersectionObserver | undefined;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        isInView = entry.isIntersecting;
        if (isInView && isPlaying) startTime = null;
        else pauseTimer();
      });
    }, { threshold: .15 });
    observer.observe(section);
  } else isInView = true;

  document.addEventListener('visibilitychange', pauseTimer, { signal });
  motionPreference.addEventListener?.('change', event => {
    pauseTimer();
    isPlaying = !event.matches;
  }, { signal });

  let touchStartX = 0;
  let touchStartY = 0;
  const ignoresSwipe = (target: EventTarget | null) => target instanceof Element && target.closest('.ml-process-nav, .ml-sequence-control');
  section.addEventListener('touchstart', event => {
    if (ignoresSwipe(event.target)) return;
    touchStartX = event.changedTouches[0].screenX;
    touchStartY = event.changedTouches[0].screenY;
  }, { passive: true, signal });
  section.addEventListener('touchend', event => {
    if (ignoresSwipe(event.target)) return;
    const deltaX = event.changedTouches[0].screenX - touchStartX;
    const deltaY = event.changedTouches[0].screenY - touchStartY;
    if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      if (deltaX < 0 && currentIndex < tabs.length - 1) selectManually(currentIndex + 1);
      else if (deltaX > 0 && currentIndex > 0) selectManually(currentIndex - 1);
    }
  }, { passive: true, signal });

  if (tabsContainer) {
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;
    let hasMoved = false;
    tabsContainer.addEventListener('mousedown', event => {
      isDown = true;
      hasMoved = false;
      startX = event.pageX - tabsContainer.offsetLeft;
      scrollLeft = tabsContainer.scrollLeft;
      delayPlayback();
    }, { signal });
    tabsContainer.addEventListener('mouseleave', () => { isDown = false; }, { signal });
    tabsContainer.addEventListener('mouseup', () => { isDown = false; delayPlayback(); }, { signal });
    tabsContainer.addEventListener('mousemove', event => {
      if (!isDown) return;
      const walk = event.pageX - tabsContainer.offsetLeft - startX;
      if (Math.abs(walk) > 4) {
        delayPlayback();
        hasMoved = true;
        event.preventDefault();
        tabsContainer.scrollLeft = scrollLeft - walk;
      }
    }, { signal });
    tabsContainer.addEventListener('click', event => {
      if (hasMoved) { event.preventDefault(); event.stopPropagation(); }
    }, { capture: true, signal });
  }

  select(0, false);
  animationFrameId = requestAnimationFrame(step);
  return () => {
    listeners.abort();
    observer?.disconnect();
    cancelAnimationFrame(animationFrameId);
  };
}
