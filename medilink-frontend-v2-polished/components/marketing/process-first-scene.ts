import { discussionRoute, mapRoute, morphPath, pinOutline, straightRoute, tileOutline } from '@/content/process-sequence-geometry';
import type { FirstProcessScene } from './process-navigation';

const clamp = (value: number) => Math.max(0, Math.min(1, value));
const mix = (from: number, to: number, progress: number) => from + (to - from) * progress;
function ease(value: number) {
  const t = clamp(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}
const phase = (time: number, start: number, end: number) => ease((time - start) / (end - start));
function color(from: string, to: string, progress: number) {
  const channels = (value: string) => value.startsWith('#')
    ? [1, 3, 5].map(index => parseInt(value.slice(index, index + 2), 16))
    : value.match(/\d+/g)!.slice(0, 3).map(Number);
  const target = channels(to);
  return `rgb(${channels(from).map((value, index) => Math.round(mix(value, target[index], progress))).join(', ')})`;
}

export function createFirstProcessScene(): (FirstProcessScene & { destroy: () => void }) | undefined {
  const figure = document.querySelector<HTMLElement>('.ml-process-art--criteria');
  if (!figure?.querySelector('.ml-sequence-map')) return;
  const find = <T extends Element>(selector: string) => figure.querySelector<T>(selector)!;
  const map = find<SVGGElement>('.ml-sequence-map');
  const matching = find<SVGGElement>('.ml-sequence-match');
  const checklist = matching.querySelector<SVGGElement>('.ml-checklist')!;
  const checklistFace = checklist.querySelector<SVGRectElement>('.ml-checklist-face')!;
  const checklistBack = checklist.querySelector<SVGRectElement>('.ml-checklist-back')!;
  const unfold = matching.querySelector<SVGRectElement>('#ml-sequence-unfold rect')!;
  const checklistContent = Array.from(checklist.children).filter(element => !element.matches('.ml-checklist-face, .ml-checklist-back')) as SVGElement[];
  const network = matching.querySelector<SVGGElement>('.ml-v2-network')!;
  const grid = matching.querySelector<SVGRectElement>('.ml-v2-grid')!;
  const foot = matching.querySelector<SVGTextElement>('.ml-checklist-foot')!;
  const link = find<SVGPathElement>('.ml-sequence-link');
  const linkBed = find<SVGPathElement>('.ml-sequence-link-bed');
  const waypoints = find<SVGGElement>('.ml-sequence-waypoints');
  const reel = matching.querySelector<SVGGElement>('.ml-check-reel')!;
  const thumb = matching.querySelector<SVGPathElement>('.ml-check-scroll-thumb')!;
  const rows = Array.from(matching.querySelectorAll<SVGGElement>('.ml-check-row'));
  const mapCopy = Array.from(figure.querySelectorAll<HTMLElement>('.ml-sequence-copy--map'));
  const matchCopy = Array.from(figure.querySelectorAll<HTMLElement>('.ml-sequence-copy--match'));
  const discussionCopy = Array.from(figure.querySelectorAll<HTMLElement>('.ml-sequence-copy--discussion'));
  const discussion = find<SVGGElement>('.ml-sequence-discussion');
  const question = discussion.querySelector<SVGGElement>('.ml-sequence-question')!;
  const reply = discussion.querySelector<SVGGElement>('.ml-sequence-reply')!;
  const contract = discussion.querySelector<SVGGElement>('.ml-sequence-contract')!;
  const control = find<HTMLButtonElement>('.ml-sequence-control');
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  let paused = false;
  let visible = !('IntersectionObserver' in window);
  let staticStage = 0;
  let lastTime = -1;

  const actors = Array.from(figure.querySelectorAll<SVGGElement>('.ml-sequence-actor')).map(actor => {
    const cabinet = actor.dataset.entity === 'cabinet';
    return {
      actor, cabinet,
      face: actor.querySelector<SVGPathElement>('.ml-sequence-face')!,
      icon: actor.querySelector<SVGSVGElement>('svg')!,
      shadow: actor.querySelector<SVGEllipseElement>('ellipse')!,
      mapLabel: actor.querySelector<SVGTextElement>('.ml-sequence-label--map')!,
      matchLabel: actor.querySelector<SVGTextElement>('.ml-sequence-label--match')!,
      start: cabinet ? [112, 148] : [407, 253],
      end: cabinet ? [52, 206] : [468, 206],
    };
  });

  function copyVisibility(elements: HTMLElement[], opacity: number, offset: number, accessible: boolean) {
    elements.forEach(element => {
      element.style.opacity = String(opacity);
      element.style.visibility = opacity > .001 ? 'visible' : 'hidden';
      element.style.transform = `translateY(${offset}px)`;
      // The SVG's description tells the complete story without live announcements.
      if (element.tagName !== 'P') element.setAttribute('aria-hidden', String(!accessible));
    });
  }

  function render(elapsed: number) {
    let time = motion.matches ? [0, 10000, 20000][staticStage] : elapsed;
    // Hold the reading positions without rewriting the SVG on every frame.
    if (!motion.matches) {
      if (time >= 1500 && time < 2800) time = 1500;
      else if (time >= 5000 && time < 6440) time = 5000;
      else if (time >= 7400 && time < 8120) time = 7400;
      else if (time >= 9080 && time < 11000) time = 9080;
      else if (time >= 12900 && time < 14200) time = 12900;
      else if (time >= 15200 && time < 16500) time = 15200;
      else if (time >= 17500) time = 17500;
    }
    if (time === lastTime) return;
    lastTime = time;
    const travel = phase(time, 2800, 4700);
    const backdrop = phase(time, 2900, 3650);
    const mapExit = phase(time, 3000, 3700);
    const arrival = phase(time, 3150, 4150);
    const oldCopy = 1 - phase(time, 3100, 3450);
    const newCopy = phase(time, 3350, 3900);
    const chatTravel = phase(time, 11000, 12800);
    const chatBackdrop = phase(time, 11300, 12100);
    const criteriaExit = phase(time, 11000, 11500);
    const chatCopy = phase(time, 11600, 12300);
    const matchCopyExit = phase(time, 11300, 11700);
    figure!.dataset.scene = chatTravel > 0
      ? chatTravel === 1 ? 'discussion' : 'discussion-transition'
      : travel === 0 ? 'map' : travel === 1 ? 'criteria' : 'transition';
    figure!.style.setProperty('--v2-surface', color(color('#f1f5ef', '#153e34', backdrop), '#f5f2e9', chatBackdrop));
    figure!.style.setProperty('--v2-ink', color(color('#164c41', '#eef5e9', backdrop), '#164c41', chatBackdrop));
    figure!.style.setProperty('--v2-muted', color(color('#577368', '#b6cbbb', backdrop), '#577368', chatBackdrop));
    figure!.style.setProperty('--v2-thread', color(color('#7fa68a', '#c7e89b', backdrop), '#87a789', chatBackdrop));
    map.style.opacity = String(1 - mapExit);
    map.style.visibility = mapExit === 1 ? 'hidden' : 'visible';
    map.setAttribute('transform', `translate(260 200) scale(${1 - mapExit * .025}) translate(-260 -200)`);
    waypoints.style.opacity = String(1 - phase(time, 2700, 3300));
    matching.style.opacity = '1';
    matching.style.visibility = arrival > 0 ? 'visible' : 'hidden';
    network.style.opacity = String(arrival * (1 - chatTravel));
    grid.style.opacity = String(.6 * arrival);
    foot.style.opacity = String(arrival * (1 - criteriaExit));
    // Unfold an opaque sheet from the connecting line, so it never shines through the text.
    const sheetHeight = 341 * arrival;
    unfold.setAttribute('y', String(193.5 - sheetHeight / 2));
    unfold.setAttribute('height', String(sheetHeight));
    checklist.setAttribute('clip-path', arrival === 1 ? 'none' : 'url(#ml-sequence-unfold)');
    checklistContent.forEach(element => { element.style.opacity = String(phase(time, 3750, 4250) * (1 - criteriaExit)); });
    checklist.setAttribute('transform', `translate(260 ${200 + (1 - arrival) * 16}) scale(${mix(.98, 1, arrival)}) translate(-260 -200)`);
    // The actual checklist sheet contracts into the first message bubble.
    checklistFace.setAttribute('y', String(mix(31, 42, chatTravel)));
    checklistBack.setAttribute('y', String(mix(39, 48, chatTravel)));
    for (const paper of [checklistFace, checklistBack]) {
      paper.setAttribute('height', String(mix(317, 100, chatTravel)));
      paper.setAttribute('rx', String(mix(22, 18, chatTravel)));
    }
    checklistFace.style.fill = color('#f3f7eb', '#fffef7', chatTravel);
    checklistFace.style.stroke = color('#d5e5c2', '#b9c7ad', chatTravel);
    checklistBack.style.fill = color('#799972', '#dce2cf', chatTravel);
    const route = chatTravel > 0 ? morphPath(straightRoute, discussionRoute, chatTravel) : morphPath(mapRoute, straightRoute, travel);
    link.setAttribute('d', route);
    linkBed.setAttribute('d', route);
    linkBed.setAttribute('transform', `translate(0 ${travel * 6 * (1 - chatTravel)})`);
    link.style.stroke = color(color('#3d7f5d', '#c7e89b', travel), '#7c9d70', chatTravel);
    // Let the connecting thread disappear before the conversation takes over.
    link.style.opacity = String(1 - criteriaExit);
    link.style.strokeDasharray = '1';
    link.style.strokeDashoffset = String(motion.matches ? 0 : 1 - phase(time, 100, 1500));
    linkBed.style.stroke = color(color('#f8fcf4', '#071c16', travel), '#e2e6d7', chatTravel);
    linkBed.style.strokeWidth = String(mix(mix(7, 4, travel), 7, chatTravel));
    linkBed.style.opacity = String(mix(mix(1, .3, travel), 1, chatTravel) * (1 - criteriaExit));
    copyVisibility(mapCopy, oldCopy, -6 * (1 - oldCopy), newCopy < .5 && chatCopy < .5);
    copyVisibility(matchCopy, newCopy * (1 - matchCopyExit), 8 * (1 - newCopy) - 6 * matchCopyExit, newCopy >= .5 && chatCopy < .5);
    copyVisibility(discussionCopy, chatCopy, 8 * (1 - chatCopy), chatCopy >= .5);

    const questionArrival = phase(time, 12000, 12900);
    const replyArrival = phase(time, 14200, 15200);
    const contractArrival = phase(time, 16500, 17500);
    discussion.style.visibility = questionArrival > 0 ? 'visible' : 'hidden';
    discussion.style.opacity = '1';
    question.style.opacity = String(questionArrival);
    question.setAttribute('transform', `translate(0 ${6 * (1 - questionArrival)})`);
    reply.style.opacity = String(replyArrival);
    reply.setAttribute('transform', `translate(${14 * (1 - replyArrival)} 0)`);
    contract.style.opacity = String(contractArrival);
    contract.setAttribute('transform', `translate(0 ${10 * (1 - contractArrival)})`);

    actors.forEach(({ actor, cabinet, face, icon, shadow, mapLabel, matchLabel, start, end }) => {
      actor.setAttribute('transform', `translate(${mix(start[0], end[0], travel)} ${mix(mix(start[1], end[1], travel), cabinet ? 94 : 218, chatTravel)})`);
      face.setAttribute('d', morphPath(pinOutline, tileOutline, travel, true));
      face.style.fill = color(color(cabinet ? '#fffef8' : '#285b48', '#224b3e', travel), cabinet ? '#fffef7' : '#3a6550', chatTravel);
      face.style.stroke = color(color(cabinet ? '#83a379' : '#366a53', '#618363', travel), cabinet ? '#b9c7ad' : '#325d47', chatTravel);
      face.style.strokeWidth = String(mix(1.1, 1.2, travel));
      face.style.filter = `drop-shadow(0 ${5 * (1 - travel)}px ${5 * (1 - travel)}px rgb(40 79 40 / ${.15 * (1 - travel)}))`;
      shadow.style.opacity = String(1 - travel);
      const size = mix(27, 32, travel);
      icon.setAttribute('width', String(size));
      icon.setAttribute('height', String(size));
      icon.setAttribute('x', String(-size / 2));
      icon.setAttribute('y', String(-size / 2));
      icon.style.color = color(color(cabinet ? '#275843' : '#edf6df', '#e0eddb', travel), cabinet ? '#3d634d' : '#f1f5e9', chatTravel);
      mapLabel.setAttribute('y', String(mix(-42, 68, travel)));
      matchLabel.setAttribute('y', String(mix(-42, 68, travel)));
      mapLabel.style.opacity = String(1 - phase(travel, .02, .3));
      matchLabel.style.opacity = String(phase(travel, .7, 1));
      matchLabel.style.fill = color('#e0eddb', '#3d634d', chatTravel);
    });

    // The original four-row reading rhythm begins after the map has transformed.
    const reading = clamp((time - 5000) / 4800);
    const scroll = motion.matches ? 0 : -58 * (phase(reading, .3, .5) + phase(reading, .65, .85));
    reel.style.transform = `translateY(${scroll}px)`;
    thumb.style.transform = `translateY(${-scroll * 142 / 116}px)`;
    rows.forEach((row, index) => {
      row.style.transform = `translateY(${motion.matches ? 0 : index * 18}px)`;
      const checked = phase(time, 4200 + index * 65, 4650 + index * 65);
      row.querySelector<SVGElement>('.ml-check-badge')!.style.opacity = String(checked);
      row.querySelector<SVGElement>('svg')!.style.opacity = String(checked);
    });
  }

  function updateControl() {
    const label = motion.matches
      ? ['Voir les critères dans cette étape', 'Voir la discussion dans cette étape', 'Revoir la carte dans cette étape'][staticStage]
      : paused ? 'Reprendre l’animation' : 'Mettre l’animation en pause';
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
    staticStage = lastTime >= 12800 ? 2 : lastTime >= 4700 ? 1 : 0;
    lastTime = -1;
    render([0, 10000, 20000][staticStage]);
    updateControl();
  }, { signal: events.signal });

  let observer: IntersectionObserver | undefined;
  if ('IntersectionObserver' in window) {
    observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= .4);
    }, { threshold: [0, .4] });
    observer.observe(figure);
  }
  reset();
  control.hidden = false;
  figure.dataset.sequenceReady = 'true';
  return {
    duration: 22000,
    render,
    reset,
    canPlay: () => visible && !paused && !motion.matches,
    destroy() {
      events.abort();
      observer?.disconnect();
      control.hidden = true;
      delete figure.dataset.sequenceReady;
    },
  };
}
