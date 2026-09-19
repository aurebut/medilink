import 'reflect-metadata';
import { strict as assert } from 'assert';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { mkdir, mkdtemp, open, rm } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Readable } from 'stream';
import { StorageService } from '../src/modules/documents/storage.service';
import { EmailService } from '../src/modules/notifications/email.service';
import { DossierDetails } from '../src/modules/replacement-dossiers/dossier-types';
import { SendDossierDto, UploadDossierDto } from '../src/modules/replacement-dossiers/dossier.dto';
import { ReplacementDossiersService } from '../src/modules/replacement-dossiers/replacement-dossiers.service';

const details: DossierDetails = {
  practiceFramework: 'INDIVIDUAL_LIBERAL', replacementKind: 'DOCTOR',
  holderName: 'Camille Martin', holderRpps: '10001234567', holderOrderNumber: '75/12345',
  holderAddress: '12 rue des Lilas, 75011 Paris', holderEmail: 'holder@example.test',
  replacementName: 'Alex Moreau', replacementRpps: '10007654321', replacementOrderNumber: '75/67890',
  replacementAddress: '8 rue des Fleurs, 75012 Paris', replacementEmail: 'candidate@example.test',
  licenseNumber: '', licenseValidUntil: '', specialty: 'Médecine générale',
  practiceAddress: '12 rue des Lilas, 75011 Paris', startDate: '2030-10-01', endDate: '2030-10-05',
  scheduleDetails: 'Du lundi au vendredi, 9 h à 18 h', retrocessionPercent: 80,
  paymentTerms: 'Règlement par virement sous quinze jours suivant le remplacement.',
  orderCouncilName: 'Conseil départemental de Paris', orderEmail: 'ordre@example.test',
};
const user = (id: string) => ({ id, email: `${id}@example.test`, role: 'CANDIDATE', status: 'ACTIVE', emailVerified: true }) as any;

function matches(item: any, where: any = {}): boolean {
  return Object.entries(where).every(([key, value]: [string, any]) => {
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      if ('in' in value) return value.in.includes(item[key]);
      if ('not' in value) return item[key] !== value.not;
      return Object.entries(value).every(([field, expected]) => item[field] === expected);
    }
    return item[key] === value;
  });
}

/** Deliberately no DB/network: exercise service policies against deterministic state. */
function setup(storage: StorageService) {
  let sequence = 0;
  const documents: any[] = [];
  const deliveries: any[] = [];
  const dossier = { id: 'dossier-1', applicationId: 'application-1', revision: 1, details: { ...details } };
  const application = {
    id: 'application-1', candidateUserId: 'candidate', status: 'ACCEPTED',
    candidate: { email: 'candidate@example.test', profile: { firstName: 'Alex', lastName: 'Moreau', medicalStatus: 'DOCTOR', rpps: details.replacementRpps } },
    agreements: [],
    mission: { id: 'mission-1', missionType: 'REMPLACEMENT', establishmentId: 'establishment-1', specialty: details.specialty,
      startDate: new Date('2030-10-01'), endDate: new Date('2030-10-05'), establishment: { name: 'Cabinet', address: details.practiceAddress, city: 'Paris' } },
  };
  const model = (items: any[]) => ({
    findMany: async ({ where, orderBy }: any) => {
      const result = items.filter((item) => matches(item, where));
      return orderBy?.createdAt ? result.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) : result;
    },
    findFirst: async ({ where, orderBy }: any) => {
      const result = items.filter((item) => matches(item, where));
      if (orderBy?.version) result.sort((a, b) => b.version - a.version);
      return result[0] || null;
    },
    findUnique: async ({ where }: any) => items.find((item) => matches(item, where)) || null,
    create: async ({ data }: any) => {
      const item = { id: `record-${++sequence}`, createdAt: new Date(Date.now() + sequence), archivedAt: null, expiresAt: null, ...data };
      items.push(item); return item;
    },
    update: async ({ where, data }: any) => {
      const item = items.find((entry) => matches(entry, where));
      if (!item) throw new Error('Record missing');
      Object.assign(item, data); return item;
    },
    updateMany: async ({ where, data }: any) => {
      const matched = items.filter((item) => matches(item, where));
      matched.forEach((item) => Object.assign(item, data));
      return { count: matched.length };
    },
  });
  const prisma: any = {
    application: { findUnique: async ({ where }: any) => where.id === application.id ? application : null },
    establishmentMember: { findUnique: async ({ where }: any) => {
      const id = where.establishmentId_userId.userId;
      return ['owner', 'admin', 'recruiter', 'viewer'].includes(id) ? { role: id.toUpperCase() } : null;
    } },
    replacementDossier: {
      upsert: async () => dossier,
      findUnique: async () => dossier,
      findUniqueOrThrow: async () => dossier,
      updateMany: async ({ where, data }: any) => {
        if (!matches(dossier, where)) return { count: 0 };
        if (data.details) dossier.details = data.details;
        if (data.revision?.increment) dossier.revision += data.revision.increment;
        return { count: 1 };
      },
    },
    replacementDossierDocument: model(documents), replacementDossierDelivery: model(deliveries),
  };
  prisma.$transaction = async (callback: any) => callback(prisma);
  let available = true;
  let failures = 0;
  let sends = 0;
  const sentKeys: string[] = [];
  const email = {
    isDossierDeliveryAvailable: () => available,
    sendDossierEmail: async (params: any) => {
      sends += 1; sentKeys.push(params.idempotencyKey);
      assert.ok(params.attachments[0].content.length > 0, 'Email receives real attachment bytes.');
      if (failures-- > 0) throw new Error('Simulated provider failure');
      return { providerMessageId: `provider-${sends}` };
    },
  };
  const service = new ReplacementDossiersService(prisma, storage, email as any, { log: async () => undefined } as any);
  return { service, prisma, dossier, documents, deliveries, application, sentKeys,
    setAvailable: (value: boolean) => { available = value; }, setFailures: (value: number) => { failures = value; }, sends: () => sends };
}

