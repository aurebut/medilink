import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Preserve the original landing outside the explicitly requested guides links, process art and two homepage previews.
const reference = '60c8e06';
const base = (process.argv[2] || 'http://localhost:3100').replace(/\/$/, '');
const pages = { '/': 'landing.html', '/remplacement-medical': 'landing-medecin.html', '/trouver-medecin-remplacant': 'landing-etablissement.html' };
const originalAssets = new Set();
const normalize = html => html.replaceAll('\r\n', '\n').replaceAll('/landing-medecin.html', '/remplacement-medical').replaceAll('/landing-etablissement.html', '/trouver-medecin-remplacant').replaceAll('/landing.html', '/').trim();
function normalizeProcessFigures(html, updated) {
  for (const key of ['criteria', 'matching', 'report']) {
    const className = updated ? `ml-process-art ml-process-art--${key} ml-process-art--v2` : `ml-stage ml-human-stage ml-human-stage--${key}`;
    const pattern = new RegExp(`<figure class="${className}">[\\s\\S]*?<\\/figure>`, 'g');
    const figures = [...html.matchAll(pattern)];
    assert.equal(figures.length, 1, `${key}: exactly one process illustration`);
    if (updated) {
      assert.match(figures[0][0], new RegExp(`aria-labelledby="ml-art-${key}-title ml-art-${key}-desc"`), `${key}: accessible diagram`);
      assert.match(figures[0][0], /<figcaption class="ml-art-caption">/, `${key}: visible caption`);
      assert.match(figures[0][0], /<svg class="ml-art-diagram"[^>]*fill="none"/, `${key}: never default to opaque black shapes if CSS is unavailable`);
      assert.doesNotMatch(figures[0][0], /<img|ml-float/, `${key}: replaces the old photograph and UI preview`);
    }
    html = html.replace(pattern, `<!-- process illustration: ${key} -->`);
  }
  return html;
}
function normalizeFirstStepCopy(html, updated) {
  const label = updated ? 'Matchez' : 'Précisez vos attentes';
  assert.ok(html.includes(`<span class="ml-tab-text">${label}</span>`), 'first step label');
  html = html.replace(`<span class="ml-tab-text">${label}</span>`, '<span class="ml-tab-text">FIRST_STEP</span>');
  const copy = /(<div class="ml-process-panel" id="ml-panel-criteria"[^>]*>)\s*<div class="ml-process-copy(?: ml-match-copy)?">[\s\S]*?<\/div>\s*(?=<!-- process illustration: criteria -->)/g;
  assert.equal([...html.matchAll(copy)].length, 1, 'only the first step copy is replaced');
  return html.replace(copy, '$1<!-- first step copy -->');
}
function normalizePilotCopy(html, updated) {
  const label = updated ? 'Pilotez' : 'Comparez les possibilités';
  assert.ok(html.includes(`<span class="ml-tab-text">${label}</span>`), 'second step label');
  html = html.replace(`<span class="ml-tab-text">${label}</span>`, '<span class="ml-tab-text">SECOND_STEP</span>');
  const copy = /(<div class="ml-process-panel" id="ml-panel-matching"[^>]*>)\s*<div class="ml-process-copy(?: ml-pilot-copy-panel)?">[\s\S]*?<\/div>\s*(?=<!-- process illustration: matching -->)/g;
  assert.equal([...html.matchAll(copy)].length, 1, 'only the second step copy is replaced');
  return html.replace(copy, '$1<!-- second step copy -->');
}
function normalizeConclusionCopy(html, updated) {
  const label = updated ? 'Concluez' : 'Suivez le remplacement';
  assert.ok(html.includes(`<span class="ml-tab-text">${label}</span>`), 'third step label');
  html = html.replace(`<span class="ml-tab-text">${label}</span>`, '<span class="ml-tab-text">THIRD_STEP</span>');
  const copy = /(<div class="ml-process-panel" id="ml-panel-report"[^>]*>)\s*<div class="ml-process-copy(?: ml-close-copy-panel)?">[\s\S]*?<\/div>\s*(?=<!-- process illustration: report -->)/g;
  assert.equal([...html.matchAll(copy)].length, 1, 'only the third step copy is replaced');
  return html.replace(copy, '$1<!-- third step copy -->');
}
function normalizeEditorialPreviews(html, updated) {
  const previews = [
    { section: 'ml-workspace', id: 'communication', title: 'ml-workspace-title', tag: 'div', preview: 'ml-dossier' },
    { section: 'ml-continuity', id: 'continuite', title: 'continuity-title', tag: 'figure', preview: 'ml-continuity-preview' },
  ];
  for (const { section, id, title, tag, preview } of previews) {
    const originalSection = `<section class="${section}" id="${id}" aria-labelledby="${title}">`;
    const openingSection = updated ? originalSection.replace(`class="${section}"`, `class="${section} ${section}--editorial"`) : originalSection;
    assert.equal(html.split(openingSection).length - 1, 1, `${id}: exactly one section with its original anchor and accessible heading`);
    html = html.replace(openingSection, originalSection);

    const opening = new RegExp(`<${tag}\\b[^>]*\\bclass="${preview}(?: [^"]+)?"[^>]*>`, 'g');
    const matches = [...html.matchAll(opening)];
    assert.equal(matches.length, 1, `${id}: exactly one requested interface preview`);
    const start = matches[0].index;
    // The dossier contains nested divs; counting matching tags keeps the surrounding copy in the comparison.
    const tags = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'g');
    tags.lastIndex = start;
    let depth = 0;
    let end = -1;
    for (let token; (token = tags.exec(html));) {
      depth += token[0].startsWith('</') ? -1 : 1;
      if (depth === 0) {
        end = tags.lastIndex;
        break;
      }
    }
    assert.ok(end > start, `${id}: preview has a matching closing tag`);
    const markup = html.slice(start, end);
    if (updated) {
      assert.match(markup, /Aperçu illustratif · Données fictives/, `${id}: preview data remains clearly illustrative`);
      if (tag === 'figure') assert.match(markup, /<figcaption\b[^>]*>/, `${id}: preview retains its visible caption`);
      else assert.match(matches[0][0], /aria-label="Exemple du dossier partagé d’un remplacement"/, `${id}: shared dossier retains its accessible label`);
    }
    html = html.slice(0, start) + `<!-- requested interface preview: ${id} -->` + html.slice(end);
  }
  return html;
}
for (const [path, file] of Object.entries(pages)) {
  const original = execFileSync('git', ['show', `${reference}:medilink-frontend-v2-polished/public/${file}`], { encoding: 'utf8' });
  const response = await fetch(base + path, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, path);
  const actual = await response.text();
  if (path === '/') {
    assert.doesNotMatch(actual, /(?:href|src)="\/landing-process\.js(?:\?|"|&)/, 'use the bundled scene controller without a second legacy autoplay timer');
    const compiledStyles = [...actual.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^\"]+)"[^>]*>/g)]
      .map(match => match[1].replaceAll('&amp;', '&')).filter(href => href.startsWith('/_next/static/css/'));
    assert.ok(compiledStyles.length, 'homepage styles use versioned Next.js assets');
    const compiledContents = await Promise.all(compiledStyles.map(async href => {
      const css = await fetch(new URL(href, base), { signal: AbortSignal.timeout(20000) });
      assert.equal(css.status, 200, href);
      return css.text();
    }));
    const artStyles = compiledContents.find(css => css.includes('.ml-process-art.ml-process-art--v2'));
    assert.ok(artStyles, 'versioned stylesheet includes the process illustration styles');
    assert.match(artStyles, /prefers-reduced-motion:\s*no-preference/, 'illustration animations respect reduced motion');
    assert.match(artStyles, /max-width:\s*360px/, 'illustrations cover narrow mobile screens');
    const compiledCss = compiledContents.join('\n');
    for (const section of ['workspace', 'continuity']) {
      assert.ok(compiledCss.includes(`.ml-${section}--editorial`), `${section}: requested interface styles use versioned Next.js assets`);
    }
  }
  for (const tag of ['nav', 'main', 'footer']) {
    const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`);
    let rendered = actual.match(pattern)?.[1] || '';
    let expected = original.match(pattern)?.[1] || '';
    if (tag === 'nav') {
      const guideLinks = [...rendered.matchAll(/<a\b[^>]*data-guides-link="(desktop|mobile)"[^>]*>[\s\S]*?<\/a>/g)];
      assert.deepEqual(guideLinks.map(match => match[1]), ['desktop', 'mobile'], `${path}: desktop and mobile guide links`);
      for (const [link] of guideLinks) {
        assert.match(link, /href="\/guides"/, `${path}: guide link destination`);
        assert.match(link, />Guides pratiques(?: |<\/a>)/, `${path}: guide link label`);
        rendered = rendered.replace(link, '');
      }
    }
    if (path === '/' && tag === 'main') {
      rendered = normalizeProcessFigures(rendered, true);
      expected = normalizeProcessFigures(expected, false);
      rendered = normalizeFirstStepCopy(rendered, true);
      expected = normalizeFirstStepCopy(expected, false);
      rendered = normalizePilotCopy(rendered, true);
      expected = normalizePilotCopy(expected, false);
      rendered = normalizeConclusionCopy(rendered, true);
      expected = normalizeConclusionCopy(expected, false);
      rendered = normalizeEditorialPreviews(rendered, true);
      expected = normalizeEditorialPreviews(expected, false);
    }
    assert.equal(normalize(rendered), normalize(expected), `${path}: original ${tag} preserved outside requested guide links, process illustrations and interface previews`);
  }
  const styles = html => [...html.matchAll(/<link\b[^>]*>/g)].map(match => match[0]).filter(tag => /rel="stylesheet"/.test(tag)).flatMap(tag => tag.match(/href="(\/landing-[^"]+\.css)"/)?.[1] || []);
  assert.deepEqual(styles(actual), styles(original), `${path}: original stylesheet order`);
  styles(original).forEach(asset => originalAssets.add(asset));
  [...original.matchAll(/<script src="(\/landing-[^"]+\.js)"/g)].forEach(match => originalAssets.add(match[1]));
  assert.doesNotMatch(actual, /seo-launch-note|seo-resources|href="\/landing-seo\.css"/, `${path}: no SEO layout additions`);
  assert.match(actual, /href="\/landing-special\.js" as="script"/, `${path}: original reveal script queued by Next.js`);
  console.log(`PASS ${path}: original landing matches ${reference} outside requested guide links, homepage illustrations and interface previews`);
}
for (const asset of originalAssets) {
  const original = execFileSync('git', ['show', `${reference}:medilink-frontend-v2-polished/public${asset}`], { encoding: 'utf8' });
  const response = await fetch(base + asset, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, asset);
  const rendered = (await response.text()).replaceAll('\r\n', '\n');
  assert.equal(rendered.trimEnd(), original.replaceAll('\r\n', '\n').trimEnd(), `${asset}: unchanged from original`);
}
console.log(`PASS ${originalAssets.size} original stylesheets and scripts preserved; process art and interface stylesheets versioned with the page`);
