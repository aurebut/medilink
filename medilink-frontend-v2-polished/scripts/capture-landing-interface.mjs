import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { capturedAt, fixtureResponse } from './fixtures/landing-interface.mjs';

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
const output = process.env.CAPTURE_OUTPUT_DIR ? path.resolve(process.env.CAPTURE_OUTPUT_DIR) : path.join(root, 'public/landing-assets/interface');
const base = (process.env.CAPTURE_BASE_URL || process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const origin = new URL(base).origin;
const channel = process.env.CAPTURE_BROWSER_CHANNEL || (process.platform === 'win32' ? 'msedge' : undefined);
const apiPaths = new Set();
const assets = [];
const forbiddenRequests = [];
assert.ok(!(process.env.CAPTURE_ONLY || process.env.CAPTURE_DEVICE) || process.env.CAPTURE_OUTPUT_DIR,
  'Partial review runs require CAPTURE_OUTPUT_DIR so the complete public manifest cannot be replaced.');
const browser = await chromium.launch({ headless: true, ...(channel ? { channel } : {}) });
await mkdir(output, { recursive: true });

async function capture(name, device) {
  const mobile = device === 'mobile';
  let viewport = mobile ? { width: 390, height: name === 'messages' ? 820 : 1100 } : name === 'documents' ? { width: 1040, height: 1100 } : name === 'messages' ? { width: 1440, height: 900 } : { width: 1100, height: 1000 };
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, locale: 'fr-FR', timezoneId: 'Europe/Paris', reducedMotion: 'reduce' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => { errors.push(error.message); console.error(`${name}/${device}: ${error.message}`); });
  await page.clock.setFixedTime(new Date(capturedAt));
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.pathname.startsWith('/api/') || url.port === '4000') {
      const endpoint = url.pathname.replace(/^\/api/, '');
      const result = fixtureResponse(endpoint, route.request().method());
      apiPaths.add(endpoint);
      if (!result) {
        forbiddenRequests.push(`${route.request().method()} ${endpoint}`);
        return route.fulfill({ status: 418, json: { message: `No screenshot fixture for ${endpoint}` } });
      }
      if (result.eventStream) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': demo fixture\n\n' });
      return route.fulfill({ json: result.data });
    }
    // Only application assets and the application's own Google font requests may leave the browser.
    if (url.origin === origin || ['fonts.googleapis.com', 'fonts.gstatic.com'].includes(url.hostname)) return route.continue();
    forbiddenRequests.push(`EXTERNAL ${url.origin}${url.pathname}`);
    return route.abort();
  });
  const routePath = name === 'messages' ? '/app/messages?id=c1' : name === 'mission' ? '/app/current-missions' : '/app/current-missions?section=documents';
  await page.goto(`${base}${routePath}`, { waitUntil: 'domcontentloaded' });
  try { await page.locator('.workspace-design').waitFor(); }
  catch (error) {
    console.error('Page after failure:', page.url(), (await page.locator('body').innerText()).slice(0, 1600));
    throw error;
  }
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
  const selector = name === 'messages' ? '.message-layout' : name === 'mission' ? '.candidate-current-route' : '.replacement-dossier';
  const subject = page.locator(selector);
  await subject.waitFor();
  if (name === 'documents') await subject.locator('.rd-document-register .rd-document-row').first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  await subject.locator('img').evaluateAll(images => Promise.all(images.map(async image => {
    await image.decode();
    if (!image.naturalWidth) throw new Error(`Image failed to load: ${image.currentSrc}`);
  })));
  await page.waitForTimeout(800);
  if (name === 'documents' || name === 'mission') {
    // Resize the real viewport to include the native component; never scale or restyle its UI.
    const box = await subject.boundingBox();
    viewport = { ...viewport, height: Math.max(viewport.height, Math.ceil(box.height) + 240) };
    await page.setViewportSize(viewport);
  }
  if (name === 'messages') {
    await page.locator('.message-log .message').last().waitFor();
    // Match the actual viewport to a complete group of messages. Only native scrolling
    // and resizing are used; no message or interface element is removed or restyled.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const adjustment = await page.locator('.messages').evaluate(element => {
        const first = element.querySelector('.message:not(.system)');
        const firstOffset = first.getBoundingClientRect().top - element.getBoundingClientRect().top + element.scrollTop;
        const padding = Math.min(16, parseFloat(getComputedStyle(element).paddingTop));
        return Math.round(element.scrollHeight - firstOffset + padding - element.clientHeight);
      });
      if (Math.abs(adjustment) <= 1) break;
      viewport = { ...viewport, height: viewport.height + adjustment };
      await page.setViewportSize(viewport);
      await page.waitForTimeout(120);
    }
    await page.locator('.messages').evaluate(element => { element.scrollTop = element.scrollHeight; });
    const boundaries = await page.locator('.messages').evaluate(element => {
      const first = element.querySelector('.message:not(.system)').getBoundingClientRect();
      const messages = element.querySelectorAll('.message:not(.system)');
      const last = messages[messages.length - 1].getBoundingClientRect();
      const box = element.getBoundingClientRect();
      return { first: first.top - box.top, last: box.bottom - last.bottom };
    });
    assert.ok(boundaries.first >= 10 && boundaries.last >= 10, `${name}/${device}: complete text message boundaries ${JSON.stringify(boundaries)}`);
  }
  assert.deepEqual(errors, [], `${name}/${device}: no client errors`);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}/${device}: no horizontal overflow`);
  let png;
  let crop;
  if (name === 'messages') {
    // Capture the native conversation component, including its list on desktop,
    // instead of shrinking the unrelated application navigation into the preview.
    const box = await subject.boundingBox();
    const form = await page.locator('.message-form').boundingBox();
    assert.ok(form && form.y >= box.y && form.y + form.height <= box.y + box.height + 1,
      `${name}/${device}: the complete composer remains inside the capture`);
    const clip = {
      x: Math.floor(box.x), y: Math.floor(box.y),
      width: Math.ceil(box.x + box.width) - Math.floor(box.x),
      height: Math.ceil(box.y + box.height) - Math.floor(box.y),
    };
    png = await page.screenshot({ clip, animations: 'disabled' });
    crop = { ...clip, scrollY: await page.evaluate(() => window.scrollY), selector, clippedBottom: false };
  } else {
    if (!mobile && name === 'mission') {
      const columns = await subject.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
      assert.equal(columns, 2, 'mission/desktop: the native timeline keeps its two-column layout');
    }
    // Scroll the actual component into view, leaving real fixed navigation outside the crop.
    await subject.evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 90, behavior: 'instant' }));
    const box = await subject.boundingBox();
    const padding = name === 'mission' ? 20 : 0;
    const topPadding = name === 'mission' ? 10 : 0;
    let height = Math.ceil(box.height) + padding + topPadding;
    const clip = { x: Math.floor(box.x - padding), y: Math.floor(box.y - topPadding), width: Math.ceil(box.width) + padding * 2, height };
    png = await page.screenshot({ clip, animations: 'disabled' });
    crop = { ...clip, scrollY: await page.evaluate(() => window.scrollY), selector, clippedBottom: height < box.height };
  }
  const metadata = await sharp(png).metadata();
  assert.equal(metadata.width, crop.width * 2, `${name}/${device}: crop width fits the browser viewport`);
  assert.equal(metadata.height, crop.height * 2, `${name}/${device}: crop height fits the browser viewport`);
  const width = Math.round(metadata.width / 2);
  const height = Math.round(metadata.height / 2);
  // Mobile mission previews end after three complete steps, regardless of the
  // context above them. Enlargement and the document register retain all rows.
  const previewHeight = name === 'mission' && mobile
    ? Math.min(height, Math.ceil(await subject.locator('.candidate-current-route-list > div').nth(2).evaluate(element => {
      const content = element.lastElementChild.getBoundingClientRect();
      return content.bottom;
    }) - crop.y + 20))
    : height;
  const filename = `${name}-${device}`;
  const highDensity = await sharp(png).webp({ lossless: true, effort: 6 }).toBuffer();
  const sha256 = createHash('sha256').update(highDensity).digest('hex');
  await writeFile(path.join(output, `${filename}@2x.webp`), highDensity);
  await sharp(png).resize(width, height).webp({ lossless: true, effort: 6 }).toFile(path.join(output, `${filename}.webp`));
  assets.push({ name, device, route: routePath, viewport, crop, width, height, previewHeight, files: [`${filename}.webp`, `${filename}@2x.webp`], sourceScale: 2, sha256 });
  console.log(`${filename}: ${width} x ${height}`);
  await context.close();
}
try {
  const selectedNames = process.env.CAPTURE_ONLY ? process.env.CAPTURE_ONLY.split(',') : ['messages', 'mission', 'documents'];
  const selectedDevices = process.env.CAPTURE_DEVICE ? [process.env.CAPTURE_DEVICE] : ['desktop', 'mobile'];
  assert.ok(selectedNames.every(name => ['messages', 'mission', 'documents'].includes(name)), 'CAPTURE_ONLY must contain messages, mission or documents');
  assert.ok(selectedDevices.every(device => ['desktop', 'mobile'].includes(device)), 'CAPTURE_DEVICE must be desktop or mobile');
  for (const name of selectedNames) for (const device of selectedDevices) await capture(name, device);
  assert.deepEqual(forbiddenRequests, [], 'All backend requests must be explicitly mocked; no other external services');
  await writeFile(path.join(output, 'manifest.json'), JSON.stringify({
    description: 'Actual MédiLink application UI, rendered with fictional API fixtures. No interface reconstruction or restyling.',
    capturedAt, timezone: 'Europe/Paris', locale: 'fr-FR', browser: await browser.version(),
    format: 'lossless WebP', source: 'scripts/capture-landing-interface.mjs', fixture: 'scripts/fixtures/landing-interface.mjs',
    apiPaths: [...apiPaths].sort(), assets,
  }, null, 2) + '\n');
} finally { await browser.close(); }
