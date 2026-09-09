import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Preserve the original landing outside the explicitly requested guides links and process art.
const reference = '60c8e06';
const base = (process.argv[2] || 'http://localhost:3100').replace(/\/$/, '');
const pages = { '/': 'landing.html', '/remplacement-medical': 'landing-medecin.html', '/trouver-medecin-remplacant': 'landing-etablissement.html' };
const originalAssets = new Set();
const normalize = html => html.replaceAll('\r\n', '\n').replaceAll('/landing-medecin.html', '/remplacement-medical').replaceAll('/landing-etablissement.html', '/trouver-medecin-remplacant').replaceAll('/landing.html', '/').trim();
const artMarker = '/* Process illustrations: requested replacement of the three product previews. */';
function normalizeProcessFigures(html, updated) {
  for (const key of ['criteria', 'matching', 'report']) {
    const className = updated ? `ml-process-art ml-process-art--${key}` : `ml-stage ml-human-stage ml-human-stage--${key}`;
    const pattern = new RegExp(`<figure class="${className}">[\\s\\S]*?<\\/figure>`, 'g');
    const figures = [...html.matchAll(pattern)];
    assert.equal(figures.length, 1, `${key}: exactly one process illustration`);
    if (updated) {
      assert.match(figures[0][0], new RegExp(`aria-labelledby="ml-art-${key}-title ml-art-${key}-desc"`), `${key}: accessible diagram`);
      assert.match(figures[0][0], /<figcaption class="ml-art-caption">/, `${key}: visible caption`);
      assert.doesNotMatch(figures[0][0], /<img|ml-float/, `${key}: replaces the old photograph and UI preview`);
    }
    html = html.replace(pattern, `<!-- process illustration: ${key} -->`);
  }
  return html;
}
for (const [path, file] of Object.entries(pages)) {
  const original = execFileSync('git', ['show', `${reference}:medilink-frontend-v2-polished/public/${file}`], { encoding: 'utf8' });
  const response = await fetch(base + path, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, path);
  const actual = await response.text();
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
    }
    assert.equal(normalize(rendered), normalize(expected), `${path}: original ${tag} preserved outside requested guide links and process illustrations`);
  }
  const styles = html => [...html.matchAll(/<link\b[^>]*>/g)].map(match => match[0]).filter(tag => /rel="stylesheet"/.test(tag)).flatMap(tag => tag.match(/href="(\/landing-[^"]+\.css)"/)?.[1] || []);
  assert.deepEqual(styles(actual), styles(original), `${path}: original stylesheet order`);
  styles(original).forEach(asset => originalAssets.add(asset));
  [...original.matchAll(/<script src="(\/landing-[^"]+\.js)"/g)].forEach(match => originalAssets.add(match[1]));
  assert.doesNotMatch(actual, /seo-launch-note|seo-resources|href="\/landing-seo\.css"/, `${path}: no SEO layout additions`);
  assert.match(actual, /href="\/landing-special\.js" as="script"/, `${path}: original reveal script queued by Next.js`);
  console.log(`PASS ${path}: original landing matches ${reference} outside requested guide links and homepage illustrations`);
}
for (const asset of originalAssets) {
  const original = execFileSync('git', ['show', `${reference}:medilink-frontend-v2-polished/public${asset}`], { encoding: 'utf8' });
  const response = await fetch(base + asset, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, asset);
  const rendered = (await response.text()).replaceAll('\r\n', '\n');
  if (asset === '/landing-process.css') {
    const parts = rendered.split(artMarker);
    assert.equal(parts.length, 2, 'one isolated process illustration stylesheet extension');
    assert.equal(parts[0].trimEnd(), original.replaceAll('\r\n', '\n').trimEnd(), `${asset}: original layout styles unchanged`);
    assert.match(parts[1], /prefers-reduced-motion: no-preference/, 'illustration animations respect reduced motion');
    assert.match(parts[1], /max-width: 360px/, 'illustrations cover narrow mobile screens');
  } else {
    assert.equal(rendered, original.replaceAll('\r\n', '\n'), `${asset}: unchanged from original`);
  }
}
console.log(`PASS ${originalAssets.size} original stylesheets and scripts preserved; scoped process art styles appended`);
