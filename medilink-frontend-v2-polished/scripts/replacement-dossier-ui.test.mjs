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

async function captureSubject(page, subject, filename) {
  const viewport = page.viewportSize();
  const box = await subject.boundingBox();
  await page.setViewportSize({ ...viewport, height: Math.max(viewport.height, Math.ceil(box.height) + 240) });
  await subject.evaluate(element => window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY - 90, behavior: 'instant' }));
  await subject.screenshot({ path: path.join(output, filename) });
  await page.setViewportSize(viewport);
}

async function scenario(role, width, test, prepare = () => {}) {
  const context = await browser.newContext({ viewport: { width, height: 1000 }, locale: 'fr-FR', timezoneId: 'Europe/Paris', reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const state = structuredClone(replacementDossier);
  const fixtureConversation = structuredClone(conversation);
  prepare(state, fixtureConversation);
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
    if (url.pathname === '/__dossier-test-file') return route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4\n% local download fixture\n%%EOF' });
    if (url.pathname.startsWith('/api/') || url.port === '4000') {
      const endpoint = url.pathname.replace(/^\/api/, '');
      const method = request.method();
      const body = request.postDataJSON();
      const json = data => route.fulfill({ json: structuredClone(data) });
      if (endpoint === '/conversations') return json([fixtureConversation]);
      if (endpoint === '/conversations/c1') return json(fixtureConversation);
      if (endpoint === '/me/dashboard') return json({ profile, documents, applications: [application], conversations: [fixtureConversation], notifications: [] });
      if (/^\/conversations\/c1\/invoices\/(candidate|recruiter)\.pdf$/.test(endpoint)) {
        requests.push({ endpoint, method, body });
        return route.fulfill({ status: 200, contentType: 'application/pdf', body: '%PDF-1.4\n% test payment receipt\n%%EOF' });
      }
      if (endpoint.startsWith('/applications/preview-application/dossier')) {
        requests.push({ endpoint, method, body });
        if (method === 'GET' && endpoint.endsWith('/download-url')) return json({ downloadUrl: `${base}/__dossier-test-file` });
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
          const version = Math.max(0, ...state.documents.filter(document => document.kind === body.kind).map(document => document.version)) + 1;
          const doc = { ...body, id: `test-upload-${state.documents.length}`, version, status: 'UPLOADING', source: 'UPLOADED', createdAt: capturedAt };
          state.documents.unshift(doc);
          return json({ documentId: doc.id, uploadUrl: `${base}/__dossier-test-upload`, method: 'PUT', headers: { 'Content-Type': body.mimeType } });
        }
        if (endpoint.endsWith('/confirm')) { state.documents.find(item => endpoint.endsWith(`/documents/${item.id}/confirm`)).status = 'READY'; return json(state); }
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
        if (endpoint === '/establishment/applications') return json([{ ...application, conversation: fixtureConversation }]);
        if (endpoint === '/missions/mine') return json([mission]);
        if (endpoint === '/establishment/applications/preview-application/candidate-profile') return json({ application, mission, conversation: fixtureConversation, candidate: { id: profile.userId, profile, documents } });
        if (endpoint.includes('/billing/establishments/')) return json({ availableCredits: 0, totalCredits: 0 });
        if (endpoint === '/establishment/dashboard') return json({ missions: [mission], applications: [application], conversations: [fixtureConversation], notifications: [], stats: {} });
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
  for (const [role, width] of [['candidate', 1280], ['candidate', 900], ['candidate', 390], ['candidate', 320], ['establishment', 1280]]) {
    await scenario(role, width, async ({ page, subject }) => {
      await subject.getByRole('button', { name: 'Transmettre le dossier', exact: true }).waitFor();
      await captureSubject(page, subject, `${role}-${width}.png`);
      assert.match(await subject.locator('[data-kind="CONTRACT"]').innerText(), /relire|signer/i);
      assert.equal(await subject.locator('.rd-document-row').count(), 3);
      if (width <= 390) {
        assert.ok((await subject.boundingBox()).height < 850, 'The initial mobile register stays compact');
        const buttons = subject.locator('[data-kind="CONTRACT"] .rd-row-actions button');
        assert.deepEqual(await buttons.allTextContents(), ['Télécharger', 'Transmettre', 'Gérer']);
        for (const button of await buttons.all()) {
          const bounds = await button.boundingBox();
          assert.ok(bounds.height >= 44, 'Mobile actions remain touch sized');
          assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width, 'Every named action fits the mobile viewport');
        }
      }
      await subject.getByRole('button', { name: 'Informations du remplacement', exact: true }).click();
      assert.equal(await page.getByLabel('Nom du remplaçant', { exact: true }).inputValue(), 'Sarah Bernard');
      await page.getByLabel('Statut du remplaçant', { exact: true }).selectOption('STUDENT');
      await page.getByLabel('N° de licence', { exact: true }).waitFor();
      await subject.screenshot({ path: path.join(output, `${role}-${width}-form.png`) });
    });
  }
  await scenario('candidate', 390, async ({ page, subject, state, requests }) => {
    const contractRow = subject.locator('.rd-document-row[data-kind="CONTRACT"]');
    const downloadEvent = page.waitForEvent('download');
    await contractRow.getByRole('button', { name: 'Télécharger Contrat de remplacement', exact: true }).click();
    const downloaded = await downloadEvent;
    assert.equal(downloaded.suggestedFilename(), state.documents.find(doc => doc.kind === 'CONTRACT').fileName);
    assert.equal(await downloaded.failure(), null, 'The file is downloaded, not merely previewed');
    assert.ok(requests.some(request => request.endpoint.endsWith('/download-url')));
    const insurance = state.documents.find(doc => doc.kind === 'INSURANCE');
    await subject.getByRole('button', { name: 'Documents suivants', exact: true }).click();
    await subject.locator('[data-kind="INSURANCE"]').getByRole('button', { name: /^Transmettre/ }).click();
    assert.equal(await page.getByLabel('Destinataire', { exact: true }).inputValue(), 'COUNTERPART');
    assert.equal(await page.locator('.rd-send-selection input:checked').count(), 1);
    assert.equal(await page.locator('.rd-send-selection label').filter({ hasText: insurance.fileName }).getByRole('checkbox').isChecked(), true);
    assert.equal(await page.getByRole('button', { name: 'Confirmer et envoyer', exact: true }).isEnabled(), false);
    assert.equal(requests.filter(request => request.endpoint.endsWith('/send')).length, 0, 'Per-document transmission still requires confirmation');
  });
  await scenario('candidate', 320, async ({ page, subject, state, requests }) => {
    const categories = subject.getByRole('group', { name: 'Rubriques du dossier', exact: true });
    await categories.getByRole('button', { name: /^Paiement/ }).click();
    assert.deepEqual(await subject.locator('.rd-document-row').evaluateAll(rows => rows.map(row => row.dataset.kind)), ['BANK_DETAILS', 'FEE_STATEMENT', 'PAYMENT_PROOF']);
    assert.equal(await subject.getByRole('button', { name: /^Générer/ }).count(), 0, 'Payment documents are imports');
    await captureSubject(page, subject, 'payment-320.png');
    await categories.getByRole('button', { name: /^Compléments/ }).click();
    assert.deepEqual(await subject.locator('.rd-document-row').evaluateAll(rows => rows.map(row => row.dataset.kind)), ['ADDENDUM', 'REPLACEMENT_CERTIFICATE', 'ORDER_RESPONSE']);
    assert.match(await subject.locator('[data-kind="REPLACEMENT_CERTIFICATE"]').innerText(), /Si nécessaire/);
    await captureSubject(page, subject, 'additional-320.png');
    for (const kind of ['ADDENDUM', 'REPLACEMENT_CERTIFICATE', 'ORDER_RESPONSE', 'BANK_DETAILS', 'FEE_STATEMENT', 'PAYMENT_PROOF', 'OTHER']) {
      await subject.getByRole('button', { name: 'Ajouter une pièce', exact: true }).click();
      await page.getByLabel('Nature de la pièce', { exact: true }).selectOption(kind);
      await subject.getByText('Cette pièce sera visible par vous et l’autre partie du remplacement.', { exact: true }).waitFor();
      await page.getByLabel(/^Fichier/).setInputFiles({ name: `piece-${kind}.pdf`, mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4\n% new document fixture\n%%EOF') });
      await subject.getByRole('button', { name: 'Ajouter au dossier', exact: true }).click();
      const added = subject.locator(`.rd-document-row[data-kind="${kind}"]`).filter({ hasText: kind === 'OTHER' || kind === 'ADDENDUM' || kind === 'ORDER_RESPONSE' ? `piece-${kind}.pdf` : 'Pièce ajoutée' });
      await added.waitFor();
      assert.equal(await subject.locator('.rd-edit-panel').count(), 0, 'Successful upload closes the form');
      assert.ok(await subject.locator('.rd-document-row').count() <= 3, 'Uploads reveal the file without expanding the list');
      assert.equal(await added.getByRole('button', { name: /^Télécharger/ }).count(), 1);
      assert.equal(await added.getByRole('button', { name: /^Transmettre/ }).count(), 1);
      assert.equal(await added.getByRole('button', { name: /^Gérer/ }).count(), 1);
      assert.ok(state.documents.some(document => document.kind === kind && document.fileName === `piece-${kind}.pdf` && document.status === 'READY'));
      if (kind === 'REPLACEMENT_CERTIFICATE') {
        await added.getByRole('button', { name: /^Transmettre/ }).click();
        assert.equal(await page.getByLabel('Destinataire', { exact: true }).inputValue(), 'CPAM');
        assert.equal(await page.getByLabel(/^Nom du destinataire/).inputValue(), '');
        assert.equal(await page.getByLabel(/^Adresse email/).inputValue(), '', 'The CPAM email is supplied by the user, never guessed');
        assert.equal(await page.locator('.rd-send-selection input:checked').count(), 1);
        assert.equal(await page.getByRole('button', { name: 'Confirmer et envoyer', exact: true }).isEnabled(), false);
        await subject.getByRole('button', { name: 'Fermer le formulaire', exact: true }).click();
      }
    }
    assert.equal(requests.filter(request => request.endpoint.endsWith('/send')).length, 0, 'Adding files never sends them');
  });
  await scenario('candidate', 390, async ({ page, subject, state, requests }) => {
    await subject.getByRole('button', { name: /^Compléments/ }).click();
    const seen = new Set();
    do {
      assert.ok(await subject.locator('.rd-document-row').count() <= 3, 'Large dossiers keep a bounded register');
      for (const id of await subject.locator('.rd-document-row[data-document-id]').evaluateAll(rows => rows.map(row => row.dataset.documentId))) seen.add(id);
      const next = subject.getByRole('button', { name: 'Documents suivants', exact: true });
      if (!(await next.isEnabled())) break;
      await next.click();
    } while (true);
    const extras = state.documents.filter(document => ['OTHER', 'ADDENDUM', 'ORDER_RESPONSE'].includes(document.kind));
    for (const document of extras) assert.ok(seen.has(document.id), `${document.fileName} is reachable`);
    const last = subject.locator('.rd-document-row[data-document-id]').last();
    const id = await last.getAttribute('data-document-id');
    const file = state.documents.find(document => document.id === id);
    await last.getByRole('button', { name: /^Gérer/ }).click();
    assert.equal(await subject.locator('.rd-managed-file strong').innerText(), file.fileName, 'Manage opens the chosen attachment, not the latest file of its kind');
    await subject.getByRole('button', { name: 'Transmettre ce document', exact: true }).click();
    assert.equal(await page.locator('.rd-send-selection input:checked').count(), 1);
    assert.equal(await page.locator('.rd-send-selection label').filter({ hasText: file.fileName }).getByRole('checkbox').isChecked(), true);
    assert.equal(requests.filter(request => request.endpoint.endsWith('/send')).length, 0);
  }, state => {
    for (let index = 1; index <= 11; index++) state.documents.push({ ...state.documents.find(document => document.kind === 'INSURANCE'), id: `extra-${index}`, kind: index < 3 ? 'ADDENDUM' : index < 5 ? 'ORDER_RESPONSE' : 'OTHER', fileName: `Complement-${index}-avec-un-nom-de-fichier-tres-long.pdf`, expiresAt: null, version: index });
  });
  await scenario('candidate', 390, async ({ subject }) => {
    assert.equal(await subject.locator('[data-kind="REGISTRATION"]').count(), 0);
    assert.equal(await subject.locator('[data-kind="LICENSE"]').count(), 1);
    await subject.getByRole('button', { name: 'Documents suivants', exact: true }).click();
    assert.equal(await subject.locator('[data-kind="AUTHORIZATION"]').count(), 1);
    assert.equal(await subject.locator('[data-kind="INSURANCE"]').count(), 1);
    await subject.getByRole('button', { name: /^Paiement/ }).click();
    assert.equal(await subject.locator('[data-kind="PLATFORM_RECEIPT"]').count(), 0, 'A receipt is not offered before payment');
  }, state => { state.details.replacementKind = 'STUDENT'; });
  for (const role of ['candidate', 'establishment']) await scenario(role, 390, async ({ page, subject, requests }) => {
    await subject.getByRole('button', { name: /^Paiement/ }).click();
    const receipt = subject.locator('[data-kind="PLATFORM_RECEIPT"]');
    await receipt.waitFor();
    const downloadEvent = page.waitForEvent('download');
    await receipt.getByRole('button', { name: 'Télécharger le justificatif MediLink', exact: true }).click();
    assert.equal(await (await downloadEvent).failure(), null);
    const type = role === 'candidate' ? 'candidate' : 'recruiter';
    assert.ok(requests.some(request => request.endpoint === `/conversations/c1/invoices/${type}.pdf`));
    assert.equal(await receipt.getByRole('link', { name: 'Mes règlements' }).getAttribute('href'), `/${role === 'candidate' ? 'app' : 'establishment'}/billing`);
    await captureSubject(page, subject, `${role}-payment-receipt.png`);
  }, (_state, conversation) => { conversation.agreements[0].status = 'PAYMENT_RELEASED'; });
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
