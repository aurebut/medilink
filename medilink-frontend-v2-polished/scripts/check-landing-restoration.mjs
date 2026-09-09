import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

// Preserve the original landing with only the explicitly requested links to the guides.
const reference = '60c8e06';
const base = (process.argv[2] || 'http://localhost:3100').replace(/\/$/, '');
const pages = { '/': 'landing.html', '/remplacement-medical': 'landing-medecin.html', '/trouver-medecin-remplacant': 'landing-etablissement.html' };
const originalAssets = new Set();
const normalize = html => html.replaceAll('\r\n', '\n').replaceAll('/landing-medecin.html', '/remplacement-medical').replaceAll('/landing-etablissement.html', '/trouver-medecin-remplacant').replaceAll('/landing.html', '/').trim();
for (const [path, file] of Object.entries(pages)) {
  const original = execFileSync('git', ['show', `${reference}:medilink-frontend-v2-polished/public/${file}`], { encoding: 'utf8' });
  const response = await fetch(base + path, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, path);
  const actual = await response.text();
  for (const tag of ['nav', 'main', 'footer']) {
    const pattern = new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tag}>`);
    let rendered = actual.match(pattern)?.[1] || '';
    if (tag === 'nav') {
      const guideLinks = [...rendered.matchAll(/<a\b[^>]*data-guides-link="(desktop|mobile)"[^>]*>[\s\S]*?<\/a>/g)];
      assert.deepEqual(guideLinks.map(match => match[1]), ['desktop', 'mobile'], `${path}: desktop and mobile guide links`);
      for (const [link] of guideLinks) {
        assert.match(link, /href="\/guides"/, `${path}: guide link destination`);
        assert.match(link, />Guides pratiques(?: |<\/a>)/, `${path}: guide link label`);
        rendered = rendered.replace(link, '');
      }
    }
    assert.equal(normalize(rendered), normalize(original.match(pattern)?.[1] || ''), `${path}: original ${tag} preserved apart from requested guide links`);
  }
  const styles = html => [...html.matchAll(/<link\b[^>]*>/g)].map(match => match[0]).filter(tag => /rel="stylesheet"/.test(tag)).flatMap(tag => tag.match(/href="(\/landing-[^"]+\.css)"/)?.[1] || []);
  assert.deepEqual(styles(actual), styles(original), `${path}: original stylesheet order`);
  styles(original).forEach(asset => originalAssets.add(asset));
  [...original.matchAll(/<script src="(\/landing-[^"]+\.js)"/g)].forEach(match => originalAssets.add(match[1]));
  assert.doesNotMatch(actual, /seo-launch-note|seo-resources|href="\/landing-seo\.css"/, `${path}: no SEO layout additions`);
  assert.match(actual, /href="\/landing-special\.js" as="script"/, `${path}: original reveal script queued by Next.js`);
  console.log(`PASS ${path}: guide links added; original landing otherwise matches ${reference}`);
}
for (const asset of originalAssets) {
  const original = execFileSync('git', ['show', `${reference}:medilink-frontend-v2-polished/public${asset}`], { encoding: 'utf8' });
  const response = await fetch(base + asset, { signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, asset);
  assert.equal((await response.text()).replaceAll('\r\n', '\n'), original.replaceAll('\r\n', '\n'), `${asset}: unchanged from original`);
}
console.log(`PASS ${originalAssets.size} original stylesheets and scripts unchanged`);
