import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { strict as assert } from 'assert';
import { validate } from 'class-validator';
import { access, mkdir, mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { Public } from '../src/common/decorators/public.decorator';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { isTrustedWriteRequest } from '../src/common/middleware/request-origin.middleware';
import { BillingService } from '../src/modules/billing/billing.service';
import { StorageService } from '../src/modules/documents/storage.service';
import { UpdateProfileDto } from '../src/modules/profiles/dto/update-profile.dto';

function config(values: Record<string, string>): ConfigService {
  return {
    get: <T>(key: string) => values[key] as T,
  } as ConfigService;
}

async function expectRejected(action: () => Promise<unknown>, message: string) {
  let rejected = false;
  try {
    await action();
  } catch {
    rejected = true;
  }
  assert.equal(rejected, true, message);
}

async function testRequestOrigins() {
  const trusted = ['https://app.medilink.example', 'http://localhost:3000'];

  assert.equal(
    isTrustedWriteRequest(
      'POST',
      '/api/auth/login',
      'https://app.medilink.example',
      trusted,
    ),
    true,
  );
  assert.equal(
    isTrustedWriteRequest(
      'PATCH',
      '/api/profiles',
      'https://app.medilink.example/path',
      trusted,
    ),
    true,
  );
  assert.equal(
    isTrustedWriteRequest(
      'POST',
      '/api/auth/login',
      'https://app.medilink.example.evil.test',
      trusted,
    ),
    false,
  );
  assert.equal(
    isTrustedWriteRequest(
      'POST',
      '/api/auth/login',
      'https://app.medilink.example@evil.test',
      trusted,
    ),
    false,
  );
  assert.equal(
    isTrustedWriteRequest('DELETE', '/api/documents/1', undefined, trusted),
    false,
  );
  assert.equal(
    isTrustedWriteRequest('POST', '/api/auth/login', 'null', trusted),
    false,
  );
  assert.equal(
    isTrustedWriteRequest('GET', '/api/documents', undefined, trusted),
    true,
  );
  assert.equal(
    isTrustedWriteRequest(
      'POST',
      '/api/billing/webhooks/stripe',
      undefined,
      trusted,
    ),
    true,
  );
  assert.equal(
    isTrustedWriteRequest(
      'POST',
      '/api/billing/webhooks/stripe-fake',
      undefined,
      trusted,
    ),
    false,
  );
}

async function testAuthenticationDefaultDeny() {
  class PublicController {
    @Public()
    handle() {}
  }
  class ProtectedController {
    handle() {}
  }

  let sessionLookups = 0;
  const guard = new AuthGuard(
    {
      session: {
        findUnique: async () => {
          sessionLookups += 1;
          return null;
        },
      },
    } as any,
    config({ NODE_ENV: 'test' }),
    new Reflector(),
  );
  const contextFor = (controller: any, handler: any) =>
    ({
      getClass: () => controller,
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => ({ cookies: {} }),
      }),
    }) as any;

  assert.equal(
    await guard.canActivate(
      contextFor(PublicController, PublicController.prototype.handle),
    ),
    true,
  );
  assert.equal(sessionLookups, 0, 'Public routes must not query a session.');
  await expectRejected(
    () =>
      guard.canActivate(
        contextFor(ProtectedController, ProtectedController.prototype.handle),
      ),
    'Routes without @Public must deny anonymous requests.',
  );
}

async function testBoundedInputs() {
  const oversized = Object.assign(new UpdateProfileDto(), {
    bio: 'x'.repeat(3001),
    actsPerformed: Array.from({ length: 51 }, () => 'consultation'),
  });
  const errors = await validate(oversized);
  const rejectedFields = new Set(errors.map((error) => error.property));
  assert.equal(rejectedFields.has('bio'), true);
  assert.equal(rejectedFields.has('actsPerformed'), true);
}

async function testStorageBoundary() {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'medilink-storage-test-'));
  try {
    const storage = new StorageService(
      config({
        STORAGE_PROVIDER: 'local',
        NODE_ENV: 'test',
        LOCAL_STORAGE_DIR: temporaryRoot,
        STORAGE_SIGNING_SECRET: 'test-only-secret',
      }),
    );
    const sourceKey = 'quarantine/documents/user-1/file.png';
    const finalKey = 'validated/documents/user-1/file.png';
    const validPngPrefix = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
      0x00, 0x00, 0x00, 0x00,
    ]);

    await mkdir(join(temporaryRoot, 'quarantine/documents/user-1'), {
      recursive: true,
    });
    await writeFile(join(temporaryRoot, sourceKey), validPngPrefix);
    await storage.promoteUploadedObject(sourceKey, finalKey);
    await storage.assertUploadedObject(
      finalKey,
      'image/png',
      validPngPrefix.length,
    );
    await expectRejected(
      () => access(join(temporaryRoot, sourceKey)),
      'The quarantine object must be removed after promotion.',
    );

    // Reusing an old upload URL can recreate quarantine, but cannot overwrite
    // the immutable key referenced by the confirmed document.
    await writeFile(join(temporaryRoot, sourceKey), Buffer.from('invalid-reuse'));
    await storage.assertUploadedObject(
      finalKey,
      'image/png',
      validPngPrefix.length,
    );
    await expectRejected(
      () =>
        storage.assertUploadedObject(
          finalKey,
          'image/png',
          validPngPrefix.length + 1,
        ),
      'A size mismatch must be rejected.',
    );
    await expectRejected(
      () => storage.assertUploadedObject(sourceKey, 'image/png', 13),
      'A MIME signature mismatch must be rejected.',
    );

    assert.match(
      storage.contentDisposition('identity.pdf', 'application/pdf'),
      /^attachment;/,
    );
    assert.match(
      storage.contentDisposition('avatar.png', 'image/png'),
      /^inline;/,
    );

    await storage.deleteObject(finalKey);
    await expectRejected(
      () => access(join(temporaryRoot, finalKey)),
      'Deleting a document must remove its stored object.',
    );
  } finally {
    assert.equal(
      temporaryRoot.startsWith(tmpdir()),
      true,
      'Refusing to recursively delete a path outside the temporary directory.',
    );
    await rm(temporaryRoot, { recursive: true, force: true });
  }
}

