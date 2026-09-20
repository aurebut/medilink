import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import path from 'node:path';
import { agreement, application, conversation, capturedAt, fixtureResponse, missionTrackingDossier, replacementDossier } from './fixtures/landing-interface.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || path.join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base = (process.argv[2] || 'http://localhost:3000').replace(/\/$/, '');
const origin = new URL(base).origin;
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
const context = await browser.newContext({ viewport: { width: 390, height: 1000 }, locale: 'fr-FR', timezoneId: 'Europe/Paris', reducedMotion: 'reduce' });
const page = await context.newPage();
// Each hard navigation starts a fresh session; the separate tab check below
// exercises dossier updates without resetting the running application.
await page.addInitScript(() => window.sessionStorage.clear());
const errors = [];
page.on('pageerror', error => errors.push(error.message));
let dossier = structuredClone(missionTrackingDossier);
let currentAgreement = structuredClone(agreement);
let currentApplication = structuredClone(application);
let unavailable = false;
await page.clock.setFixedTime(new Date(capturedAt));
await context.route('**/*', async route => {
  const url = new URL(route.request().url());
  if (url.pathname.startsWith('/api/') || url.port === '4000') {
    const endpoint = url.pathname.replace(/^\/api/, '');
    assert.equal(route.request().method(), endpoint === '/conversations/c1/read' ? 'POST' : 'GET', 'timeline never sends or modifies documents');
    if (endpoint === '/applications/preview-application/dossier') {
      return route.fulfill(unavailable ? { status: 503, json: { message: 'Dossier temporairement indisponible.' } } : { json: dossier });
    }
    if (endpoint === '/me/applications') return route.fulfill({ json: [currentApplication] });
    const currentConversations = [{ ...conversation, application: currentApplication, agreements: [currentAgreement] }];
    if (endpoint === '/conversations') return route.fulfill({ json: currentConversations });
    const result = fixtureResponse(endpoint, route.request().method(), 'mission');
    assert.ok(result, `fixture required for ${endpoint}`);
    // AppShell also primes the shared cache from the dashboard response.
    if (endpoint === '/me/dashboard') return route.fulfill({ json: { ...result.data, applications: [currentApplication], conversations: currentConversations } });
    return route.fulfill(result.eventStream ? { contentType: 'text/event-stream', body: ': fixture\n\n' } : { json: result.data });
  }
  if (url.origin === origin) return route.continue();
  return route.abort();
});

async function load() {
  await page.goto(`${base}/app/current-missions`);
  await page.locator('.candidate-current-route-list[aria-busy="false"]').waitFor();
}
async function check(key, status, done = false) {
  const row = page.locator(`[data-mission-step="${key}"]`);
  assert.equal(await row.locator('small').innerText(), status, `${key}: expected ${status}`);
  assert.equal(await row.evaluate(element => element.classList.contains('done')), done, `${key}: correct completion state`);
}
async function active(key) {
  assert.equal(await page.locator('[aria-current="step"]').getAttribute('data-mission-step'), key);
}

try {
  await load();
  await check('documents', 'Transmis', true);
  await check('replacement', 'En cours');
  await check('completed', 'À venir');
  await check('payment', 'À suivre');
  await active('replacement');
  assert.deepEqual(await page.locator('[data-mission-step]').evaluateAll(rows => rows.map(row => row.dataset.missionStep)), ['confirmed', 'documents', 'replacement', 'completed', 'payment']);
  assert.equal(await page.locator('.mission-folio-people img').count(), 2);

  // Updating documents, then returning to the overview must reload the actual dossier.
  dossier = structuredClone(replacementDossier);
  await page.getByRole('tab', { name: 'Dossier du remplacement', exact: true }).click();
  await page.locator('.rd-document-row').first().waitFor();
  await page.getByRole('tab', { name: "Vue d'ensemble", exact: true }).click();
  await page.locator('.candidate-current-route-list[aria-busy="false"]').waitFor();
  await check('documents', 'À préparer');
  await active('documents');

  for (const [deliveryStatus, label] of [['FAILED', 'À relancer'], ['SENDING', 'En cours']]) {
    dossier = structuredClone(missionTrackingDossier);
    dossier.deliveries[0].status = deliveryStatus;
    dossier.deliveries[0].sentAt = null;
    await load();
    await check('documents', label);
    await active('documents');
  }

  dossier = structuredClone(missionTrackingDossier);
  dossier.deliveries[0].recipientType = 'COUNTERPART';
  await load();
  await check('documents', 'À transmettre');

  dossier = structuredClone(missionTrackingDossier);
  dossier.deliveries[0].documentIds = ['preview-signed-contract'];
  await load();
  await check('documents', 'À compléter');

  dossier = structuredClone(missionTrackingDossier);
  dossier.revision += 1;
  await load();
  await check('documents', 'À compléter');

  dossier = structuredClone(missionTrackingDossier);
  dossier.missingFields = ['holderName'];
  await load();
  await check('documents', 'À compléter');

  unavailable = true;
  await load();
  await check('documents', 'À consulter');
  unavailable = false;
  dossier = structuredClone(missionTrackingDossier);

  await page.clock.setFixedTime(new Date('2026-09-20T10:00:00.000Z'));
  await load();
  await check('replacement', 'Période écoulée', true);
  await check('completed', 'À valider');
  await active('completed');
  await check('payment', 'À suivre');
  currentAgreement.status = 'COMPLETED';
  await load();
  await check('replacement', 'Terminé', true);
  await check('completed', 'Validée', true);
  await check('payment', 'À suivre');
  await active('payment');
  currentAgreement.status = 'PAYMENT_RELEASED';
  await load();
  await check('payment', 'Validée', true);
  assert.equal(await page.locator('[aria-current="step"]').count(), 0);

  currentAgreement.compensationMode = 'FIXED_AMOUNT';
  await load();
  await check('payment', 'Libéré', true);
  currentAgreement.status = 'FUNDS_SECURED';
  await load();
  await check('payment', 'Sécurisé');

  currentAgreement = { ...agreement, status: 'PROPOSED' };
  currentApplication = { ...application, status: 'SUBMITTED' };
  await page.clock.setFixedTime(new Date('2026-09-10T10:00:00.000Z'));
  await load();
  await check('confirmed', 'À confirmer');
  await check('replacement', 'À venir');

  currentAgreement = structuredClone(agreement);
  currentApplication = structuredClone(application);
  await page.clock.setFixedTime(new Date(capturedAt));
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 1100 });
    await load();
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `no horizontal overflow at ${width}px`);
    await check('documents', 'Transmis', true);
    await check('payment', 'À suivre');
  }
  assert.deepEqual(errors, []);
  console.log('Mission progress: transmission, revisions, missing data, dates, payment, tab refresh and responsive checks passed.');
} finally {
  await browser.close();
}
