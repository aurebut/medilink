'use client';

import { useEffect } from 'react';

// Marks `[data-reveal]` blocks as they scroll into view. Their hidden starting state exists only
// under the `ap-js` class set in the document head when motion is welcome, so the page is complete
// without script and with reduced motion.
export function ApercuReveal() {
  useEffect(() => {
    const root = document.documentElement;
    if (!root.classList.contains('ap-js')) return;
    (window as unknown as { __apReveal?: boolean }).__apReveal = true;
    const elements = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (!('IntersectionObserver' in window)) { elements.forEach(element => element.classList.add('is-in')); return; }
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    elements.forEach(element => observer.observe(element));
    return () => observer.disconnect();
  }, []);
  return null;
}
