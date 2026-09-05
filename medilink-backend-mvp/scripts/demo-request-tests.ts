import 'reflect-metadata';
import { strict as assert } from 'node:assert';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { DemoRequestDto, DemoRequestsService } from '../src/modules/demo-requests/demo-requests.module';

async function main() {
  const valid = { firstName: ' Alice ', lastName: 'Test', email: 'alice@example.com', role: 'Médecin remplaçant', interests: [], consent: true };
  const dto = plainToInstance(DemoRequestDto, valid);
  assert.equal((await validate(dto)).length, 0);
  assert.equal(dto.firstName, 'Alice');
  for (const bad of [{ email: 'invalid' }, { firstName: '  ' }, { consent: false }, { role: 'unknown' }, { interests: ['unknown'] }, { message: 'x'.repeat(3001) }, { phone: 'abc' }]) {
    assert.ok((await validate(plainToInstance(DemoRequestDto, { ...valid, ...bad }))).length > 0);
  }
  let saved = 0;
  let html = '';
  let failEmail = false;
  const service = new DemoRequestsService({ demoRequest: { create: async ({ data }: any) => {
    assert.ok(data.consentAt instanceof Date); saved++; return { ...data, id: 'test' };
  } }, user: { findMany: async () => [{ email: 'admin@example.com' }] } } as any,
  { sendEmail: async (args: any) => { html = args.html; if (failEmail) throw new Error('Provider unavailable'); } } as any,
  { get: () => undefined } as any);
  assert.deepEqual(await service.create({ ...dto, message: '<script>alert(1)</script>' }), { success: true });
  assert.equal(saved, 1);
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  await service.create({ ...dto, website: 'bot.example' });
  assert.equal(saved, 1, 'Honeypot must not save or send a request');
  failEmail = true;
  assert.deepEqual(await service.create(dto), { success: true });
  assert.equal(saved, 2, 'Provider failures must preserve the request');
  console.log('Demo request tests passed: validation, escaping, persistence, honeypot, email failure.');
}

main().catch(error => { console.error(error); process.exitCode = 1; });
