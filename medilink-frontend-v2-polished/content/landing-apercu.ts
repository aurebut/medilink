import { landingContent } from './landing-content';

// Content for the /apercu-design preview only: a lighter copy and two decorative additions, all
// derived from the homepage markup by structure, so the homepage itself is unchanged and later
// copy edits carry over.
// A cut that no longer matches fails the build instead of silently restoring the text.
function cut(html: string, pattern: RegExp, replacement: string, expected: number, label: string) {
  const found = html.match(pattern)?.length ?? 0;
  if (found !== expected) throw new Error(`landing-apercu: ${label} matched ${found} time(s), expected ${expected}`);
  return html.replace(pattern, replacement);
}

let html = landingContent.home;

// Hero: keep the first sentence of the introduction.
html = cut(html, /(<p class="hero-sub">[^<.]*\.)[^<]*(<\/p>)/g, '$1$2', 1, 'hero introduction');
// Process: the numbered tabs already name each step.
html = cut(html, /<span class="ml-process-kicker">\d\d · [^<]*<\/span>/g, '', 3, 'step labels');
// Contributors: the heading carries the message.
html = cut(html, /(<h2 id="ml-testimonials-title">[\s\S]*?<\/h2>)\s*<p>[^<]*<\/p>/g, '$1', 1, 'contributors introduction');
// Mission tracking and documents: three titled points, without their sentences.
html = cut(html, /(<li><span aria-hidden="true">\d\d<\/span><div><h3>[^<]*<\/h3>)<p>[^<]*<\/p>/g, '$1', 6, 'tracking and documents points');
// Exchanges: same treatment.
html = cut(html, /(<p><span aria-hidden="true">\d\d<\/span><strong>[^<]*<\/strong>)[^<]*(<\/p>)/g, '$1$2', 3, 'exchange points');
// Audiences: one sentence each, without the "Parcours n sur 2" counter.
html = cut(html, /<span>Parcours \d sur 2<\/span>/g, '', 2, 'audience counters');
html = cut(html, /(<article class="audience-card reveal">[\s\S]*?<\/h3><p>[^<.]*\.)[^<]*(<\/p>)/g, '$1$2', 2, 'audience introductions');
// Closing invitation: heading and action only.
html = cut(html, /(<h2 id="cta-title">[^<]*<\/h2>)<p>[^<]*<\/p>/g, '$1', 1, 'closing sentence');

// Decorative additions for the preview's art direction; both are hidden from assistive technology.
// A week grid whose five filled days stand for the replacement.
const week = `<div class="apercu-week" aria-hidden="true"><div class="apercu-week-days"><span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span></div><div class="apercu-week-grid"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i class="on"></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div><p>Une semaine de remplacement</p></div>`;
// A round seal carrying the three steps, with the two-tone capsule at its centre.
const seal = `<div class="apercu-seal" aria-hidden="true"><svg class="apercu-seal-ring" viewBox="0 0 200 200"><defs><path id="apercu-seal-path" d="M100 100m-76 0a76 76 0 1 1 152 0a76 76 0 1 1-152 0"/></defs><text><textPath href="#apercu-seal-path" textLength="468" lengthAdjust="spacing">Matchez · Pilotez · Concluez · </textPath></text></svg><svg class="apercu-seal-core" viewBox="0 0 64 28"><path d="M14 0h18v28H14a14 14 0 0 1 0-28z"/><path d="M32 0h18a14 14 0 0 1 0 28H32z"/></svg></div>`;
html = cut(html, /<div class="hero-copy">/g, `<div class="hero-copy">${week}`, 1, 'hero copy');
html = cut(html, /(<div class="hero-story">[\s\S]*?<\/figure>\s*<\/div>)/g, `$1${seal}`, 1, 'hero photograph');

export const apercuLanding = html;
