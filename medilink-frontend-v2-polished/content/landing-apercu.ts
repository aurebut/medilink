import { landingContent } from './landing-content';

// Lighter copy for the /apercu-design preview only. Every cut is derived from the homepage
// markup by structure, so the homepage itself is unchanged and later copy edits carry over.
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

export const apercuLanding = html;
