import type { ProcessScene } from './process-navigation';
import { pilotActors, pilotDeliveries } from '../../content/process-pilot-geometry';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const mix = (a: number, b: number, p: number) => a + (b - a) * p;
function phase(time: number, from: number, to: number) {
  const t = clamp((time - from) / (to - from));
  return t * t * t * (t * (t * 6 - 15) + 10);
}
function tint(a: string, b: string, p: number) {
  return `rgb(${[1, 3, 5].map(i => Math.round(mix(parseInt(a.slice(i, i + 2), 16), parseInt(b.slice(i, i + 2), 16), p))).join(',')})`;
}
function opacity(element: SVGElement | HTMLElement, value: number) {
  element.style.opacity = String(value);
  element.style.visibility = value > .001 ? 'visible' : 'hidden';
}

type Pose = { x: number; y: number; scale: number; angle: number; alpha: number };
const INFORMATION_START = 14800;
const RECAP_START = INFORMATION_START + 10800;
const STATIC_TIMES = [0, INFORMATION_START + 7000, RECAP_START + 7200];
const documentTime = (time: number, index: number) => time - 200 - index * 2500;
function curve(points: number[], p: number) {
  const q = 1 - p;
  const axis = (i: number) => q ** 3 * points[i] + 3 * q ** 2 * p * points[i + 2] + 3 * q * p ** 2 * points[i + 4] + p ** 3 * points[i + 6];
  return { x: axis(0), y: axis(1) };
}
function documentPose(time: number, index: number, still: boolean): Pose {
  if (still) return { x: 260, y: 134 + index * 51, scale: 1, angle: [-2, 1, -1, 1, -1][index], alpha: 1 };
  const local = documentTime(time, index);
  const appear = phase(local, 0, 480);
  // Fold the same sheet into an envelope before shrinking and dispatching it.
  const shrink = phase(local, 2100, 2700);
  const departure = phase(local, 2200, 2700);
  const send = phase(local, 2700, 4400);
  const { route, recipient } = pilotDeliveries[index];
  const point = curve(route, send);
  const arrival = phase(local, 4120, 4470);
  const destination = pilotActors[recipient];
  return {
    x: send > 0 ? mix(point.x, destination.x, arrival) : mix(260, route[0], departure),
    y: send > 0 ? mix(point.y, destination.y, arrival) : mix(211 + 6 * (1 - appear), route[1], departure) - Math.sin(departure * Math.PI) * 12,
    scale: mix(mix(.96, 1, appear), .32, shrink) * (1 - .3 * arrival),
    angle: [-2, 1.5, -1.5, 2, -1][index] * (1 - shrink) + Math.sin(send * Math.PI) * (route[6] < route[0] ? -3 : 3),
    alpha: appear * (1 - phase(local, 4280, 4480)),
  };
}
function informationPose(time: number, index: number, still: boolean): Pose {
  if (still) {
    const points = [[164, 139, -7], [259, 231, 4], [348, 158, 8], [182, 293, -4], [333, 291, 5], [270, 95, -6]];
    return { x: points[index][0], y: points[index][1], angle: points[index][2], scale: 1, alpha: 1 };
  }
  // Each icon repeatedly departs from the holder and arrives at the locum.
  // Staggered departures leave space around the bare glyphs throughout the stream.
  const elapsed = Math.max(0, time - INFORMATION_START);
  const age = (elapsed + (5 - index) * 900) % 5400;
  const p = clamp(age / [3600, 3800, 3500, 3700, 3600, 3900][index]);
  const arch = Math.sin(Math.PI * p);
  const wave = [-93, 82, -52, 43, 112, -110][index];
  return {
    x: mix(112, 408, p),
    y: 207 + arch * wave + Math.sin(p * Math.PI * 2 + index) * arch * 12,
    scale: .86 + arch * .24,
    angle: Math.sin(p * Math.PI * 2 + index) * 8,
    alpha: phase(p, 0, .1) * (1 - phase(p, .86, 1)),
  };
}