async function expectStatus(action: () => Promise<unknown>, status: number) {
  await assert.rejects(action, (error: any) => error.getStatus?.() === status);
}

async function testPermissions(storage: StorageService) {
  const env = setup(storage);
  for (const id of ['candidate', 'owner', 'admin', 'recruiter']) {
    assert.equal((await env.service.get(user(id), 'application-1')).canEdit, true);
  }
  for (const id of ['other-candidate', 'viewer', 'medilink-admin']) {
    await expectStatus(() => env.service.get(user(id), 'application-1'), 403);
    await expectStatus(() => env.service.update(user(id), 'application-1', { revision: 1, details }), 403);
    await expectStatus(() => env.service.download(user(id), 'application-1', 'document-1'), 403);
    await expectStatus(() => env.service.send(user(id), 'application-1', {} as any), 403);
  }
  env.application.status = 'WITHDRAWN';
  assert.equal((await env.service.get(user('candidate'), 'application-1')).canEdit, false);
  await expectStatus(() => env.service.update(user('candidate'), 'application-1', { revision: 1, details }), 403);
  console.log('PASS dossier permissions: candidate, institution roles, cross-candidate denial, read-only closure');
}

async function upload(env: ReturnType<typeof setup>, storage: StorageService, kind = 'INSURANCE', bytes = Buffer.from('%PDF-1.7\nfixture'), expiresAt?: string) {
  const response = await env.service.createUploadUrl(user('candidate'), 'application-1', {
    revision: env.dossier.revision, kind, mimeType: 'application/pdf', fileName: 'attestation.pdf', sizeBytes: bytes.length, expiresAt,
  } as any);
  const token = response.uploadUrl.split('/').pop();
  await storage.saveLocalObject(storage.verifyToken(token, 'upload'), Readable.from(bytes));
  return { ...response, token, bytes };
}

