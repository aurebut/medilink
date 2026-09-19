import assert = require('node:assert/strict');
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { generateDossierPdf } from '../src/modules/replacement-dossiers/dossier-pdf';
import { DossierDetails, getMissingDossierFields } from '../src/modules/replacement-dossiers/dossier-types';

// Entirely fictitious data. No account, database or email provider is accessed.
export const doctorFixture: DossierDetails = {
  practiceFramework: 'INDIVIDUAL_LIBERAL', replacementKind: 'DOCTOR',
  holderName: 'Dr Élodie Lefèvre', holderRpps: '10000000001', holderOrderNumber: '75/00001',
  holderAddress: '12 rue de la Paix, 75002 Paris', holderEmail: 'elodie@example.test',
  replacementName: 'Dr François Cœur', replacementRpps: '10000000002', replacementOrderNumber: '75/00002',
  replacementAddress: '8 allée des Érables, 75012 Paris', replacementEmail: 'francois@example.test',
  licenseNumber: '', licenseValidUntil: '', specialty: 'Médecine générale',
  practiceAddress: '12 rue de la Paix, bâtiment A, 75002 Paris',
  startDate: '2026-10-05', endDate: '2026-10-16',
  scheduleDetails: 'Du lundi au vendredi de 9 h à 13 h et de 14 h à 18 h. Consultations au cabinet et visites à domicile selon les besoins des patients.',
  retrocessionPercent: 80, paymentTerms: 'Virement sous huit jours suivant la fin du remplacement, après rapprochement des actes et encaissements. Les honoraires encaissés plus tard sont régularisés à la fin du mois suivant.',
  orderCouncilName: 'Conseil départemental de Paris de l’Ordre des médecins', orderEmail: 'conseil@example.test',
};
export const studentFixture: DossierDetails = {
  ...doctorFixture, replacementKind: 'STUDENT', replacementName: 'Chloé Noël',
  replacementRpps: '', replacementOrderNumber: '', licenseNumber: 'LIC-FICTIVE-2026-42', licenseValidUntil: '2027-03-31',
};

async function main() {
  assert.deepEqual(getMissingDossierFields(doctorFixture), []);
  assert.deepEqual(getMissingDossierFields(studentFixture), []);
  assert.deepEqual(getMissingDossierFields({ ...doctorFixture, holderName: 'Dr E\u0301lodie Lefèvre' }), []);
  assert.deepEqual(getMissingDossierFields({ ...doctorFixture, replacementName: 'Анна Иванова / Ελένη Παπαδοπούλου' }), []);
  assert.ok(getMissingDossierFields({ ...doctorFixture, replacementName: '李' }).some(v => v.includes('caractère non pris en charge')));
  assert.ok(getMissingDossierFields({ ...doctorFixture, practiceFramework: '' }).some(v => v.includes('libéral')));
  assert.ok(getMissingDossierFields({ ...doctorFixture, retrocessionPercent: NaN }).length);
  assert.ok(getMissingDossierFields({ ...doctorFixture, retrocessionPercent: 101 }).length);
  assert.deepEqual(getMissingDossierFields({ ...doctorFixture, retrocessionPercent: 0 }), []);
  assert.ok(getMissingDossierFields({ ...doctorFixture, startDate: '2026-02-30' }).some(v => v.includes('invalide')));
  assert.ok(getMissingDossierFields({ ...doctorFixture, endDate: '2026-10-01' }).some(v => v.includes('fin du remplacement')));
  assert.ok(getMissingDossierFields({ ...studentFixture, endDate: '2027-03-01' }).some(v => v.includes('trois mois')));
  assert.ok(getMissingDossierFields({ ...studentFixture, licenseValidUntil: '2026-10-10' }).some(v => v.includes('couvrir')));
  assert.deepEqual(getMissingDossierFields({ ...doctorFixture, paymentTerms: '', retrocessionPercent: null }, 'DECLARATION'), []);
  await assert.rejects(generateDossierPdf('CONTRACT', { ...doctorFixture, practiceFramework: '' }, { version: 1, generatedAt: new Date() }), /Dossier incomplet/);

  // Scripts are run from the backend package, including the compiled smoke test.
  const output = resolve(process.cwd(), '../output/pdf');
  await mkdir(output, { recursive: true });
  const generatedAt = new Date('2026-09-19T12:00:00.000Z');
  const longFixture: DossierDetails = {
    ...studentFixture,
    holderName: 'Dr Élodie Lefèvre de Saint-Étienne et de la Croix',
    replacementName: 'Chloé Noël-Maël Cœur de Saint-Étienne / Анна / Ελένη',
    practiceAddress: 'Cabinet médical pluridisciplinaire des Érables, résidence de la Côte, bâtiment A, troisième étage, entrée par le 12 rue de la Paix, 75002 Paris',
    scheduleDetails: Array.from({ length: 35 }, (_, i) => `Organisation détaillée ${i + 1} : les consultations ont lieu de 9 h à 13 h, les visites sont regroupées l’après-midi ; les situations nécessitant une continuité des soins sont transmises au praticien désigné.`).join('\n'),
    paymentTerms: 'Échéance et régularisation des honoraires. '.repeat(60) + 'Exemple typographique : 250 € ; rendez‑vous ; l’activité. FIN DES MODALITÉS DE RÈGLEMENT.',
  };
  for (const [filename, kind, fixture] of [
    ['contrat-medecin-exemple.pdf', 'CONTRACT', doctorFixture],
    ['declaration-medecin-exemple.pdf', 'DECLARATION', doctorFixture],
    ['contrat-etudiant-exemple.pdf', 'CONTRACT', studentFixture],
    ['demande-etudiant-exemple.pdf', 'DECLARATION', studentFixture],
    ['contrat-texte-long-qa.pdf', 'CONTRACT', longFixture],
  ] as const) {
    const buffer = await generateDossierPdf(kind, fixture, { version: 1, generatedAt });
    assert.equal(buffer.subarray(0, 5).toString(), '%PDF-');
    assert.ok(buffer.byteLength > 3000);
    await writeFile(resolve(output, filename), buffer);
    console.log(`${filename}: ${buffer.byteLength} octets`);
  }
  console.log('Validation des gabarits et génération des 5 PDF : OK');
}

if (require.main === module) main().catch((error) => { console.error(error); process.exitCode = 1; });
