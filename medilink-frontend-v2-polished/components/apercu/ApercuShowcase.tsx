'use client';

import { useEffect, useRef, useState } from 'react';
import { showcase } from '@/content/apercu-content';

// Three genuine product captures behind one set of tabs. The tabs advance on their own until the
// visitor picks one; with reduced motion they never move by themselves.
export function ApercuShowcase() {
  const [active, setActive] = useState(0);
  const [visible, setVisible] = useState(false);
  const [chosen, setChosen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!document.documentElement.classList.contains('ap-js') || !root.current) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: 0.35 });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, []);

  const choose = (index: number) => { setChosen(true); setActive(index); };
  const onKeyDown = (event: React.KeyboardEvent) => {
    const move = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!move) return;
    event.preventDefault();
    const next = (active + move + showcase.length) % showcase.length;
    choose(next);
    root.current?.querySelector<HTMLButtonElement>(`#ap-tab-${showcase[next].id}`)?.focus();
  };
  const playing = visible && !chosen;

  return <div className="ap-showcase" ref={root}>
    <div className="ap-showcase-tabs" role="tablist" aria-label="Aperçus de la plateforme" onKeyDown={onKeyDown}>
      {showcase.map((item, index) => <button
        key={item.id} id={`ap-tab-${item.id}`} type="button" role="tab" className="ap-showcase-tab"
        aria-selected={index === active} aria-controls={`ap-panel-${item.id}`} tabIndex={index === active ? 0 : -1}
        onClick={() => choose(index)}
      >
        <span className="ap-showcase-tab-name">{item.tab}</span>
        <span className="ap-showcase-tab-title">{item.title}</span>
        <span className="ap-showcase-tab-text">{item.text}</span>
        {index === active && playing && <span className="ap-showcase-progress" aria-hidden="true" onAnimationEnd={() => setActive((active + 1) % showcase.length)} />}
      </button>)}
    </div>
    <div className="ap-showcase-stage">
      <div className="ap-window">
        <div className="ap-window-bar" aria-hidden="true"><i /><i /><i /><span>MédiLink</span></div>
        <div className="ap-window-screen">
          {showcase.map((item, index) => <div
            key={item.id} id={`ap-panel-${item.id}`} role="tabpanel" aria-labelledby={`ap-tab-${item.id}`}
            className={`ap-window-shot${index === active ? ' is-active' : ''}`} aria-hidden={index !== active}
          >
            <picture>
              <source media="(max-width: 700px)" srcSet={item.capture.mobile.srcSet} width={item.capture.mobile.width} height={item.capture.mobile.height} />
              <img src={item.capture.desktop.src} srcSet={item.capture.desktop.srcSet} width={item.capture.desktop.width} height={item.capture.desktop.height} alt={item.alt} loading="lazy" decoding="async" />
            </picture>
          </div>)}
        </div>
      </div>
    </div>
  </div>;
}