async function testUploadAndVersions(storage: StorageService) {
  const env = setup(storage);
  const invalid = await upload(env, storage, 'OTHER', Buffer.from('not-pdf!'));
  await expectStatus(() => env.service.confirmUpload(user('candidate'), 'application-1', invalid.documentId), 400);
  assert.equal(env.documents[0].status, 'UPLOADING');
  await expectStatus(() => env.service.download(user('candidate'), 'application-1', invalid.documentId), 404);

  const valid = await upload(env, storage);
  await expectStatus(() => env.service.confirmUpload(user('owner'), 'application-1', valid.documentId), 403);
  await env.service.confirmUpload(user('candidate'), 'application-1', valid.documentId);
  const finalKey = env.documents.find((document) => document.id === valid.documentId).storageKey;
  await storage.saveLocalObject(storage.verifyToken(valid.token, 'upload'), Readable.from(Buffer.from('evil')));
  assert.deepEqual(await storage.readBuffer(finalKey), valid.bytes, 'Replaying quarantine upload URL cannot alter confirmed bytes.');
  const view = await env.service.get(user('candidate'), 'application-1');
  assert.equal('storageKey' in view.documents[0], false);
  assert.equal('detailsSnapshot' in view.documents[0], false);
  await expectStatus(() => env.service.download(user('candidate'), 'application-1', 'other-dossier-document'), 404);
  await expectStatus(() => env.service.confirmUpload(user('candidate'), 'application-1', 'other-dossier-document'), 404);
  await expectStatus(() => env.service.archive(user('candidate'), 'application-1', 'other-dossier-document'), 404);

  await env.service.generate(user('candidate'), 'application-1', { revision: 1, kind: 'CONTRACT' });
  const generated = env.documents.find((document) => document.kind === 'CONTRACT');
  assert.equal((await storage.readBuffer(generated.storageKey)).subarray(0, 5).toString(), '%PDF-');
  await env.service.update(user('owner'), 'application-1', { revision: 1, details: { ...details, retrocessionPercent: 75 } });
  assert.equal(generated.detailsSnapshot.retrocessionPercent, 80, 'Generated contract keeps the signed-off details snapshot.');
  await expectStatus(() => env.service.update(user('candidate'), 'application-1', { revision: 1, details }), 409);
  await expectStatus(() => env.service.generate(user('candidate'), 'application-1', { revision: 1, kind: 'CONTRACT' }), 409);
  await env.service.download(user('candidate'), 'application-1', generated.id);
  await expectStatus(() => env.service.send(user('candidate'), 'application-1', sendDto([generated.id])), 409);
  await env.service.archive(user('candidate'), 'application-1', valid.documentId);
  await expectStatus(() => env.service.download(user('candidate'), 'application-1', valid.documentId), 404);
  assert.deepEqual(await storage.readBuffer(finalKey), valid.bytes, 'Archival preserves immutable audit bytes.');
  env.dossier.details.practiceFramework = '';
  await expectStatus(() => env.service.generate(user('candidate'), 'application-1', { revision: 2, kind: 'CONTRACT' }), 400);
  console.log('PASS upload: byte validation, scoped download, immutable promotion, archival, revision conflicts, generated PDF snapshots');
}

function sendDto(documentIds: string[], idempotencyKey = 'test-delivery-000001'): SendDossierDto {
  return { documentIds, recipientEmail: 'recipient@example.test', recipientName: 'Destinataire', recipientType: 'COUNTERPART', idempotencyKey };
}

async function testSending(storage: StorageService) {
  const env = setup(storage);
  const imported = await upload(env, storage);
  await env.service.confirmUpload(user('candidate'), 'application-1', imported.documentId);
  const dto = sendDto([imported.documentId]);
  env.setAvailable(false);
  const unavailable = await env.service.send(user('candidate'), 'application-1', dto);
  assert.equal(unavailable.canSend, false);
  assert.equal(unavailable.deliveries[0].status, 'FAILED');
  assert.equal(env.sends(), 0);
  assert.equal(unavailable.deliveries[0].sentAt, undefined);
  env.setAvailable(true);
  env.setFailures(1);
  const failed = await env.service.send(user('candidate'), 'application-1', dto);
  assert.equal(failed.deliveries[0].status, 'FAILED');
  const sent = await env.service.send(user('candidate'), 'application-1', dto);
  assert.equal(sent.deliveries[0].status, 'SENT');
  assert.ok(sent.deliveries[0].sentAt);
  assert.equal(env.deliveries.length, 1, 'Retry claims the same delivery.');
  assert.equal(env.sentKeys[0], env.sentKeys[1], 'Retry reuses provider idempotency key.');
  await env.service.send(user('candidate'), 'application-1', dto);
  assert.equal(env.sends(), 2, 'Confirmed delivery is never resent.');
  await expectStatus(() => env.service.send(user('candidate'), 'application-1', { ...dto, recipientEmail: 'different@example.test' }), 409);
  await expectStatus(() => env.service.send(user('candidate'), 'application-1', sendDto(['other-dossier-document'], 'new-delivery-000001')), 400);

  const shortInsurance = await upload(env, storage, 'INSURANCE', Buffer.from('%PDF-1.7\nfixture'), '2030-10-02');
  await env.service.confirmUpload(user('candidate'), 'application-1', shortInsurance.documentId);
  await expectStatus(() => env.service.send(user('candidate'), 'application-1', sendDto([shortInsurance.documentId], 'short-insurance-0001')), 400);
  const signed = await upload(env, storage, 'SIGNED_CONTRACT');
  await env.service.confirmUpload(user('candidate'), 'application-1', signed.documentId);
  await env.service.update(user('candidate'), 'application-1', { revision: 1, details: { ...details, endDate: '2030-10-06' } });
  await expectStatus(() => env.service.send(user('candidate'), 'application-1', sendDto([signed.documentId], 'stale-signature-0001')), 409);
  console.log('PASS sending: no mock success, provider failure, idempotent retry, stale contract refusal, validity period, scoped selection');
}

