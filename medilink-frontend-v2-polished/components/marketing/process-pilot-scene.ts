import type { ProcessScene } from './process-navigation';
import { pilotActors, pilotContactActors, pilotContactOrigin, pilotContactRoute, pilotDeliveries, pilotInformationActors } from '../../content/process-pilot-geometry';

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
const CONTACT_START = INFORMATION_START + 10800;
const STATIC_TIMES = [0, INFORMATION_START + 7000, CONTACT_START + 7200];
const documentTime = (time: number, index: number) => time - 200 - index * 2500;
function curve(points: number[], p: number) {
  const q = 1 - p;
  const axis = (i: number) => q ** 3 * points[i] + 3 * q ** 2 * p * points[i + 2] + 3 * q * p ** 2 * points[i + 4] + p ** 3 * points[i + 6];
  return { x: axis(0), y: axis(1) };
}
function documentPose(time: number, index: number, still: boolean): Pose {
  if (still) return { x: 260, y: 132 + index * 47, scale: 1, angle: 0, alpha: 1 };
  const local = documentTime(time, index);
  const appear = phase(local, 0, 480);
  // Fold the same sheet into an envelope before shrinking and dispatching it.
  const shrink = phase(local, 2050, 2470);
  const departure = phase(local, 2130, 2470);
  const send = phase(local, 2470, 4230);
  const { route, recipient } = pilotDeliveries[index];
  const point = curve(route, send);
  const arrival = phase(local, 4050, 4400);
  const destination = pilotActors[recipient];
  return {
    x: send > 0 ? mix(point.x, destination.x, arrival) : mix(260, route[0], departure),
    y: send > 0 ? mix(point.y, destination.y, arrival) : mix(214 + 8 * (1 - appear), route[1], departure) - Math.sin(departure * Math.PI) * 8,
    scale: mix(mix(.96, 1, appear), .32, shrink) * (1 - .3 * arrival),
    angle: [-2, 1.5, -1.5, 2, -1][index] * (1 - shrink) + Math.sin(send * Math.PI) * (route[6] < route[0] ? -3 : 3),
    alpha: appear * (1 - phase(local, 4280, 4480)),
  };
}
function informationPose(time: number, index: number, still: boolean): Pose {
  if (still) {
    const points = [[173, 123, -4], [261, 186, 0], [343, 116, 3], [173, 279, -3], [341, 271, 3], [261, 328, 0]];
    return { x: points[index][0], y: points[index][1], angle: points[index][2], scale: 1, alpha: 1 };
  }
  // Two waves of three glyphs share three broad arcs. Only the gentle arch
  // varies between lanes; the stream has a common pace and direction.
  const elapsed = Math.max(0, time - INFORMATION_START);
  const delay = Math.floor(index / 3) * 4300 + (index % 3) * 620;
  const age = (elapsed - delay + 17200) % 8600;
  const p = clamp(age / 5500);
  const arch = Math.sin(Math.PI * p);
  const wave = [-85, 0, 100][index % 3];
  return {
    x: mix(pilotInformationActors.holder.x + 39, pilotInformationActors.locum.x - 39, p),
    y: mix(pilotInformationActors.holder.y, pilotInformationActors.locum.y, p) + arch * wave,
    scale: .78 + arch * .42,
    angle: Math.sin(p * Math.PI * 2) * 3,
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
  const contact = find<SVGGElement>('.ml-pilot-contact');
  const messages = Array.from(contact.querySelectorAll<SVGGElement>('.ml-pilot-contact-message'));
  const link = find<SVGPathElement>('.ml-pilot-contact-link');
  const pulse = find<SVGCircleElement>('.ml-pilot-contact-pulse');
  const cabinet = find<SVGGElement>('.ml-pilot-cabinet');
  const documentNote = find<SVGTextElement>('.ml-pilot-document-note');
  const copies = ['documents', 'information', 'contact'].map(state => Array.from(root.querySelectorAll<HTMLElement>(`[data-pilot-copy="${state}"]`)));
  const actors = Array.from(root.querySelectorAll<SVGGElement>('.ml-pilot-actor'));
  const tiles = Array.from(root.querySelectorAll<SVGGElement>('.ml-pilot-tile')).map(group => ({
    group,
    face: group.querySelector<SVGRectElement>('.ml-pilot-paper-face')!,
    back: group.querySelector<SVGRectElement>('.ml-pilot-paper-back')!,
    document: group.querySelector<SVGGElement>('.ml-pilot-document-content'),
    envelope: group.querySelector<SVGGElement>('.ml-pilot-envelope'),
    info: group.querySelector<SVGGElement>('.ml-pilot-info-content')!,
  }));
  let visible = !('IntersectionObserver' in window);
  let paused = false;
  let staticStage = 0;
  let lastTime = -1;

  function render(elapsed: number) {
    let time = motion.matches ? STATIC_TIMES[staticStage] : elapsed;
    // Documents and icons keep moving; the conversation has a final reading hold.
    if (time >= CONTACT_START + 4800) time = CONTACT_START + 4800;
    if (time === lastTime) return;
    lastTime = time;
    const infoTime = time - INFORMATION_START;
    const contactTime = time - CONTACT_START;
    const information = phase(infoTime, 0, 2100);
    const contactProgress = phase(contactTime, 0, 2200);
    const infoTone = phase(infoTime, 100, 1700) * (1 - phase(contactTime, 200, 1900));
    root.style.setProperty('--v2-surface', tint('#f5f2e9', '#edf2e7', infoTone));
    root.dataset.scene = contactProgress > 0 ? contactProgress === 1 ? 'contact' : 'contact-transition' : information > 0 ? information === 1 ? 'information' : 'information-transition' : 'documents';
    const copyProgress = [1 - phase(infoTime, 200, 750), phase(infoTime, 700, 1300) * (1 - phase(contactTime, 200, 750)), phase(contactTime, 700, 1500)];
    copies.forEach((elements, index) => elements.forEach(element => {
      opacity(element, copyProgress[index]);
      element.style.transform = `translateY(${(index ? 7 : -5) * (1 - copyProgress[index])}px)`;
      element.setAttribute('aria-hidden', String(copyProgress[index] < .5));
    }));
    opacity(documentNote, 1 - phase(infoTime, 0, 400));
    opacity(cabinet, phase(infoTime, 1100, 2100) * (1 - phase(contactTime, 0, 700)));
    actors.forEach(actor => {
      const id = actor.dataset.pilotActor as keyof typeof pilotActors;
      const order = id === 'order';
      const origin = pilotActors[id];
      const target = order ? { x: origin.x, y: origin.y - 10 } : pilotInformationActors[id];
      const settle = phase(contactTime, 150, 1750);
      const destination = order ? target : pilotContactActors[id];
      const x = mix(mix(origin.x, target.x, information), destination.x, settle);
      const y = mix(mix(origin.y, target.y, information), destination.y, settle);
      actor.setAttribute('transform', `translate(${x} ${y}) scale(${order ? 1 : mix(1, 1.2, settle)})`);
      if (!order) {
        const label = actor.querySelector<SVGTextElement>('.ml-pilot-actor-label')!;
        const informationLabel = id === 'locum' ? mix(75, -47, information) : mix(75, 58, information);
        label.setAttribute('y', String(mix(informationLabel, 58, settle)));
      }
      const receipt = Math.max(...pilotDeliveries.map(({ recipient }, index) => {
        const local = documentTime(time, index);
        return recipient === id ? phase(local, 4200, 4460) * (1 - phase(local, 4510, 4840)) : 0;
      }));
      opacity(actor.querySelector<SVGRectElement>('.ml-pilot-received')!, motion.matches ? 0 : receipt * (1 - information));
      opacity(actor, order ? 1 - phase(infoTime, 0, 900) : 1);
    });

    tiles.forEach(({ group, face, back, document, envelope, info }, index) => {
      const target = pilotContactOrigin;
      const isDocuments = time < INFORMATION_START;
      const pose = isDocuments
        ? index < 5 ? documentPose(time, index, motion.matches) : { x: 260, y: 205, scale: 1, angle: 0, alpha: 0 }
        : informationPose(Math.min(time, CONTACT_START), index, motion.matches);
      const gather = phase(contactTime, 200 + index * 60, 1600 + index * 60);
      const x = mix(pose.x, target.x, gather);
      const y = mix(pose.y, target.y, gather);
      const scale = mix(pose.scale, .12, gather);
      group.setAttribute('transform', `translate(${x} ${y}) rotate(${pose.angle * (1 - gather)}) scale(${scale})`);
      const streamArrival = isDocuments ? 1 : phase(infoTime, 200, 1500);
      opacity(group, pose.alpha * streamArrival * (1 - phase(contactTime, 700 + index * 60, 1500 + index * 60)));
      const local = documentTime(time, index);
      const fold = isDocuments && !motion.matches ? phase(local, 1500, 2050) : 0;
      const width = isDocuments ? motion.matches ? 232 : mix(232, 194, fold) : 58;
      const height = isDocuments ? motion.matches ? 42 : mix(194, 118, fold) : 58;
      const radius = isDocuments ? motion.matches ? 4 : mix(8, 4, fold) : .5;
      for (const [rect, offset] of [[face, 0], [back, 3]] as const) {
        rect.setAttribute('x', String(-width / 2));
        rect.setAttribute('y', String(-height / 2 + offset));
        rect.setAttribute('width', String(width));
        rect.setAttribute('height', String(height));
        rect.setAttribute('rx', String(radius));
      }
      face.style.fill = isDocuments ? tint('#fffef9', '#e9efdf', fold) : '#fffef9';
      face.style.stroke = isDocuments ? '#c4d0b8' : 'none';
      // Practical icons clear the space while the same two doctors stay present.
      const paperVisible = isDocuments ? 1 : 0;
      opacity(face, paperVisible);
      opacity(back, isDocuments && !motion.matches ? .35 : 0);
      if (document) {
        opacity(document, isDocuments ? 1 - phase(local, 1500, 1780) * (motion.matches ? 0 : 1) : 0);
        const corner = document.querySelector<SVGPathElement>('.ml-pilot-paper-fold')!;
        corner.setAttribute('d', `M${width / 2 - 20} ${-height / 2}v11q0 9 9 9h11`);
        opacity(corner, motion.matches ? 0 : 1);
        document.querySelector('.ml-pilot-paper-title')!.setAttribute('y', String(motion.matches ? 10 : -20));
        document.querySelector('.ml-pilot-paper-title')!.setAttribute('x', String(motion.matches ? -68 : -86));
        document.querySelector('svg')!.setAttribute('y', String(motion.matches ? -12.5 : -85));
        document.querySelector('svg')!.setAttribute('x', String(motion.matches ? -103.5 : -98.5));
        opacity(document.querySelector<SVGGElement>('.ml-pilot-document-details')!, motion.matches ? 0 : 1);
        group.dataset.documentPhase = motion.matches ? 'overview' : local < 0 ? 'waiting' : local < 1500 ? 'reading' : local < 2050 ? 'folding' : local < 2470 ? 'shrinking' : local < 4230 ? 'sending' : 'received';
      }
      if (envelope) {
        opacity(envelope, fold);
        envelope.querySelector('.ml-pilot-envelope-seams')!.setAttribute('d', `M${-width / 2} ${height / 2}L-18 -4M${width / 2} ${height / 2}L18 -4`);
        const tip = mix(-height / 2, 14, phase(local, 1670, 2050));
        envelope.querySelector('.ml-pilot-envelope-flap')!.setAttribute('d', `M${-width / 2} ${-height / 2}L0 ${tip}L${width / 2} ${-height / 2}`);
      }
      opacity(info, isDocuments ? 0 : 1);
    });
    opacity(contact, phase(contactTime, 900, 1600));
    messages.forEach((row, index) => {
      const arrival = phase(contactTime, 1300 + index * 1400, 2200 + index * 1400);
      opacity(row, arrival);
      row.setAttribute('transform', `translate(${(index ? 12 : -12) * (1 - arrival)} ${6 * (1 - arrival)})`);
    });
    link.style.strokeDasharray = '1';
    link.style.strokeDashoffset = String(1 - phase(contactTime, 1600, 2500));
    const reply = contactTime >= 2900;
    const progress = phase(contactTime, reply ? 2900 : 1900, reply ? 4100 : 2750);
    const point = curve(pilotContactRoute, reply ? 1 - progress : progress);
    pulse.setAttribute('cx', String(point.x));
    pulse.setAttribute('cy', String(point.y));
    opacity(pulse, motion.matches ? 0 : Math.sin(progress * Math.PI) * .85);
  }

  function updateControl() {
    const label = motion.matches ? ['Voir les informations pratiques', 'Voir le lien entre médecins', 'Revoir les documents'][staticStage] : paused ? 'Reprendre l’animation' : 'Mettre l’animation en pause';
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
    staticStage = lastTime >= CONTACT_START + 2200 ? 2 : lastTime >= INFORMATION_START + 2100 ? 1 : 0;
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
    duration: CONTACT_START + 8200, render, reset,
    canPlay: () => visible && !paused && !motion.matches,
    destroy() {
      events.abort();
      observer?.disconnect();
      control.hidden = true;
      delete root.dataset.sequenceReady;
    },
  };
}
