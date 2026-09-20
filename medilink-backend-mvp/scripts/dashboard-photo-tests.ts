import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { DashboardService } from '../src/modules/dashboard/dashboard.service';
import { EstablishmentsService } from '../src/modules/establishments/establishments.service';
import { ApplicationsService } from '../src/modules/applications/applications.service';
import { ConversationsService } from '../src/modules/conversations/conversations.service';

async function main() {
  const photo = {
    id: 'cabinet-photo',
    establishmentId: 'cabinet',
    storageKey: 'establishments/cabinet/photo.webp',
    fileName: 'cabinet.webp',
    mimeType: 'image/webp',
    uploadedAt: new Date('2026-09-01'),
    isPrimary: true,
    orderIndex: 0,
  };
  const establishment = { id: 'cabinet', name: 'Cabinet', completionScore: 87, logoUrl: null, photos: [photo] };
  const emptyEstablishment = { id: 'other-cabinet', name: 'Sans photo', completionScore: 32, photos: [] };
  const applications = [
    { id: 'application', candidateUserId: 'candidate', status: 'ACCEPTED', mission: { id: 'mission', establishment }, conversation: { id: 'conversation' } },
    { id: 'other-application', candidateUserId: 'candidate', status: 'SUBMITTED', mission: { id: 'other-mission', establishment: emptyEstablishment }, conversation: null },
  ];
  const conversations = [{ id: 'conversation', establishment, messages: [{ id: 'message', body: 'Bonjour' }], agreements: [] }];
  const profile = { id: 'profile', avatarUrl: '/avatar.webp' };
  const documents = [{ id: 'document' }];
  const notifications = [{ id: 'notification', readAt: null }];
  const calls: Array<[string, string, string]> = [];
  const storage = {
    createDownloadUrl: async (key: string, fileName: string, mimeType: string) => {
      calls.push([key, fileName, mimeType]);
      return { downloadUrl: 'https://storage.example.test/signed-cabinet-photo' };
    },
  };
  const photoInclude = {
    where: { uploadedAt: { not: null } },
    orderBy: [{ isPrimary: 'desc' }, { orderIndex: 'asc' }, { createdAt: 'asc' }],
    take: 1,
  };
  let conversationAccessChecked = false;
  let missingConversation = false;
  let conversationReads = 0;
  const prisma = {
    application: { findMany: async (query: any) => {
      assert.deepEqual(query.where, { candidateUserId: 'candidate' }, 'Applications stay scoped to the current candidate');
      assert.deepEqual(query.include.mission.include.establishment.include.photos, photoInclude, 'Only a completed, primary-first photo is selected');
      return applications;
    } },
    conversation: {
      findMany: async (query: any) => {
        assert.deepEqual(query.where, { participants: { some: { userId: 'candidate', archivedAt: null } } }, 'Conversation membership and archive restrictions stay intact');
        assert.deepEqual(query.include.establishment.include.photos, photoInclude);
        return conversations;
      },
      findUnique: async (query: any) => {
        conversationReads++;
        assert.equal(conversationAccessChecked, true, 'Membership must be checked before reading the conversation or its photo');
        assert.deepEqual(query.where, { id: 'conversation' });
        assert.deepEqual(query.include.establishment.include.photos, photoInclude);
        return missingConversation ? null : conversations[0];
      },
    },
    notification: { findMany: async (query: any) => {
      assert.deepEqual(query.where, { userId: 'candidate' });
      return notifications;
    } },
  };
  const establishments = new EstablishmentsService(prisma as any, {} as any, {} as any, storage as any);
  const service = new DashboardService(
    prisma as any,
    { listMine: async () => documents } as any,
    establishments,
    {} as any,
    {} as any,
    { getMyProfile: async () => profile } as any,
  );
  const result = await service.getCandidateDashboard({ id: 'candidate', role: 'CANDIDATE' } as any);
  const signedEstablishment = { ...establishment, photos: [{ ...photo, url: 'https://storage.example.test/signed-cabinet-photo' }] };
  assert.deepEqual(result, {
    profile,
    documents,
    applications: [{ ...applications[0], mission: { ...applications[0].mission, establishment: signedEstablishment } }, applications[1]],
    conversations: [{ ...conversations[0], establishment: signedEstablishment }],
    notifications,
  }, 'Signing adds photo URLs without changing existing dashboard data or completion scores');
  assert.deepEqual(calls, [
    [photo.storageKey, photo.fileName, photo.mimeType],
    [photo.storageKey, photo.fileName, photo.mimeType],
  ], 'Use the existing download signer and leave establishments without photos untouched');
  assert.equal('url' in photo, false, 'Do not mutate ORM results');

  const applicationsService = new ApplicationsService(prisma as any, {} as any, {} as any, {} as any, {} as any, {} as any, establishments);
  assert.deepEqual(await applicationsService.listMine({ id: 'candidate' } as any), result.applications, 'Mission history returns the same signed cabinet preview');
  const permissions = {
    ensureConversationParticipant: async (userId: string, conversationId: string) => {
      assert.equal(conversationId, 'conversation');
      if (userId !== 'candidate') throw new Error('Forbidden');
      conversationAccessChecked = true;
    },
  };
  const conversationsService = new ConversationsService(prisma as any, permissions as any, {} as any, {} as any, {} as any, {} as any, {} as any, establishments);
  assert.deepEqual(await conversationsService.list({ id: 'candidate' } as any), result.conversations, 'Conversation list signs the same authorized preview');
  assert.deepEqual(await conversationsService.get({ id: 'candidate' } as any, 'conversation'), result.conversations[0], 'Opening a conversation preserves its fields and signed preview');
  const signedCount = calls.length;
  conversationAccessChecked = false;
  await assert.rejects(() => conversationsService.get({ id: 'outsider' } as any, 'conversation'), /Forbidden/);
  assert.equal(conversationReads, 1, 'A non-participant cannot read the conversation');
  assert.equal(calls.length, signedCount, 'A non-participant never receives a signed photo URL');
  missingConversation = true;
  await assert.rejects(() => conversationsService.get({ id: 'candidate' } as any, 'conversation'), /Conversation introuvable/);
  assert.equal(calls.length, signedCount, 'A missing conversation does not generate a signed URL');
  console.log('Workspace photo tests passed: dashboard, mission history, conversation list/detail, candidate and participant scoping, completed photo selection, shared signer, empty photos, unchanged payload and denied access.');
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