async function testStripeEventRetry() {
  let record: Record<string, any> | null = null;
  let processingAttempts = 0;
  const billingEvent = {
    create: async ({ data }: any) => {
      if (record) {
        throw new Prisma.PrismaClientKnownRequestError('Duplicate event', {
          code: 'P2002',
          clientVersion: 'test',
        });
      }
      record = {
        id: 'billing-event-1',
        processedAt: null,
        failedAt: null,
        processingStartedAt: data.processingStartedAt,
        attemptCount: data.attemptCount,
      };
      return { id: record.id };
    },
    findUnique: async () => record,
    updateMany: async ({ data }: any) => {
      if (!record || record.processedAt) return { count: 0 };
      if (data.attemptCount?.increment) {
        record.attemptCount += data.attemptCount.increment;
      }
      Object.assign(record, {
        ...data,
        attemptCount: record.attemptCount,
      });
      return { count: 1 };
    },
    update: async ({ data }: any) => {
      if (!record) throw new Error('Missing billing event.');
      Object.assign(record, data);
      return record;
    },
  };
  const billing = new BillingService(
    { billingEvent } as any,
    {} as any,
    {} as any,
    config({
      STRIPE_SECRET_KEY: 'sk_test_security_regression',
      STRIPE_WEBHOOK_SECRET: 'whsec_security_regression',
    }),
  );
  const event = {
    id: 'evt_security_retry',
    type: 'security.retry.test',
    created: Math.floor(Date.now() / 1000),
    livemode: false,
    data: { object: { id: 'object-1' } },
  };
  (billing as any).stripe = {
    webhooks: { constructEvent: () => event },
  };
  (billing as any).processStripeEvent = async () => {
    processingAttempts += 1;
    if (processingAttempts === 1) {
      throw new Error('simulated transient failure');
    }
  };

  await expectRejected(
    () => billing.handleStripeWebhook(Buffer.from('{}'), 'signature'),
    'A failed Stripe event must return an error so Stripe retries it.',
  );
  assert.ok(record?.failedAt, 'A failed Stripe event must be persisted as failed.');
  assert.equal(record?.processedAt, null);

  const retried = await billing.handleStripeWebhook(
    Buffer.from('{}'),
    'signature',
  );
  assert.deepEqual(retried, { received: true });
  assert.equal(record?.attemptCount, 2);
  assert.ok(record?.processedAt, 'The successful retry must be marked as processed.');

  const duplicate = await billing.handleStripeWebhook(
    Buffer.from('{}'),
    'signature',
  );
  assert.deepEqual(duplicate, { received: true, duplicate: true });
  assert.equal(processingAttempts, 2, 'A processed event must not execute twice.');
}

async function main() {
  assert.throws(
    () =>
      new StorageService(
        config({
          STORAGE_PROVIDER: 'local',
          NODE_ENV: 'production',
        }),
      ),
    /STORAGE_PROVIDER=s3/,
  );
  assert.throws(
    () =>
      new StorageService(
        config({
          STORAGE_PROVIDER: 's3',
          NODE_ENV: 'production',
        }),
      ),
    /S3_BUCKET/,
  );
  assert.throws(
    () =>
      new StorageService(
        config({
          STORAGE_PROVIDER: 's3',
          NODE_ENV: 'production',
          S3_BUCKET: 'private-test-bucket',
          S3_ENDPOINT: 'https://storage.example.test',
        }),
      ),
    /credentials/,
  );
  assert.throws(
    () =>
      new StorageService(
        config({
          STORAGE_PROVIDER: 'local',
          NODE_ENV: 'test',
          SIGNED_URL_TTL_SECONDS: '3600',
        }),
      ),
    /between 60 and 900/,
  );

  await testRequestOrigins();
  await testAuthenticationDefaultDeny();
  await testBoundedInputs();
  await testStorageBoundary();
  await testStripeEventRetry();
  console.log('Security regression tests passed.');
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
