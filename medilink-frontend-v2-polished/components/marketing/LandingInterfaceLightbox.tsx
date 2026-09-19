'use client';

import { useEffect, useRef, useState } from 'react';

type Capture = { src: string; alt: string; title: string; width: number; height: number };

export function LandingInterfaceLightbox() {
  const dialog = useRef<HTMLDialogElement>(null);
  const opener = useRef<HTMLAnchorElement | null>(null);
  const [capture, setCapture] = useState<Capture | null>(null);
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    function open(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[data-interface-preview]') : null;
      const img = anchor?.querySelector('img');
      if (!anchor || !img || !dialog.current?.showModal) return;
      event.preventDefault();
      opener.current = anchor;
      const mobile = window.matchMedia('(max-width: 700px)').matches;
      const source = mobile ? anchor.querySelector('source') : img;
      const src = source?.getAttribute('srcset')?.split(',').at(-1)?.trim().split(/\s+/)[0] || img.currentSrc;
      setZoomed(false);
      setCapture({ src, alt: img.alt,
        title: anchor.closest('figure')?.getAttribute('aria-label') || 'Aperçu MédiLink',
        width: Number(source?.getAttribute('width')) || img.width,
        height: Number(source?.getAttribute('height')) || img.height,
      });
    }
    document.addEventListener('click', open);
    return () => document.removeEventListener('click', open);
  }, []);

  useEffect(() => {
    if (!capture) return;
    dialog.current?.showModal();
    document.documentElement.classList.add('ml-interface-modal-open');
    return () => document.documentElement.classList.remove('ml-interface-modal-open');
  }, [capture]);

  function closed() {
    setCapture(null);
    setZoomed(false);
    opener.current?.focus({ preventScroll: true });
  }

  return <dialog ref={dialog} className="ml-interface-dialog" aria-labelledby="ml-interface-dialog-title" onClose={closed}
    onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <header className="ml-interface-dialog-head">
      <div><h2 id="ml-interface-dialog-title">{capture?.title}</h2><p>Interface MédiLink · Données de démonstration</p></div>
      <div className="ml-interface-dialog-actions">
        <button type="button" aria-pressed={zoomed} onClick={() => setZoomed(value => !value)}>{zoomed ? 'Ajuster' : 'Zoomer'}</button>
        <button type="button" autoFocus aria-label="Fermer l’aperçu" onClick={() => dialog.current?.close()}>Fermer <span aria-hidden="true">×</span></button>
      </div>
    </header>
    <div className={`ml-interface-dialog-image${zoomed ? ' is-zoomed' : ''}`} tabIndex={0} aria-label="Capture de l’interface, défilable après agrandissement">
      {/* eslint-disable-next-line @next/next/no-img-element -- Preserve the exact desktop/mobile app capture. */}
      {capture && <img src={capture.src} width={capture.width} height={capture.height} alt={capture.alt} />}
    </div>
  </dialog>;
}
