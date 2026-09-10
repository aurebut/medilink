import type { ProcessScene } from './process-navigation';
import { conclusionActors, conclusionPaper, conclusionSheets, paymentRoute } from '../../content/process-conclude-geometry';

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
const SUMMARY_READY = 14000;
const DURATION = 19000;
const STATIC_TIMES = [5000, 18000];
const departure = (index: number) => 2100 + (2 - index) * 340;
const TRANSFER_DURATION = 3900;
const noteColors = ['#e0e8d4', '#baceb0', '#315f4d'];

function notePose(time: number, index: number, still: boolean) {
  if (still && time < SUMMARY_START) return { x: [225, 253, 281][index], y: [196, 178, 160][index], scale: 1, angle: [-15, -11, -7][index] };
  const progress = phase(time - departure(index), 0, TRANSFER_DURATION);
  // Notes retain a visible edge beside the recipient, keeping the connection
  // between the completed payment and the emerging report legible.
  const p = mix(index === 2 ? .12 : 0, .9 - index * .025, progress);
  const q = 1 - p;
  const axis = (i: number) => q ** 3 * paymentRoute[i] + 3 * q ** 2 * p * paymentRoute[i + 2] + 3 * q * p ** 2 * paymentRoute[i + 4] + p ** 3 * paymentRoute[i + 6];
  return {
    x: axis(0), y: axis(1),
    scale: mix(.32, 1, phase(p, 0, .3)) * (1 - .35 * phase(p, .72, .9)),
    angle: -Math.sin(p * Math.PI) * [17, 13, 9][index],
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
  const statusClock = find<SVGGElement>('.ml-close-status-clock');
  const statusCheck = find<SVGGElement>('.ml-close-status-check');
  const checkPath = statusCheck.querySelector('path')!;
  const statuses = ['pending', 'validated', 'received'].map(key => find<SVGTextElement>(`[data-payment-status="${key}"]`));
  const days = Array.from(root.querySelectorAll<SVGPathElement>('.ml-close-days path'));
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
    const unfold = phase(time, SUMMARY_START, 13000);
    root.dataset.scene = time < SUMMARY_START ? 'payment' : time < SUMMARY_READY ? 'summary-transition' : 'summary';
    root.dataset.payment = time < 1900 ? 'pending' : time < 8200 ? 'validated' : 'received';
    const copyProgress = [1 - phase(time, 9650, 10350), phase(time, 10400, 11300)];
    copies.forEach((elements, index) => elements.forEach(element => {
      opacity(element, copyProgress[index]);
      element.style.transform = `translateY(${(index ? 7 : -5) * (1 - copyProgress[index])}px)`;
      element.setAttribute('aria-hidden', String(copyProgress[index] < .5));
    }));
    opacity(route, 1 - phase(time, 9400, 10100));
    actors.forEach(({ group, halo }) => {
      const id = group.dataset.closeActor as keyof typeof conclusionActors;
      const [x, y] = conclusionActors[id];
      group.setAttribute('transform', `translate(${x + (id === 'doctor' ? 12 : -12) * unfold} ${y})`);
      opacity(group, 1 - phase(time, 9400, 10200));
      const receipt = phase(time, 7950, 8300) * (1 - phase(time, 8900, 9600)) * .65;
      opacity(halo, id === 'doctor' && !motion.matches ? receipt : 0);
    });

    sheets.forEach(({ group, face, shadow, ink }, index) => {
      const pose = notePose(time, index, motion.matches);
      const target = conclusionSheets[index];
      // The received banknotes return as a single fan, then stretch into the
      // editorial rules. No replacement card or duplicate paper is introduced.
      const gather = phase(time, 9550 + index * 80, 10900 + index * 80);
      const fold = phase(time, 10700 + index * 100, 11500 + index * 100);
      const open = phase(time, 11200 + index * 100, 12800 + index * 200);
      const width = mix(164, target.width, open);
      const height = mix(94, target.height, fold);
      const x = mix(mix(pose.x, 244 + index * 16, gather), target.x, open);
      const y = mix(mix(pose.y, 194 - index * 10, gather), target.y, open);
      const angle = mix(mix(pose.angle, [-12, -7, -2][index], gather), target.angle, open);
      const scale = mix(mix(pose.scale, .95, gather), 1, open);
      group.setAttribute('transform', `translate(${x} ${y}) rotate(${angle}) scale(${scale})`);
      for (const [rect, offset] of [[face, 0], [shadow, 3]] as const) {
        rect.setAttribute('x', String(-width / 2));
        rect.setAttribute('y', String(-height / 2 + offset));
        rect.setAttribute('width', String(width));
        rect.setAttribute('height', String(height));
        rect.setAttribute('rx', String(mix(10, .5, fold)));
      }
      face.style.fill = tint(noteColors[index], '#c5d1bb', fold);
      face.style.stroke = tint(['#afc39d', '#a5bb96', '#315f4d'][index], '#c5d1bb', fold);
      face.style.strokeWidth = String(1 - fold);
      opacity(shadow, .09 * (1 - fold));
      opacity(ink, 1 - phase(time, 10500 + index * 80, 11100 + index * 80));
      group.dataset.notePhase = time >= SUMMARY_START ? open === 1 ? 'summary' : 'unfolding' : time < departure(index) ? 'waiting' : time < departure(index) + TRANSFER_DURATION ? 'transferring' : 'received';
    });

    // The existing confirmation simply aligns with the final report's text.
    const seal = phase(time, 11200, 13200);
    status.setAttribute('transform', `translate(${mix(151, conclusionPaper.sealX, seal)} ${mix(354, conclusionPaper.sealY, seal)})`);
    opacity(statusClock, 1 - phase(time, 1450, 1800));
    opacity(statusCheck, phase(time, 1520, 1800));
    checkPath.style.strokeDasharray = '1';
    checkPath.style.strokeDashoffset = String(1 - phase(time, 1500, 2050));
    const paymentProgress = [1 - phase(time, 1400, 1650), phase(time, 1650, 1900) * (1 - phase(time, 7950, 8200)), phase(time, 8200, 8500)];
    statuses.forEach((label, index) => opacity(label, paymentProgress[index]));
    opacity(summary, phase(time, 12400, 13100));
    summaryRows.forEach((row, index) => {
      const reveal = phase(time, 12300 + index * 210, 13100 + index * 260);
      opacity(row, reveal);
      row.setAttribute('transform', `translate(0 ${7 * (1 - reveal)})`);
    });
    days.forEach((day, index) => {
      const reveal = phase(time, 13200 + index * 100, 13700 + index * 100);
      opacity(day, reveal);
      day.style.strokeDasharray = '1';
      day.style.strokeDashoffset = String(1 - reveal);
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
