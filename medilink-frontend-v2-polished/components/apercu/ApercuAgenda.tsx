'use client';
/* eslint-disable @next/next/no-img-element -- Small fixed-size fixture portraits. */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { weekDays } from '@/content/apercu-content';

// Time spent on each step before the next: usual week, absence, match, replacement, the week unfolds.
const STEP_DURATIONS = [1100, 1700, 1900, 1700, 6400];
const LAST_STEP = STEP_DURATIONS.length - 1;
const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'];

const Check = () => <svg viewBox="0 0 16 16" width="12" height="12" aria-hidden="true"><path d="m3.5 8.4 3 3 6-6.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>;

// The hero illustration: a practice's week in which the absent doctor's sessions are taken over by
// a replacement. Rendered in its final state; the sequence only plays once the script has booted.
export function ApercuAgenda() {
  const [step, setStep] = useState(LAST_STEP);
  const [booted, setBooted] = useState(false);
  const figure = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!document.documentElement.classList.contains('ap-js')) return;
    let current = 0;
    let timer = 0;
    let running = false;
    const schedule = () => {
      timer = window.setTimeout(() => {
        current = current === LAST_STEP ? 0 : current + 1;
        setStep(current);
        schedule();
      }, STEP_DURATIONS[current]);
    };
    const start = () => { if (!running) { running = true; schedule(); } };
    const stop = () => { running = false; window.clearTimeout(timer); };
    setStep(0);
    // Reveal only once the first step has been painted, so nothing is seen rewinding.
    const reveal = requestAnimationFrame(() => requestAnimationFrame(() => setBooted(true)));
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) start(); else stop(); }, { threshold: 0.15 });
    if (figure.current) observer.observe(figure.current);
    return () => { stop(); observer.disconnect(); cancelAnimationFrame(reveal); };
  }, []);

  const reached = [1, 2, 3, 4].filter(index => step >= index).map(index => ` s${index}`).join('');

  return <figure
    ref={figure}
    className={`ap-board${reached}`}
    data-boot={booted ? undefined : ''}
    aria-label="Illustration : dans l’agenda du Cabinet des Tilleuls, la semaine d’absence du Dr Thomas Martin est reprise par la Dre Sarah Bernard, médecin remplaçante."
  >
    <div className="ap-board-panel" aria-hidden="true">
      <header className="ap-board-head">
        <div className="ap-board-place">
          <img src="/landing-assets/people/cabinet-des-tilleuls.webp" alt="" width="44" height="44" />
          <div><strong>Cabinet des Tilleuls</strong><span>Paris · semaine du 14 septembre</span></div>
        </div>
        <div className="ap-board-status">
          <span className="ap-status ap-status--open">Remplacement à pourvoir</span>
          <span className="ap-status ap-status--done"><Check /> Remplacement confirmé</span>
        </div>
      </header>
      <div className="ap-board-grid">
        <div className="ap-board-hours">{hours.map(hour => <span key={hour}>{hour}</span>)}</div>
        <div className="ap-board-days">
          <div className="ap-board-absence"><span>Dr Thomas Martin</span> absent du 14 au 18</div>
          {weekDays.map((day, index) => <div className="ap-day" key={day.date} style={{ '--d': index } as CSSProperties}>
            <div className="ap-day-head"><span>{day.short}</span><strong>{day.date}</strong></div>
            <div className="ap-day-body">
              <div className="ap-slot ap-slot--am ap-slot--holder">{index === 0 && <span>Dr Martin</span>}</div>
              <div className="ap-slot ap-slot--pm ap-slot--holder" />
              <div className="ap-slot ap-slot--am ap-slot--locum">
                <time>08:30</time>
                {index === 0 && <span><img src="/landing-assets/people/sarah-bernard.webp" alt="" width="22" height="22" />Dre Bernard</span>}
              </div>
              <div className="ap-slot ap-slot--pm ap-slot--locum"><time>14:00</time></div>
              {index === 0 && <p className="ap-note ap-note--chip ap-note--monday"><Check /> Accès et repères transmis</p>}
              {index === 2 && <p className="ap-note ap-note--bubble">On fait un point après les consultations ?</p>}
              {index === 4 && <p className="ap-note ap-note--chip ap-note--friday"><Check /> Fin de mission validée</p>}
            </div>
          </div>)}
          <div className="ap-board-now" />
        </div>
      </div>
    </div>
    <div className="ap-match-card" aria-hidden="true">
      <div className="ap-match-card-who">
        <img src="/landing-assets/people/sarah-bernard.webp" alt="" width="48" height="48" />
        <div><strong>Dre Sarah Bernard</strong><span>Médecin remplaçante</span></div>
      </div>
      <ul>
        <li><Check /> Dates</li>
        <li><Check /> Lieu</li>
        <li><Check /> Logiciel</li>
      </ul>
      <p>Les critères s’alignent.</p>
    </div>
    <figcaption>Illustration · données fictives</figcaption>
  </figure>;
}
