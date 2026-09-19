import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { application, conversation, documents, establishment, fixtureResponse, mission, profile, replacementDossier, capturedAt } from './fixtures/landing-interface.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE_PATH || path.join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const base = (process.argv[2] || 'http://127.0.0.1:3000').replace(/\/$/, '');
const origin = new URL(base).origin;
const output = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../output/dossier-review');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, ...(process.platform === 'win32' ? { channel: 'msedge' } : {}) });
const reports = [];

async function scenario(role, width, test) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'fr-FR', timezoneId: 'Europe/Paris', reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const state = structuredClone(replacementDossier);
  const requests = [];
  const unexpected = [];
  const errors = [];
  let failNextSend = false;
  let conflictNextSave = false;
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.setFixedTime(new Date(capturedAt));
  await context.route('**/*', async route => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/__dossier-test-upload') return route.fulfill({ status: 200, body: '' });
    if (url.pathname.startsWith('/api/') || url.port === '4000') {
      const endpoint = url.pathname.replace(/^\/api/, '');
      const method = request.method();
      const body = request.postDataJSON();
      const json = data => route.fulfill({ json: structuredClone(data) });
      if (endpoint.startsWith('/applications/preview-application/dossier')) {
        requests.push({ endpoint, method, body });
        if (method === 'GET') return json(state);
        if (method === 'PUT') {
          if (conflictNextSave) {
            conflictNextSave = false; state.revision++; state.details.holderName = 'Nom modifié par le titulaire';
            return route.fulfill({ status: 409, json: { message: 'Le dossier a été modifié par votre interlocuteur.' } });
          }
          assert.equal(body.revision, state.revision);
          state.details = body.details; state.revision++;
          return json(state);
        }
        if (endpoint.endsWith('/generate')) {
          assert.equal(body.revision, state.revision);
          const version = Math.max(0, ...state.documents.filter(item => item.kind === body.kind).map(item => item.version)) + 1;
          state.documents.unshift({ ...state.documents[0], id: `generated-${body.kind}-${version}`, kind: body.kind, fileName: `${body.kind}-v${version}.pdf`, version, revision: state.revision, createdAt: capturedAt, source: 'GENERATED' });
          return json(state);
        }
        if (endpoint.endsWith('/upload-url')) {
          const doc = { ...body, id: 'test-upload', version: 1, status: 'UPLOADING', source: 'UPLOADED', createdAt: capturedAt };
          state.documents.unshift(doc);
          return json({ documentId: doc.id, uploadUrl: `${base}/__dossier-test-upload`, method: 'PUT', headers: { 'Content-Type': body.mimeType } });
        }
        if (endpoint.endsWith('/confirm')) { state.documents.find(item => item.id === 'test-upload').status = 'READY'; return json(state); }
        if (endpoint.endsWith('/send')) {
          assert.ok(body.idempotencyKey);
          assert.ok(body.documentIds.every(id => state.documents.some(item => item.id === id)));
          let delivery = state.deliveries.find(item => item.idempotencyKey === body.idempotencyKey);
          if (!delivery) { delivery = { ...body, id: `delivery-${state.deliveries.length}`, createdAt: capturedAt }; state.deliveries.unshift(delivery); }
          delivery.status = failNextSend ? 'FAILED' : 'SENT'; delivery.error = failNextSend ? 'Échec temporaire du service email.' : null;
          delivery.sentAt = failNextSend ? null : capturedAt; failNextSend = false;
          return json(state);
        }
        if (method === 'DELETE') { state.documents = state.documents.filter(item => !endpoint.endsWith(`/${item.id}`)); return json(state); }
      }
      if (role === 'establishment') {
        if (endpoint === '/auth/me') return json({ id: 'preview-recruiter', email: 'thomas.martin@example.test', role: 'ESTABLISHMENT_OWNER', status: 'ACTIVE', emailVerified: true });
        if (endpoint === '/establishments/me') return json([{ ...establishment, members: [{ userId: 'preview-recruiter', role: 'OWNER' }] }]);
        if (endpoint === '/establishment/applications') return json([application]);
        if (endpoint === '/missions/mine') return json([mission]);
        if (endpoint === '/establishment/applications/preview-application/candidate-profile') return json({ application, mission, conversation, candidate: { id: profile.userId, profile, documents } });
        if (endpoint === '/conversations/c1') return json(conversation);
        if (endpoint.includes('/billing/establishments/')) return json({ availableCredits: 0, totalCredits: 0 });
        if (endpoint === '/establishment/dashboard') return json({ missions: [mission], applications: [application], conversations: [conversation], notifications: [], stats: {} });
        if (endpoint === '/workspace-notes') return json([]);
      }
      const fixture = fixtureResponse(endpoint, method);
      if (fixture?.eventStream) return route.fulfill({ status: 200, contentType: 'text/event-stream', body: ': fixture\n\n' });
      if (fixture) return json(fixture.data);
      unexpected.push(`${method} ${endpoint}`);
      return route.fulfill({ status: 418, json: { message: `Unmocked request: ${endpoint}` } });
    }
    if (url.origin === origin) return route.continue();
    unexpected.push(`EXTERNAL ${url.origin}${url.pathname}`);
    return route.abort();
  });
  try {
    await page.goto(`${base}/${role === 'candidate' ? 'app' : 'establishment'}/current-missions?section=documents`, { waitUntil: 'domcontentloaded' });
    await page.locator('.replacement-dossier .rd-contract').waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' });
    const subject = page.locator('.replacement-dossier');
    await test({ page, subject, state, requests, failSend: () => { failNextSend = true; }, conflictSave: () => { conflictNextSave = true; } });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${role}/${width}: no horizontal overflow`);
    assert.deepEqual(errors, [], `${role}/${width}: no client errors`);
    assert.deepEqual(unexpected, [], `${role}/${width}: no external API requests`);
    reports.push(`PASS ${role}/${width}`);
  } catch (error) {
    console.error('Page state:', (await page.locator('body').innerText()).slice(-4000));
    console.error('Unexpected requests:', unexpected);
    throw error;
  } finally { await context.close(); }
}

try {
  for (const [role, width] of [['candidate', 1280], ['candidate', 390], ['candidate', 320], ['establishment', 1280]]) {
    await scenario(role, width, async ({ page, subject }) => {
      await subject.getByRole('button', { name: 'Envoyer le dossier', exact: true }).waitFor();
      await subject.screenshot({ path: path.join(output, `${role}-${width}.png`) });
      assert.match(await subject.innerText(), /À relire et signer/);
      await subject.getByRole('button', { name: 'Informations du remplacement', exact: true }).click();
      assert.equal(await page.getByLabel('Nom du remplaçant', { exact: true }).inputValue(), 'Sarah Bernard');
      await page.getByLabel('Statut du remplaçant', { exact: true }).selectOption('STUDENT');
      await page.getByLabel('N° de licence', { exact: true }).waitFor();
      await subject.screenshot({ path: path.join(output, `${role}-${width}-form.png`) });
    });
  }
  await scenario('candidate', 1280, async ({ page, subject, state, requests, failSend }) => {
    await subject.getByRole('button', { name: 'Régénérer le contrat', exact: true }).click();
    await subject.getByText('Version 2', { exact: true }).waitFor();
    assert.equal(state.documents.filter(doc => doc.kind === 'CONTRACT').length, 2, 'Previous contract kept');
    await subject.getByRole('button', { name: 'Ajouter l’exemplaire signé', exact: true }).click();
    await page.getByLabel(/^Fichier/).setInputFiles({ name: 'contrat-signe.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% browser fixture only\n%%EOF') });
    await subject.getByRole('button', { name: 'Ajouter au dossier', exact: true }).click();
    await subject.locator('.rd-contract').getByText('Exemplaire signé ajouté', { exact: false }).waitFor();
    assert.ok(requests.some(request => request.endpoint.endsWith('/confirm')));
    await subject.getByRole('button', { name: 'Envoyer le dossier', exact: true }).click();
    await page.getByLabel('Destinataire', { exact: true }).selectOption('ORDER');
    assert.equal(await page.getByLabel(/^Adresse email/).inputValue(), state.details.orderEmail);
    await page.locator('.rd-send-selection label').filter({ hasText: 'Contrat signé' }).getByRole('checkbox').check();
    assert.equal(await page.getByRole('button', { name: 'Confirmer et envoyer', exact: true }).isEnabled(), false, 'Explicit review is required');
    await page.getByRole('checkbox', { name: /J’ai vérifié/ }).check();
    failSend();
    await page.getByRole('button', { name: 'Confirmer et envoyer', exact: true }).click();
    await page.getByRole('alert').filter({ hasText: /[ée]chec|[ée]chou|confirmé|indisponible/i }).waitFor();
    assert.equal(state.deliveries[0].status, 'FAILED');
    await page.getByRole('button', { name: 'Confirmer et envoyer', exact: true }).click();
    await subject.getByText(/Le dossier a été envoyé/).waitFor();
    assert.equal(state.deliveries.length, 1, 'A retry reuses the same delivery idempotency key');
    assert.equal(state.deliveries[0].status, 'SENT');
    await subject.locator('summary').filter({ hasText: 'Versions et envois' }).click();
    await subject.screenshot({ path: path.join(output, 'workflow-history.png') });
  });
  await scenario('candidate', 1280, async ({ page, subject, state, conflictSave }) => {
    await subject.getByRole('button', { name: 'Informations du remplacement', exact: true }).click();
    await page.getByLabel('Nom du médecin remplacé', { exact: true }).fill('Saisie locale');
    conflictSave();
    await page.getByRole('button', { name: 'Enregistrer les informations', exact: true }).click();
    await page.getByRole('button', { name: 'Recharger les informations du dossier', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Enregistrer les informations', exact: true }).isEnabled(), false);
    assert.equal(await page.getByLabel('Nom du médecin remplacé', { exact: true }).inputValue(), 'Saisie locale', 'Conflicting local draft remains readable');
    await page.getByRole('button', { name: 'Recharger les informations du dossier', exact: true }).click();
    assert.equal(await page.getByLabel('Nom du médecin remplacé', { exact: true }).inputValue(), state.details.holderName);
    await page.getByRole('button', { name: 'Enregistrer les informations', exact: true }).click();
    await subject.getByText(/Informations enregistrées/).waitFor();
  });
  console.log(reports.join('\n'));
  console.log('PASS generation, signed upload, recipient/attachment review, failed send, idempotent retry and edit conflict. All requests were intercepted; no real document was sent.');
} finally { await browser.close(); }
