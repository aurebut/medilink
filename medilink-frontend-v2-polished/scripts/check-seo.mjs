import assert from 'node:assert/strict';

const base = (process.argv[2] || 'http://localhost:3100').replace(/\/$/, '');
const site = 'https://medilink-web.com';
const publicPages = [
  '/', '/remplacement-medical', '/trouver-medecin-remplacant', '/guides',
  '/guides/premier-remplacement-medical-checklist', '/guides/annonce-remplacement-medical-cabinet',
];
const checkedAssets = new Set();
const checkedLinks = new Set();
async function read(path, options = {}) {
  const response = await fetch(`${base}${path}`, { signal: AbortSignal.timeout(20000), ...options });
  return { response, html: await response.text() };
}
for (const path of publicPages) {
  const { response, html } = await read(path);
  assert.equal(response.status, 200, path);
  assert.match(html, /<title>[^<]+ — MédiLink<\/title>/, `${path}: branded title`);
  assert.match(html, /<html[^>]+lang="fr"/, `${path}: French document`);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${path}: exactly one h1`);
  assert.equal((html.match(/rel="canonical"/g) || []).length, 1, `${path}: exactly one canonical`);
  const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1];
  assert.equal(canonical?.replace(/\/$/, ''), `${site}${path}`.replace(/\/$/, ''), `${path}: canonical`);
  assert.match(html, /<meta name="description" content="[^"]+"/, `${path}: description`);
  assert.match(html, /property="og:image"/, `${path}: social image`);
  assert.doesNotMatch(html, /<meta name="robots" content="[^"]*noindex/, `${path}: indexable`);
  assert.doesNotMatch(html, /\[Prénom Nom\]|Dr \[|landing(?:-medecin|-etablissement)?\.html/, `${path}: no placeholders or legacy links`);
  assert.match(html, /<main id="main-content"/, `${path}: server-rendered main`);
  const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
  for (const match of html.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(match[1]), `${path}: missing anchor #${match[1]}`);
  for (const match of html.matchAll(/(?:src|href)="(\/(?:landing-[^"?]+|favicon\.svg))"/g)) checkedAssets.add(match[1]);
  for (const match of html.matchAll(/<a\b[^>]*href="(\/[^"#]*)"/g)) checkedLinks.add(match[1].replaceAll('&amp;', '&'));
  if (path.startsWith('/guides/')) {
    const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(match => JSON.parse(match[1]));
    const article = schemas.find(schema => schema['@type'] === 'Article');
    const breadcrumb = schemas.find(schema => schema['@type'] === 'BreadcrumbList');
    assert.ok(article && breadcrumb, `${path}: article and breadcrumb`);
    assert.equal(article.url, `${site}${path}`);
    assert.equal(article.author.name, 'Équipe MédiLink');
    assert.match(html, new RegExp(`dateTime="${article.datePublished}"`, 'i'));
    assert.equal(breadcrumb.itemListElement.at(-1).item, article.url);
  }
  console.log(`PASS ${path}`);
}
for (const [source, destination] of [['/landing.html', '/'], ['/landing-medecin.html', '/remplacement-medical'], ['/landing-etablissement.html', '/trouver-medecin-remplacant']]) {
  const { response } = await read(source, { redirect: 'manual' });
  assert.ok([301, 308].includes(response.status), `${source}: permanent redirect`);
  assert.equal(new URL(response.headers.get('location'), base).pathname, destination);
  assert.equal((await read(source)).response.status, 200, `${source}: no loop`);
  console.log(`PASS redirect ${source} → ${destination}`);
}
for (const path of ['/login', '/register?type=candidate', '/register?type=establishment', '/forgot-password', '/reset-password', '/verify-email', '/demo', '/search', '/search?city=Paris&page=2', '/app/profile', '/establishment/dashboard', '/admin/dashboard', '/missions/seo-unknown-mission']) {
  const { response, html } = await read(path);
  assert.ok(response.status === 200 || response.status === 404, path);
  assert.match(html, /<meta name="robots" content="[^"]*noindex/, `${path}: noindex`);
  console.log(`PASS noindex ${path}`);
}
assert.equal((await read('/guides/guide-inexistant')).response.status, 404, 'Unknown guide returns an HTTP 404');
const { response: sitemapResponse, html: sitemap } = await read('/sitemap.xml');
assert.equal(sitemapResponse.status, 200);
assert.match(sitemapResponse.headers.get('content-type'), /xml/);
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1].replace(/\/$/, '')).sort();
assert.deepEqual(locations, publicPages.map(path => `${site}${path}`.replace(/\/$/, '')).sort());
const { response: robotsResponse, html: robots } = await read('/robots.txt');
assert.equal(robotsResponse.status, 200);
assert.match(robots, /Allow: \//);
assert.match(robots, /Sitemap: https:\/\/medilink-web\.com\/sitemap\.xml/);
for (const path of checkedLinks) {
  if (publicPages.includes(path)) continue;
  assert.equal((await read(path)).response.status, 200, `${path}: reachable internal link`);
}
for (const path of checkedAssets) assert.equal((await read(path)).response.status, 200, `${path}: asset exists`);
console.log(`PASS sitemap, robots, unknown guide, ${checkedLinks.size} internal links, ${checkedAssets.size} assets`);
