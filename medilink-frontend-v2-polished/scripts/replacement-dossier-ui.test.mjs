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

async function scenario(role, width, test, prepare = () => {}) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'fr-FR', timezoneId: 'Europe/Paris', reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const state = structuredClone(replacementDossier);
  prepare(state);
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
    await page.locator('.replacement-dossier .rd-document-register .rd-document-row').first().waitFor();
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
      await subject.getByRole('button', { name: 'Transmettre le dossier', exact: true }).waitFor();
      await subject.screenshot({ path: path.join(output, `${role}-${width}.png`) });
      assert.match(await subject.locator('[data-kind="CONTRACT"]').innerText(), /relire|signer/i);
      await subject.getByRole('button', { name: 'Informations du remplacement', exact: true }).click();
      assert.equal(await page.getByLabel('Nom du remplaçant', { exact: true }).inputValue(), 'Sarah Bernard');
      await page.getByLabel('Statut du remplaçant', { exact: true }).selectOption('STUDENT');
      await page.getByLabel('N° de licence', { exact: true }).waitFor();
      await subject.screenshot({ path: path.join(output, `${role}-${width}-form.png`) });
    });
  }
  await scenario('candidate', 1280, async ({ page, subject, state, requests, failSend }) => {
    const contractRow = subject.locator('.rd-document-row[data-kind="CONTRACT"]');
    await contractRow.getByRole('button', { name: 'Gérer Contrat de remplacement', exact: true }).click();
    await subject.getByRole('button', { name: 'Régénérer le contrat', exact: true }).click();
    await subject.getByText(/Le PDF est prêt/).waitFor();
    assert.equal(state.documents.filter(doc => doc.kind === 'CONTRACT').length, 2, 'Previous contract kept');
    await contractRow.getByRole('button', { name: 'Gérer Contrat de remplacement', exact: true }).click();
    await subject.getByRole('button', { name: 'Ajouter l’exemplaire signé', exact: true }).click();
    await page.getByLabel(/^Fichier/).setInputFiles({ name: 'contrat-signe.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% browser fixture only\n%%EOF') });
    await subject.getByRole('button', { name: 'Ajouter au dossier', exact: true }).click();
    await contractRow.getByText(/signé/i).waitFor();
    assert.ok(requests.some(request => request.endpoint.endsWith('/confirm')));
    await subject.getByRole('button', { name: 'Transmettre le dossier', exact: true }).click();
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
  await scenario('candidate', 390, async ({ page, subject, state, requests }) => {
    const declaration = state.documents.find(document => document.kind === 'DECLARATION');
    const declarationRow = subject.locator('.rd-document-row[data-kind="DECLARATION"]');
    await declarationRow.getByRole('button', { name: /Transmettre/, exact: false }).click();
    assert.equal(await page.getByLabel('Destinataire', { exact: true }).inputValue(), 'ORDER');
    assert.equal(await page.getByLabel(/^Adresse email/).inputValue(), state.details.orderEmail);
    const checked = page.locator('.rd-send-selection input:checked');
    assert.equal(await checked.count(), 1, 'The row action selects only the chosen document');
    assert.equal(await page.locator('.rd-send-selection label').filter({ hasText: declaration.fileName }).getByRole('checkbox').isChecked(), true);
    assert.equal(requests.filter(request => request.endpoint.endsWith('/send')).length, 0, 'Opening transmission sends no email');
    const sendButton = page.getByRole('button', { name: 'Confirmer et envoyer', exact: true });
    assert.equal(await sendButton.isEnabled(), false, 'A preselected document still requires explicit review');
    const confirmation = page.getByRole('checkbox', { name: /J’ai vérifié/ });
    await confirmation.check();
    await page.getByLabel(/^Adresse email/).fill('autre-conseil@example.test');
    assert.equal(await confirmation.isChecked(), false, 'Changing recipient resets confirmation');
    assert.equal(await sendButton.isEnabled(), false);
    assert.equal(requests.filter(request => request.endpoint.endsWith('/send')).length, 0);
    await confirmation.check();
    await sendButton.click();
    await subject.getByText(/Le dossier a été envoyé/).waitFor();
    const sent = requests.filter(request => request.endpoint.endsWith('/send'));
    assert.equal(sent.length, 1);
    assert.deepEqual(sent[0].body.documentIds, [declaration.id]);
    assert.equal(sent[0].body.recipientEmail, 'autre-conseil@example.test');
    assert.equal(sent[0].body.recipientType, 'ORDER');
  }, state => {
    // Keep this workflow independent from the illustrative landing's document mix.
    if (!state.documents.some(document => document.kind === 'DECLARATION')) {
      state.documents.push({ ...state.documents.find(document => document.kind === 'CONTRACT'), id: 'test-declaration', kind: 'DECLARATION', fileName: 'Declaration-test.pdf', status: 'READY', source: 'GENERATED', revision: state.revision });
    }
  });
  await scenario('candidate', 390, async ({ subject, requests }) => {
    assert.equal(await subject.getByRole('button', { name: 'Transmettre le dossier', exact: true }).isEnabled(), false);
    assert.equal(await subject.getByRole('button', { name: 'Informations du remplacement', exact: true }).count(), 0);
    assert.equal(await subject.locator('.rd-document-register').getByRole('button', { name: /^(Générer|Actualiser|Ajouter|Remplacer|Transmettre)\b/ }).count(), 0, 'Read-only rows expose no editing or transmission action');
    assert.equal(requests.filter(request => request.method !== 'GET').length, 0);
  }, state => { state.canEdit = false; state.canSend = false; });
  await scenario('candidate', 390, async ({ page, subject, state, requests }) => {
    await subject.locator('.rd-document-row[data-kind="CONTRACT"]').getByRole('button', { name: 'Actualiser Contrat de remplacement', exact: true }).waitFor();
    await subject.getByRole('button', { name: 'Transmettre le dossier', exact: true }).click();
    const choices = await page.locator('.rd-send-selection').innerText();
    for (const document of state.documents.filter(document => document.source === 'GENERATED' || document.kind === 'INSURANCE')) {
      assert.ok(!choices.includes(document.fileName), 'Outdated and expired documents cannot be selected for transmission');
    }
    assert.ok(choices.includes(state.documents.find(document => document.kind === 'REGISTRATION').fileName), 'A current supporting document remains available');
    assert.equal(requests.filter(request => request.endpoint.endsWith('/send')).length, 0);
  }, state => {
    state.revision++;
    const insurance = state.documents.find(document => document.kind === 'INSURANCE');
    if (insurance) insurance.expiresAt = '2026-09-01T00:00:00.000Z';
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
  console.log('PASS compact register, generation, signed upload, contextual transmission, recipient/attachment review, permission gating, outdated document exclusion, failed send, idempotent retry and edit conflict. All requests were intercepted; no real document was sent.');
} finally { await browser.close(); }
