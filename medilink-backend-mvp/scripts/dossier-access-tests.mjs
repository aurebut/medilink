import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { PGlite } from '@electric-sql/pglite';

const db = new PGlite();
const tables = ['ReplacementDossier', 'ReplacementDossierDocument', 'ReplacementDossierDelivery'];
const creation = await readFile(new URL('../prisma/migrations/20260919120000_add_replacement_dossiers/migration.sql', import.meta.url), 'utf8');
const hardening = await readFile(new URL('../prisma/migrations/20260919143000_harden_replacement_dossier_access/migration.sql', import.meta.url), 'utf8');

try {
  await db.exec(`
    CREATE ROLE dossier_backend;
    CREATE ROLE anon;
    CREATE ROLE authenticated;
    CREATE ROLE dossier_untrusted;
    GRANT USAGE ON SCHEMA public TO PUBLIC;
    GRANT CREATE ON SCHEMA public TO dossier_backend;
    SET ROLE dossier_backend;
    CREATE TABLE "Application" (id TEXT PRIMARY KEY);
  `);
  await db.exec(creation);
  await db.exec(`
    GRANT ALL ON "ReplacementDossier", "ReplacementDossierDocument", "ReplacementDossierDelivery" TO PUBLIC, anon, authenticated;
    INSERT INTO "Application" VALUES ('application');
    INSERT INTO "ReplacementDossier" (id, "applicationId", details, "updatedAt")
      VALUES ('dossier', 'application', '{}', now());
    INSERT INTO "ReplacementDossierDocument" (id, "dossierId", kind, "fileName", "storageKey", "mimeType", "sizeBytes", source, version, revision, "createdById")
      VALUES ('document', 'dossier', 'CONTRACT', 'contract.pdf', 'private-key', 'application/pdf', 1, 'GENERATED', 1, 1, 'owner');
    INSERT INTO "ReplacementDossierDelivery" (id, "dossierId", "actorUserId", "recipientEmail", "recipientName", "recipientType", "documentSnapshots", "idempotencyKey", "requestHash")
      VALUES ('delivery', 'dossier', 'owner', 'test@example.test', 'Recipient', 'COUNTERPART', '[]', 'key', 'hash');
  `);
  await db.exec(hardening);
  await db.exec(hardening); // A hotfix applied before deployment must be safe to replay.

  for (const table of tables) {
    assert.equal((await db.query(`SELECT relrowsecurity FROM pg_class WHERE oid = 'public."${table}"'::regclass`)).rows[0].relrowsecurity, true);
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM public."${table}"`)).rows[0].n, 1, 'Table owner retains row access');
    await db.exec(`UPDATE public."${table}" SET id = id`);
  }
  await db.exec('RESET ROLE');
  for (const role of ['anon', 'authenticated', 'dossier_untrusted']) {
    for (const table of tables) {
      for (const privilege of ['SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER']) {
        assert.equal((await db.query(`SELECT has_table_privilege('${role}', 'public."${table}"', '${privilege}') AS allowed`)).rows[0].allowed, false, `${role} must lack ${privilege} on ${table}`);
      }
      await db.exec(`SET ROLE ${role}`);
      for (const sql of [
        `SELECT * FROM public."${table}"`,
        `INSERT INTO public."${table}" DEFAULT VALUES`,
        `UPDATE public."${table}" SET id = id WHERE false`,
        `DELETE FROM public."${table}" WHERE false`,
        `TRUNCATE public."${table}"`,
      ]) {
        await assert.rejects(db.query(sql), { code: '42501' }, `${role} access must be denied`);
      }
      await db.exec('RESET ROLE');
    }
  }

  // RLS is a second barrier if someone accidentally re-grants table SELECT.
  await db.exec('GRANT SELECT ON "ReplacementDossier", "ReplacementDossierDocument", "ReplacementDossierDelivery" TO anon; SET ROLE anon');
  for (const table of tables) {
    assert.equal((await db.query(`SELECT count(*)::int AS n FROM public."${table}"`)).rows[0].n, 0, 'RLS must hide owner rows');
  }
  await db.exec('RESET ROLE; SET ROLE dossier_backend');
  await db.exec(hardening);
  // Backend DELETE/INSERT continue to work after hardening, with real FK checks.
  for (const table of ['ReplacementDossierDelivery', 'ReplacementDossierDocument', 'ReplacementDossier']) {
    await db.exec(`DELETE FROM public."${table}"`);
  }
  await db.exec(`INSERT INTO "ReplacementDossier" (id, "applicationId", details, "updatedAt") VALUES ('new-dossier', 'application', '{}', now())`);
  assert.equal((await db.query('SELECT count(*)::int AS n FROM "ReplacementDossier"')).rows[0].n, 1);
  console.log('PASS: real PostgreSQL role denial, owner access, RLS fallback, data preservation, and idempotent replay.');
} finally {
  await db.close();
}
