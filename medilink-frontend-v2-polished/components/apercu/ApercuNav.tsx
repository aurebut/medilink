'use client';
/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation between isolated root layouts. */

import { useEffect, useState } from 'react';
import { navLinks } from '@/content/apercu-content';

export function ApercuNav() {
  const [stuck, setStuck] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setStuck(window.scrollY > 24);
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    const onResize = () => { if (window.innerWidth > 1100) setOpen(false); };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, []);

  return <header className={`ap-nav${stuck ? ' is-stuck' : ''}${open ? ' is-open' : ''}`}>
    <div className="ap-nav-bar">
      <a className="ap-logo" href="/" aria-label="MédiLink — Accueil">Médi<em>Link</em></a>
      <nav className="ap-nav-links" aria-label="Navigation principale">
        {navLinks.map(link => <a href={link.href} key={link.href}>{link.label}</a>)}
      </nav>
      <div className="ap-nav-actions">
        <a className="ap-nav-login" href="/login">Se connecter</a>
        <a className="ap-btn ap-btn--sm ap-btn--peach" href="/demo">Demander une démo</a>
      </div>
      <button className="ap-nav-toggle" type="button" aria-expanded={open} aria-controls="ap-menu" onClick={() => setOpen(value => !value)}>
        <span className="ap-sr">{open ? 'Fermer le menu' : 'Ouvrir le menu'}</span>
        <span aria-hidden="true"><i /><i /></span>
      </button>
    </div>
    <div className="ap-menu" id="ap-menu" hidden={!open}>
      <nav aria-label="Navigation mobile">
        {navLinks.map(link => <a href={link.href} key={link.href} onClick={() => setOpen(false)}>{link.label}</a>)}
      </nav>
      <div className="ap-menu-actions">
        <a className="ap-btn ap-btn--ghost" href="/login">Se connecter</a>
        <a className="ap-btn ap-btn--peach" href="/demo">Demander une démo</a>
      </div>
    </div>
  </header>;
}
