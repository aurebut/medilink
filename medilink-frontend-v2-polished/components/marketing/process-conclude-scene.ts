import type { ProcessScene } from './process-navigation';
import { conclusionActors, conclusionSheets, paymentRoute } from '../../content/process-conclude-geometry';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
function phase(time: number, from: number, to: number) {
  const p = clamp((time - from) / (to - from));
  return p * p * p * (p * (p * 6 - 15) + 10);
}
function tint(from: string, to: string, p: number) {
  return `rgb(${[1, 3, 5].map(i => Math.round(mix(parseInt(from.slice(i, i + 2), 16), parseInt(to.slice(i, i + 2), 16), p))).join(',')})`;
}
function opacity(element: SVGElement | HTMLElement, value: number) {
  element.style.opacity = String(value);
  element.style.visibility = value > .001 ? 'visible' : 'hidden';
}

const SUMMARY_START = 9400;
const SUMMARY_READY = 13200;
const DURATION = 19000;
const STATIC_TIMES = [5000, 18000];
const departure = (index: number) => 2200 + index * 1900;

function notePose(time: number, index: number, still: boolean) {
  if (still && time < SUMMARY_START) return { x: [188, 260, 332][index], y: [186, 167, 186][index], scale: 1, angle: [-8, 0, 8][index] };
  const progress = phase(time - departure(index), 0, 2600);
  // The first note waits just outside the sender, ready to depart. Received
  // notes tuck behind the recipient, then re-emerge as the actual report pages.
  const p = index === 0 ? mix(.15, 1, progress) : progress;
  const q = 1 - p;
  const axis = (i: number) => q ** 3 * paymentRoute[i] + 3 * q ** 2 * p * paymentRoute[i + 2] + 3 * q * p ** 2 * paymentRoute[i + 4] + p ** 3 * paymentRoute[i + 6];
  return {
    x: axis(0), y: axis(1),
    scale: mix(.44, 1, phase(p, 0, .23)) * (1 - .56 * phase(p, .78, 1)),
    angle: Math.sin(p * Math.PI) * [-6, 4, -4][index],
  };
}

