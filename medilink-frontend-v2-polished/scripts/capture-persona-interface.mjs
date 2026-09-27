// Native retina captures of the four persona product previews, using fictional data only.
// Usage: node scripts/capture-persona-interface.mjs http://localhost:3100
// Optional: CAPTURE_OUTPUT_DIR, CAPTURE_SOURCE_DIR, CAPTURE_BROWSER_CHANNEL,
// PLAYWRIGHT_MODULE_PATH, SHARP_MODULE_PATH. Partial review runs also support
// CAPTURE_ONLY=search,offer and CAPTURE_DEVICE=mobile, but require a custom output.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capturedAt, personaFixtureResponse } from './fixtures/persona-interface.mjs';

const require = createRequire(import.meta.url);
function loadPlaywright() {
  const candidates = [process.env.PLAYWRIGHT_MODULE_PATH, 'playwright', path.join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright')].filter(Boolean);
  for (const modulePath of candidates) {
    try { return require(modulePath); } catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
  }
  throw new Error('Install Playwright or set PLAYWRIGHT_MODULE_PATH to its installed module directory.');
}
const { chromium } = loadPlaywright();
const sharp = require(process.env.SHARP_MODULE_PATH || require.resolve('sharp', { paths: [path.dirname(require.resolve('next/package.json'))] }));
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.resolve(process.env.CAPTURE_OUTPUT_DIR || path.join(root, 'public/landing-assets/persona-interface'));
const sourceOutput = path.resolve(process.env.CAPTURE_SOURCE_DIR || path.join(root, 'output/persona-retina-captures'));
const base = (process.env.CAPTURE_BASE_URL || process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const origin = new URL(base).origin;
const names = ['search', 'offer', 'candidates', 'report'];
const devices = ['desktop', 'mobile'];
const selectedNames = process.env.CAPTURE_ONLY ? process.env.CAPTURE_ONLY.split(',') : names;
const selectedDevices = process.env.CAPTURE_DEVICE ? [process.env.CAPTURE_DEVICE] : devices;
assert.ok(selectedNames.length && selectedNames.every(name => names.includes(name)), 'CAPTURE_ONLY must contain search, offer, candidates or report');
assert.equal(new Set(selectedNames).size, selectedNames.length, 'Do not repeat capture names');
assert.ok(selectedDevices.every(device => devices.includes(device)), 'CAPTURE_DEVICE must be desktop or mobile');
assert.ok(!(process.env.CAPTURE_ONLY || process.env.CAPTURE_DEVICE) || process.env.CAPTURE_OUTPUT_DIR,
  'Partial review runs require CAPTURE_OUTPUT_DIR to preserve the complete public manifest.');
const channel = process.env.CAPTURE_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined);
const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
const forbiddenRequests = [];
const apiPaths = new Set();
const encoded = [];

async function capture(name, device) {
  const mobile = device === 'mobile';
  const recruiter = name === 'candidates' || name === 'report';
  let viewport = mobile ? { width: 390, height: 844 } : { width: recruiter ? 1600 : 1440, height: 1400 };
  const routePath = name === 'candidates' ? '/establishment/missions?tab=applications'
    : name === 'report' ? '/establishment/current-missions?section=reports&reportPeriod=week&reportDate=2026-09-25'
      : name === 'offer' ? '/app/search?tab=search' : '/app/search';
  const selector = name === 'candidates' ? '.establishment-application-section-current'
    : name === 'report' ? '[data-activity-reports]'
      : name === 'offer' ? '.search-results .mission-card' : '.recommended-missions';
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'fr-FR', timezoneId: 'Europe/Paris', reducedMotion: 'reduce', serviceWorkers: 'block' });
  try {
    const errors = [];
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.clock.setFixedTime(new Date(capturedAt));
    await context.route('**/*', async requestRoute => {
      const request = requestRoute.request();
      const url = new URL(request.url());
      if (url.pathname === '/api' || url.pathname.startsWith('/api/') || url.port === '4000') {
        const endpoint = url.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
        const result = personaFixtureResponse(endpoint, request.method(), recruiter ? 'recruiter' : 'candidate', name);
        apiPaths.add(`${request.method()} ${endpoint}`);
        if (!result) {
          forbiddenRequests.push(`${request.method()} ${endpoint}`);
          return requestRoute.fulfill({ status: 418, json: { message: `No fictional fixture for ${endpoint}` } });
        }
        if (result.eventStream) return requestRoute.fulfill({ status: 200, contentType: 'text/event-stream', body: ': fictional persona fixture\n\n' });
        return requestRoute.fulfill({ json: result.data });
      }
      if (url.origin === origin || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return requestRoute.continue();
      forbiddenRequests.push(`EXTERNAL ${url.origin}${url.pathname}`);
      return requestRoute.abort();
    });
    await page.goto(`${base}${routePath}`, { waitUntil: 'domcontentloaded' });
    await page.locator('.workspace-design').waitFor();
    // Remove development tooling only; never alter the actual product interface.
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    const subject = name === 'offer' ? page.locator(selector).filter({ hasText: 'Une semaine au Cabinet des Tilleuls' }) : page.locator(selector);
    await subject.waitFor();
    let selection;
    if (name === 'search') {
      await subject.locator('.mission-card').nth(1).waitFor();
      assert.equal(await subject.locator('.mission-card').count(), 2, 'search: both fictional offers are present');
    } else if (name === 'candidates') {
      await subject.getByRole('article', { name: 'Candidature de Sarah Bernard' }).waitFor();
      await subject.getByRole('button', { name: 'Voir pourquoi', exact: true }).click();
      assert.equal(await subject.getByRole('button', { name: 'Masquer les critères', exact: true }).getAttribute('aria-expanded'), 'true');
      assert.ok((await subject.innerText()).includes('sans validation des disponibilités ni décision automatique'), 'candidates: keep the compatibility qualification');
      selection = 'Sarah Bernard · Voir pourquoi développé';
    } else if (name === 'report') {
      assert.equal(await subject.getAttribute('data-example'), 'false', 'report: URL parameters must not enable fictional records');
      await subject.getByRole('button', { name: 'Voir un exemple', exact: true }).click();
      await subject.getByRole('button', { name: 'Hebdomadaire', exact: true }).click();
      assert.equal(await subject.getAttribute('data-example'), 'true');
      const text = await subject.innerText();
      assert.ok(text.includes('Exemple · données fictives'), 'report: keep its visible fictional-data disclosure');
      assert.ok(text.includes('aucun rapport enregistré ou envoyé'), 'report: preserve the example-only footer');
      assert.equal(await subject.getByRole('button', { name: /Lire le rapport du/ }).count(), 5, 'report: all five example days are present');
      selection = 'Exemple interactif · période hebdomadaire';
    }
    await page.evaluate(() => document.fonts.ready);
    await subject.locator('img').evaluateAll(images => Promise.all(images.map(async image => {
      await image.decode();
      if (!image.naturalWidth) throw new Error(`Image failed to load: ${image.currentSrc}`);
    })));
    // Grow the real viewport to include the full component above the fixed mobile
    // navigation, then capture at its native width. No stitching or UI scaling.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      const box = await subject.boundingBox();
      assert.ok(box, `${name}/${device}: visible native component`);
      const height = Math.max(viewport.height, Math.ceil(box.y + box.height) + 120);
      if (height === viewport.height) break;
      viewport = { ...viewport, height };
      await page.setViewportSize(viewport);
    }
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    assert.deepEqual(errors, [], `${name}/${device}: no client errors`);
    assert.deepEqual(forbiddenRequests, [], `${name}/${device}: all backend and external requests are isolated`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}/${device}: no horizontal overflow`);
    const box = await subject.boundingBox();
    const clip = {
      x: Math.floor(box.x), y: Math.floor(box.y),
      width: Math.ceil(box.x + box.width) - Math.floor(box.x),
      height: Math.ceil(box.y + box.height) - Math.floor(box.y),
    };
    assert.ok(clip.x >= 0 && clip.y >= 0 && clip.x + clip.width <= viewport.width && clip.y + clip.height <= viewport.height - 90,
      `${name}/${device}: complete component fits above native fixed navigation`);
    const png = await page.screenshot({ type: 'png', clip, animations: 'disabled', scale: 'device' });
    const native = await sharp(png).metadata();
    assert.equal(native.format, 'png');
    assert.equal(native.width, clip.width * 2, `${name}/${device}: genuine 2x native width`);
    assert.equal(native.height, clip.height * 2, `${name}/${device}: genuine 2x native height`);
    const highDensity = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
    const standard = await sharp(png).resize(clip.width, clip.height).webp({ lossless: true, effort: 6 }).toBuffer();
    const [before, after] = await Promise.all([
      sharp(png).ensureAlpha().raw().toBuffer(),
      sharp(highDensity).ensureAlpha().raw().toBuffer(),
    ]);
    assert.ok(before.equals(after), `${name}/${device}: every native retina pixel survives lossless encoding`);
    const filename = `${name}-${device}`;
    encoded.push({ png, highDensity, standard, filename, asset: {
      name, device, route: new URL(page.url()).pathname + new URL(page.url()).search, viewport,
      crop: { ...clip, selector, scrollY: 0, clippedBottom: false },
      ...(selection ? { selection } : {}), width: clip.width, height: clip.height, previewHeight: clip.height,
      files: [`${filename}.webp`, `${filename}@2x.webp`], sourceScale: 2, sourceFormat: 'png', sourceFullViewport: false,
      sha256: createHash('sha256').update(highDensity).digest('hex'),
    } });
    console.log(`${filename}: ${clip.width} x ${clip.height} CSS px, ${native.width} x ${native.height} native PNG pixels`);
  } finally { await context.close(); }
}

try {
  for (const name of selectedNames) for (const device of selectedDevices) await capture(name, device);
  assert.deepEqual(forbiddenRequests, [], 'No unmocked backend or external request');
  // Validate the whole batch before replacing any public asset or its manifest.
  const manifest = {
    description: 'Actual MédiLink application UI rendered with isolated fictional API fixtures. No screenshot-specific UI reconstruction or restyling.',
    captureMethod: 'Playwright native PNG screenshot at deviceScaleFactor 2',
    capturedAt, timezone: 'Europe/Paris', locale: 'fr-FR', browser: await browser.version(),
    format: 'lossless WebP; native 2x image and downsampled 1x fallback',
    source: 'scripts/capture-persona-interface.mjs', fixture: 'scripts/fixtures/persona-interface.mjs',
    apiPaths: [...apiPaths].sort(), assets: encoded.map(item => item.asset),
  };
  await mkdir(output, { recursive: true });
  await mkdir(sourceOutput, { recursive: true });
  for (const { png, highDensity, standard, filename } of encoded) {
    await writeFile(path.join(sourceOutput, `${filename}.png`), png);
    await writeFile(path.join(output, `${filename}@2x.webp`), highDensity);
    await writeFile(path.join(output, `${filename}.webp`), standard);
  }
  await writeFile(path.join(sourceOutput, 'captures.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  await writeFile(path.join(output, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
} finally { await browser.close(); }