export function createPilotProcessScene(): (ProcessScene & { destroy: () => void }) | undefined {
  const figure = document.querySelector<HTMLElement>('.ml-process-art--matching');
  if (!figure?.querySelector('.ml-pilot-tile')) return;
  const root = figure;
  const find = <T extends Element>(selector: string) => root.querySelector<T>(selector)!;
  const control = find<HTMLButtonElement>('.ml-sequence-control');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const daily = find<SVGGElement>('.ml-pilot-daily');
  const dailyRows = Array.from(daily.querySelectorAll<SVGGElement>('.ml-pilot-stat, .ml-pilot-day-row'));
  const cabinet = find<SVGGElement>('.ml-pilot-cabinet');
  const documentNote = find<SVGTextElement>('.ml-pilot-document-note');
  const copies = ['documents', 'information', 'daily'].map(state => Array.from(root.querySelectorAll<HTMLElement>(`[data-pilot-copy="${state}"]`)));
  const actors = Array.from(root.querySelectorAll<SVGGElement>('.ml-pilot-actor'));
  const tiles = Array.from(root.querySelectorAll<SVGGElement>('.ml-pilot-tile')).map(group => ({
    group,
    face: group.querySelector<SVGRectElement>('.ml-pilot-paper-face')!,
    back: group.querySelector<SVGRectElement>('.ml-pilot-paper-back')!,
    document: group.querySelector<SVGGElement>('.ml-pilot-document-content'),
    envelope: group.querySelector<SVGGElement>('.ml-pilot-envelope'),
    info: group.querySelector<SVGGElement>('.ml-pilot-info-content')!,
  }));
  const dailyPositions = [[260, 207, 412, 332], [165, 172, 174, 96], [355, 172, 174, 96], [260, 278, 352, 1], [260, 323, 352, 1], [260, 368, 352, 1]];
  let visible = !('IntersectionObserver' in window);
  let paused = false;
  let staticStage = 0;
  let lastTime = -1;

  function render(elapsed: number) {
    let time = motion.matches ? STATIC_TIMES[staticStage] : elapsed;
    // Documents and icons keep moving; only the completed recap has a reading hold.
    if (time >= RECAP_START + 4800) time = RECAP_START + 4800;
    if (time === lastTime) return;
    lastTime = time;
    const infoTime = time - INFORMATION_START;
    const recapTime = time - RECAP_START;
    const information = phase(infoTime, 0, 2100);
    const recap = phase(recapTime, 0, 2200);
    const infoTone = phase(infoTime, 100, 1500) * (1 - phase(recapTime, 200, 1700));
    const dark = infoTone;
    root.style.setProperty('--v2-surface', tint('#f5f2e9', '#153e34', dark));
    root.style.setProperty('--v2-ink', tint('#164c41', '#eef5e9', dark));
    root.style.setProperty('--v2-muted', tint('#577368', '#b6cbbb', dark));
    root.style.setProperty('--v2-thread', tint('#87a789', '#c7e89b', dark));
    root.style.setProperty('--pilot-em', tint('#618775', '#c7e89b', dark));
    root.style.setProperty('--pilot-actor-fill', tint('#fffef7', '#224b3e', dark));
    root.style.setProperty('--pilot-actor-stroke', tint('#b9c7ad', '#618363', dark));
    root.style.setProperty('--pilot-actor-ink', tint('#3d634d', '#e0eddb', dark));
    root.dataset.scene = recap > 0 ? recap === 1 ? 'daily' : 'daily-transition' : information > 0 ? information === 1 ? 'information' : 'information-transition' : 'documents';
    const copyProgress = [1 - phase(infoTime, 200, 750), phase(infoTime, 700, 1300) * (1 - phase(recapTime, 200, 750)), phase(recapTime, 700, 1500)];
    copies.forEach((elements, index) => elements.forEach(element => {
      opacity(element, copyProgress[index]);
      element.style.transform = `translateY(${(index ? 7 : -5) * (1 - copyProgress[index])}px)`;
      element.setAttribute('aria-hidden', String(copyProgress[index] < .5));
    }));
    opacity(documentNote, 1 - phase(infoTime, 0, 400));
    opacity(cabinet, phase(infoTime, 1100, 2100));
    actors.forEach(actor => {
      const id = actor.dataset.pilotActor as keyof typeof pilotActors;
      const order = id === 'order';
      const origin = pilotActors[id];
      const x = order ? origin.x : mix(origin.x, id === 'holder' ? 58 : 462, information);
      const y = mix(origin.y, order ? 12 : 207, information);
      actor.setAttribute('transform', `translate(${x} ${y}) scale(${order ? mix(1, .8, information) : 1 - recap * .12})`);
      if (!order) {
        const label = actor.querySelector<SVGTextElement>('.ml-pilot-actor-label')!;
        label.setAttribute('y', String(motion.matches && !information ? -51 : 63));
      }
      const receipt = Math.max(...pilotDeliveries.map(({ recipient }, index) => {
        const local = documentTime(time, index);
        return recipient === id ? phase(local, 4200, 4460) * (1 - phase(local, 4510, 4840)) : 0;
      }));
      opacity(actor.querySelector<SVGRectElement>('.ml-pilot-received')!, motion.matches ? 0 : receipt * (1 - information));
      opacity(actor, order ? 1 - phase(infoTime, 0, 900) : 1 - phase(recapTime, 0, 1000));
    });

    tiles.forEach(({ group, face, back, document, envelope, info }, index) => {
      const target = dailyPositions[index];
      const isDocuments = time < INFORMATION_START;
      const pose = isDocuments
        ? index < 5 ? documentPose(time, index, motion.matches) : { x: 260, y: 205, scale: 1, angle: 0, alpha: 0 }
        : informationPose(Math.min(time, RECAP_START), index, motion.matches);
      const gather = phase(recapTime, index * 50, 2200 + index * 50);
      const x = mix(pose.x, target[0], gather);
      const y = mix(pose.y, target[1], gather);
      const scale = mix(pose.scale, 1, gather);
      group.setAttribute('transform', `translate(${x} ${y}) rotate(${pose.angle * (1 - gather)}) scale(${scale})`);
      const streamArrival = isDocuments ? 1 : phase(infoTime, 200, 1500);
      opacity(group, mix(pose.alpha * streamArrival, 1, gather));
      const local = documentTime(time, index);
      const fold = isDocuments && !motion.matches ? phase(local, 1400, 2100) : 0;
      const width = isDocuments ? motion.matches ? 232 : mix(264, 210, fold) : mix(48, target[2], gather);
      const height = isDocuments ? motion.matches ? 46 : mix(114, 130, fold) : mix(48, target[3], gather);
      const radius = isDocuments ? mix(12, 5, fold) : mix(16, index === 0 ? 22 : index < 3 ? 13 : .5, gather);
      for (const [rect, offset] of [[face, 0], [back, mix(6, index < 3 ? 5 : 0, gather)]] as const) {
        rect.setAttribute('x', String(-width / 2 + (rect === back ? 3 * (1 - gather) : 0)));
        rect.setAttribute('y', String(-height / 2 + offset));
        rect.setAttribute('width', String(width));
        rect.setAttribute('height', String(height));
        rect.setAttribute('rx', String(radius));
      }
      face.style.fill = tint('#fffef7', index === 0 ? '#fffef7' : index < 3 ? '#eaf0df' : '#d9e1d0', gather);
      face.style.stroke = tint('#c4cfb9', '#d6dfcc', gather);
      // During information transfer there are no cards, shadows, or substitute couriers.
      const paperVisible = isDocuments ? 1 : phase(recapTime, 400, 1500);
      opacity(face, paperVisible);
      opacity(back, paperVisible * (index === 0 || isDocuments ? 1 : 1 - gather));
      if (document) {
        opacity(document, isDocuments ? 1 - phase(local, 1400, 1750) * (motion.matches ? 0 : 1) : 0);
        document.querySelector('.ml-relay-fold')!.setAttribute('d', `M${width / 2 - 24} ${-height / 2}v13q0 9 10 9h14`);
        document.querySelector('.ml-pilot-paper-title')!.setAttribute('y', String(motion.matches ? 10 : -4));
        document.querySelector('.ml-pilot-paper-title')!.setAttribute('x', String(motion.matches ? -68 : -80));
        document.querySelector('svg')!.setAttribute('y', String(motion.matches ? -12.5 : -25));
        document.querySelector('svg')!.setAttribute('x', String(motion.matches ? -103.5 : -115.5));
        opacity(document.querySelector<SVGGElement>('.ml-pilot-document-details')!, motion.matches ? 0 : 1);
        group.dataset.documentPhase = motion.matches ? 'overview' : local < 0 ? 'waiting' : local < 1400 ? 'reading' : local < 2100 ? 'folding' : local < 2700 ? 'shrinking' : local < 4400 ? 'sending' : 'received';
      }
      if (envelope) {
        opacity(envelope, fold);
        envelope.querySelector('.ml-pilot-envelope-seams')!.setAttribute('d', `M${-width / 2} ${height / 2}L-18 -4M${width / 2} ${height / 2}L18 -4`);
        const tip = mix(-height / 2, 16, phase(local, 1700, 2100));
        envelope.querySelector('.ml-pilot-envelope-flap')!.setAttribute('d', `M${-width / 2} ${-height / 2}L0 ${tip}L${width / 2} ${-height / 2}`);
      }
      opacity(info, isDocuments ? 0 : 1 - phase(recapTime, 150 + index * 40, 750 + index * 40));
    });
    opacity(daily, phase(recapTime, 1800, 2600));
    dailyRows.forEach((row, index) => {
      const arrival = phase(recapTime, 2200 + index * 350, 3200 + index * 350);
      opacity(row, arrival);
      row.setAttribute('transform', `translate(0 ${8 * (1 - arrival)})`);
    });
  }

  function updateControl() {
    const label = motion.matches ? ['Voir les informations pratiques', 'Voir le récapitulatif quotidien', 'Revoir les documents'][staticStage] : paused ? 'Reprendre l’animation' : 'Mettre l’animation en pause';
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
      staticStage = (staticStage + 1) % 3;
      lastTime = -1;
      render(0);
    } else paused = !paused;
    updateControl();
  }, { signal: events.signal });
  motion.addEventListener('change', () => {
    staticStage = lastTime >= RECAP_START + 2200 ? 2 : lastTime >= INFORMATION_START + 2100 ? 1 : 0;
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
    duration: RECAP_START + 8200, render, reset,
    canPlay: () => visible && !paused && !motion.matches,
    destroy() {
      events.abort();
      observer?.disconnect();
      control.hidden = true;
      delete root.dataset.sequenceReady;
    },
  };
}