export function createConcludeProcessScene(): (ProcessScene & { destroy: () => void }) | undefined {
  const figure = document.querySelector<HTMLElement>('.ml-process-art--report');
  if (!figure?.querySelector('.ml-close-sheet')) return;
  const root = figure;
  const find = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const control = find<HTMLButtonElement>('.ml-sequence-control');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const route = find<SVGGElement>('.ml-close-payment-path');
  const summary = find<SVGGElement>('.ml-close-summary');
  const summaryRows = Array.from(summary.querySelectorAll<SVGGElement>('.ml-close-summary-head, .ml-close-total, .ml-close-summary-row'));
  const status = find<SVGGElement>('.ml-close-status');
  const statusFace = find<SVGRectElement>('.ml-close-status-face');
  const statusLabels = find<SVGGElement>('.ml-close-status-labels');
  const statusClock = find<SVGGElement>('.ml-close-status-clock');
  const statusCheck = find<SVGGElement>('.ml-close-status-check');
  const checkPath = statusCheck.querySelector('path')!;
  const statuses = ['pending', 'validated', 'received'].map(key => find<SVGTextElement>(`[data-payment-status="${key}"]`));
  const copies = ['payment', 'summary'].map(key => Array.from(root.querySelectorAll<HTMLElement>(`[data-close-copy="${key}"]`)));
  const actors = Array.from(root.querySelectorAll<SVGGElement>('.ml-close-actor')).map(group => ({ group, halo: group.querySelector<SVGRectElement>('.ml-close-actor-halo')! }));
  const sheets = Array.from(root.querySelectorAll<SVGGElement>('.ml-close-sheet')).map(group => ({
    group,
    face: group.querySelector<SVGRectElement>('.ml-close-sheet-face')!,
    shadow: group.querySelector<SVGRectElement>('.ml-close-sheet-shadow')!,
    ink: group.querySelector<SVGGElement>('.ml-close-banknote-ink')!,
  }));
  let visible = !('IntersectionObserver' in window);
  let paused = false;
  let staticStage = 0;
  let lastTime = -1;

  function render(elapsed: number) {
    const time = motion.matches ? STATIC_TIMES[staticStage] : Math.min(elapsed, SUMMARY_READY + 500);
    if (time === lastTime) return;
    lastTime = time;
    const unfold = phase(time, SUMMARY_START, 12100);
    const paperTone = phase(time, 9600, 11700);
    root.dataset.scene = time < SUMMARY_START ? 'payment' : time < SUMMARY_READY ? 'summary-transition' : 'summary';
    root.dataset.payment = time < 1900 ? 'pending' : time < 8800 ? 'validated' : 'received';
    root.style.setProperty('--v2-surface', tint('#153e34', '#f5f2e9', paperTone));
    root.style.setProperty('--v2-ink', tint('#eef5e9', '#164c41', paperTone));
    root.style.setProperty('--v2-muted', tint('#b6cbbb', '#577368', paperTone));
    root.style.setProperty('--v2-thread', tint('#c7e89b', '#87a789', paperTone));
    root.style.setProperty('--close-em', tint('#c7e89b', '#618775', paperTone));
    root.style.setProperty('--close-summary-em', tint('#164c41', '#618775', phase(time, 11100, 11900)));
    const copyProgress = [1 - phase(time, 9800, 10300), phase(time, 10300, 11000)];
    copies.forEach((elements, index) => elements.forEach(element => {
      opacity(element, copyProgress[index]);
      element.style.transform = `translateY(${(index ? 7 : -5) * (1 - copyProgress[index])}px)`;
      element.setAttribute('aria-hidden', String(copyProgress[index] < .5));
    }));
    opacity(route, 1 - phase(time, 9400, 10100));
    actors.forEach(({ group, halo }) => {
      const id = group.dataset.closeActor as keyof typeof conclusionActors;
      const [x, y] = conclusionActors[id];
      group.setAttribute('transform', `translate(${x + (id === 'doctor' ? 20 : -20) * unfold} ${y}) scale(${1 - unfold * .12})`);
      opacity(group, 1 - phase(time, 9750, 10800));
      const receipt = Math.max(...sheets.map((_, i) => phase(time - departure(i), 2500, 2800) * (1 - phase(time - departure(i), 3000, 3300))));
      opacity(halo, id === 'doctor' && !motion.matches ? receipt : 0);
    });

    sheets.forEach(({ group, face, shadow, ink }, index) => {
      const pose = notePose(time, index, motion.matches);
      const target = conclusionSheets[index];
      const open = phase(time, SUMMARY_START + index * 100, 11700 + index * 200);
      const width = mix(128, target.width, open);
      const height = mix(70, target.height, open);
      const x = mix(pose.x, target.x, open);
      const y = mix(pose.y, target.y, open);
      const angle = mix(pose.angle, target.angle, open);
      const scale = mix(pose.scale, 1, open);
      group.setAttribute('transform', `translate(${x} ${y}) rotate(${angle}) scale(${scale})`);
      if (index === 2) {
        // The content stays attached to the opening front page, without stretching type.
        const textScale = Math.min(width / target.width, height / target.height) * scale;
        summary.setAttribute('transform', `translate(${x} ${y}) rotate(${angle}) scale(${textScale}) translate(-260 -211)`);
      }
      for (const [rect, offset] of [[face, 0], [shadow, 5]] as const) {
        rect.setAttribute('x', String(-width / 2 + (rect === shadow ? 3 : 0)));
        rect.setAttribute('y', String(-height / 2 + offset));
        rect.setAttribute('width', String(width));
        rect.setAttribute('height', String(height));
        rect.setAttribute('rx', String(mix(8, 18, open)));
      }
      face.style.fill = tint('#eef4df', ['#dce5cc', '#e5eccc', '#fffef7'][index], open);
      face.style.stroke = tint('#b6cb99', '#cdd7bf', open);
      shadow.style.fill = tint('#08281c', '#728663', open);
      opacity(shadow, index === 2 ? .2 : .2 * (1 - open));
      opacity(ink, 1 - phase(time, 9600 + index * 80, 10400 + index * 80));
      group.dataset.notePhase = time >= SUMMARY_START ? open === 1 ? 'summary' : 'unfolding' : time < departure(index) ? 'waiting' : time < departure(index) + 2600 ? 'transferring' : 'received';
    });

    // The payment check becomes the small completion seal on the report.
    const compact = phase(time, 9550, 10150);
    const seal = phase(time, 10100, 12000);
    status.setAttribute('transform', `translate(${mix(260, 429, seal) + Math.sin(seal * Math.PI) * 50} ${mix(329, 83, seal)})`);
    const sealWidth = mix(248, 28, compact);
    const sealHeight = mix(46, 28, compact);
    statusFace.setAttribute('x', String(-sealWidth / 2));
    statusFace.setAttribute('y', String(-sealHeight / 2));
    statusFace.setAttribute('width', String(sealWidth));
    statusFace.setAttribute('height', String(sealHeight));
    statusFace.setAttribute('rx', String(sealHeight / 2));
    statusFace.style.fill = tint('#244c3e', '#e0ecd2', seal);
    statusFace.style.stroke = tint('#57765a', '#c8d8b8', seal);
    status.style.color = tint('#c7e89b', '#416b48', seal);
    statusCheck.setAttribute('transform', `translate(${mix(-99, 0, compact)} 0)`);
    opacity(statusLabels, 1 - phase(time, 9450, 9750));
    opacity(statusClock, 1 - phase(time, 1450, 1800));
    opacity(statusCheck, phase(time, 1520, 1800));
    checkPath.style.strokeDasharray = '1';
    checkPath.style.strokeDashoffset = String(1 - phase(time, 1500, 2050));
    const paymentProgress = [1 - phase(time, 1400, 1650), phase(time, 1650, 1900) * (1 - phase(time, 8400, 8700)), phase(time, 8700, 9000)];
    statuses.forEach((label, index) => opacity(label, paymentProgress[index]));
    opacity(summary, phase(time, 10800, 11500));
    summaryRows.forEach((row, index) => {
      const reveal = phase(time, 10900 + index * 220, 11600 + index * 250);
      opacity(row, reveal);
      row.setAttribute('transform', `translate(0 ${7 * (1 - reveal)})`);
    });
  }

  function updateControl() {
    const label = motion.matches ? staticStage ? 'Revoir le paiement' : 'Voir le bilan de la mission' : paused ? 'Reprendre l’animation' : 'Mettre l’animation en pause';
    control.setAttribute('aria-label', label);
    control.title = label;
    control.dataset.mode = motion.matches ? 'static' : paused ? 'paused' : 'playing';
  }
  function reset() {
    paused = false;
    staticStage = 0;
    lastTime = -1;
    render(0);
    updateControl();
  }
  control.addEventListener('click', () => {
    if (motion.matches) {
      staticStage = (staticStage + 1) % 2;
      lastTime = -1;
      render(0);
    } else paused = !paused;
    updateControl();
  }, { signal: events.signal });
  motion.addEventListener('change', () => {
    staticStage = lastTime >= SUMMARY_READY ? 1 : 0;
    lastTime = -1;
    render(STATIC_TIMES[staticStage]);
    updateControl();
  }, { signal: events.signal });
  let observer: IntersectionObserver | undefined;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .4);
    }, { threshold: [0, .4] });
    observer.observe(root);
  }
  reset();
  control.hidden = false;
  root.dataset.sequenceReady = 'true';
  return {
    duration: DURATION, render, reset,
    canPlay: () => visible && !paused && !motion.matches,
    destroy() {
      events.abort();
      observer?.disconnect();
      control.hidden = true;
      delete root.dataset.sequenceReady;
    },
  };
}
