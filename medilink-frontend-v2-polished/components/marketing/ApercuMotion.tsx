'use client';

import { useEffect } from 'react';

// Blocks that enter once as they scroll into view. Hidden process panels are deliberately absent:
// an observer never fires for `display: none`, and they would stay invisible after a tab change.
const entrances = [
  '.ml-process-head', '.ml-process-nav', '.ml-testimonials-heading', '.ml-contributor',
  '.ml-continuity-copy', '.ml-continuity .ml-interface-preview', '.ml-continuity-benefits',
  '.ml-workspace-copy', '.ml-workspace .ml-interface-preview',
  '.ml-documents-copy', '.ml-documents .ml-interface-preview',
  '.audiences .section-head', '.audience-grid', '.cta-band',
  '.faq-inner > .section-head', '.faq-content',
].join(',');

// Motion for the design preview only. Without it (no script, reduced motion) the page is complete
// and static: the hidden starting states exist only under the `apercu-motion` class set here.
export function ApercuMotion() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const root = document.documentElement;
    const elements = Array.from(document.querySelectorAll<HTMLElement>(entrances));
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        (entry.target as HTMLElement).dataset.apercuSeen = '';
        observer.unobserve(entry.target);
      }
    }, { rootMargin: '0px 0px -12% 0px' });
    for (const element of elements) {
      // Whatever is already on screen stays put instead of blinking out and back in.
      if (element.getBoundingClientRect().top < window.innerHeight * 0.9) element.dataset.apercuSeen = '';
      else observer.observe(element);
    }
    root.classList.add('apercu-motion');

    // The hero cut-outs lean a few pixels toward a fine pointer.
    const hero = document.querySelector<HTMLElement>('.hero--structured');
    const pointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    let frame = 0;
    const lean = (event: PointerEvent) => {
      if (!hero || !pointer.matches || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const box = hero.getBoundingClientRect();
        hero.style.setProperty('--lean-x', ((event.clientX - box.left) / box.width * 2 - 1).toFixed(3));
        hero.style.setProperty('--lean-y', ((event.clientY - box.top) / box.height * 2 - 1).toFixed(3));
      });
    };
    hero?.addEventListener('pointermove', lean);

    return () => {
      observer.disconnect();
      hero?.removeEventListener('pointermove', lean);
      if (frame) cancelAnimationFrame(frame);
      root.classList.remove('apercu-motion');
      for (const element of elements) delete element.dataset.apercuSeen;
    };
  }, []);
  return null;
}