async function testDtoAndEmailMock() {
  assert.ok((await validate(plainToInstance(UploadDossierDto, { revision: 1, kind: 'CONTRACT', fileName: '../bad.pdf', mimeType: 'text/html', sizeBytes: 20 * 1024 * 1024 }))).length >= 4);
  assert.ok((await validate(plainToInstance(SendDossierDto, { ...sendDto(['one']), recipientEmail: 'bad\r\nBcc: other@example.test', message: 'x'.repeat(3001) }))).length >= 2);
  const events: any[] = [];
  const prisma = { emailEvent: { create: async ({ data }: any) => { const event = { id: 'event-1', ...data }; events.push(event); return event; }, update: async ({ data }: any) => Object.assign(events[0], data) } };
  const email = new EmailService(prisma as any, { get: () => undefined } as any);
  await assert.rejects(() => email.sendDossierEmail({ userId: 'candidate', to: 'recipient@example.test', recipientName: 'Destinataire', attachments: [{ filename: 'document.pdf', content: Buffer.from('%PDF-') }], idempotencyKey: 'test-key' }));
  assert.equal(events[0].status, 'FAILED');
  assert.equal(events[0].sentAt, undefined);
  console.log('PASS bounded input validation and real EmailService mock protection');
}

async function testPostSendPersistenceFailure(storage: StorageService) {
  const env = setup(storage);
  const uploaded = await upload(env, storage);
  await env.service.confirmUpload(user('candidate'), 'application-1', uploaded.documentId);
  const update = env.prisma.replacementDossierDelivery.update;
  let failOnce = true;
  env.prisma.replacementDossierDelivery.update = async (args: any) => {
    if (failOnce && args.data.status === 'SENT') { failOnce = false; throw new Error('Simulated database interruption after provider acceptance'); }
    return update(args);
  };
  const dto = sendDto([uploaded.documentId], 'post-send-db-failure');
  assert.equal((await env.service.send(user('candidate'), 'application-1', dto)).deliveries[0].status, 'FAILED');
  assert.equal((await env.service.send(user('candidate'), 'application-1', dto)).deliveries[0].status, 'SENT');
  assert.equal(env.deliveries.length, 1);
  assert.equal(env.sentKeys[0], env.sentKeys[1], 'Recovery after provider acceptance retains the provider deduplication key.');
  console.log('PASS retry after a database failure following provider acceptance preserves idempotency');
}

async function testOpenUploadHandle(storage: StorageService, root: string) {
  await mkdir(join(root, 'quarantine'), { recursive: true });
  const sourceKey = 'quarantine/inflight.pdf';
  const targetKey = 'confirmed/inflight.pdf';
  const handle = await open(join(root, sourceKey), 'w+');
  try {
    const original = Buffer.from('%PDF-1.7\noriginal');
    await handle.write(original, 0, original.length, 0);
    await storage.promoteUploadedObject(sourceKey, targetKey);
    await handle.write(Buffer.from('MUTATED!'), 0, 8, 0);
    assert.deepEqual(await storage.readBuffer(targetKey), original, 'An open quarantine upload descriptor cannot mutate the promoted object.');
  } finally { await handle.close(); }
  console.log('PASS immutable local promotion with an in-flight writable upload handle');
}

async function main() {
  const root = await mkdtemp(join(tmpdir(), 'medilink-dossier-test-'));
  try {
    const storage = new StorageService({ get: (key: string) => ({ STORAGE_PROVIDER: 'local', NODE_ENV: 'test', LOCAL_STORAGE_DIR: root, STORAGE_SIGNING_SECRET: 'test-only-secret' }[key]) } as ConfigService);
    await testPermissions(storage);
    await testUploadAndVersions(storage);
    await testSending(storage);
    await testDtoAndEmailMock();
    await testPostSendPersistenceFailure(storage);
    await testOpenUploadHandle(storage, root);
    console.log('All replacement dossier regression tests passed. No database or email provider was contacted.');
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
