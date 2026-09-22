import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(readFileSync(new URL('../lib/application-compatibility.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const testModule = { exports: {} };
runInNewContext(source, { exports: testModule.exports, module: testModule, Intl, Date });
const { getApplicationCompatibility } = testModule.exports;
const mission = {
  specialty: 'Médecine générale', requiredLevel: 'DOCTOR', requiredLevels: ['DOCTOR'], city: 'Paris',
  missionType: 'REMPLACEMENT', softwareUsed: 'Doctolib', patientType: 'Tout public',
  compensationMode: 'RETROCESSION', retrocessionPercentage: 70, startDate: '2026-09-22T08:00:00.000Z',
};
const profile = {
  specialty: 'Médecine générale', medicalStatus: 'DOCTOR', city: 'Paris', preferredCities: [],
  acceptedMissionTypes: ['REMPLACEMENT'], knownSoftware: ['Doctolib'], acceptedPatientTypes: ['Tout public'], minimumCompensation: 70,
};
const criterion = (result, id) => result.criteria.find(item => item.id === id);

test('every concordance has declared evidence and availability stays unconfirmed', () => {
  const result = getApplicationCompatibility(mission, profile);
  assert.equal(result.matchedCount, 7);
  assert.equal(result.comparedCount, 7);
  assert.equal(result.totalCount, 8);
  assert.equal(result.unknownCount, 1);
  assert.equal(criterion(result, 'availability').status, 'unknown');
  assert.equal(result.coverageLabel, '7 critères comparés sur 8');
  assert.equal(result.summary, '7 critères concordants');
});

test('missing and blank values never become matches', () => {
  for (const result of [getApplicationCompatibility(), getApplicationCompatibility({}, {}), getApplicationCompatibility(mission, {}), getApplicationCompatibility({}, profile)]) {
    assert.equal(result.matchedCount, 0);
    assert.equal(result.comparedCount, 0);
    assert.equal(result.unknownCount, 8);
  }
  const blank = getApplicationCompatibility(mission, { specialty: '  ', knownSoftware: [' '], acceptedPatientTypes: [''], city: ' ' });
  assert.equal(blank.comparedCount, 0);
});

test('normalization handles accents and legacy mission types without loose specialty matches', () => {
  const result = getApplicationCompatibility(mission, { ...profile, specialty: '  medecine   generale ', acceptedMissionTypes: ['remplacement_courte_duree'], city: 'Boulogne', preferredCities: [' PARIS '], medicalStatus: 'REGULAR_LOCUM' });
  assert.equal(result.matchedCount, 7);
  assert.equal(criterion(getApplicationCompatibility(mission, { ...profile, specialty: 'Médecine' }), 'specialty').status, 'mismatch');
});

test('professional hierarchy accepts only relevant declared levels', () => {
  assert.equal(criterion(getApplicationCompatibility({ ...mission, requiredLevels: ['INTERN'] }, profile), 'level').status, 'match');
  assert.equal(criterion(getApplicationCompatibility(mission, { ...profile, medicalStatus: 'INTERN' }), 'level').status, 'mismatch');
  assert.equal(criterion(getApplicationCompatibility({ ...mission, requiredLevels: ['NURSE'] }, profile), 'level').status, 'mismatch');
  assert.equal(criterion(getApplicationCompatibility({ ...mission, requiredLevels: ['OTHER'] }, { ...profile, medicalStatus: 'OTHER' }), 'level').status, 'unknown');
});

test('unmeasured mobility remains unknown instead of inferring geographic compatibility', () => {
  const remote = { ...profile, city: 'Lyon', preferredCities: [], maxTravelRadiusKm: 600, mobilityRangeType: 'REGIONAL' };
  assert.equal(criterion(getApplicationCompatibility(mission, remote), 'location').status, 'unknown');
  assert.equal(criterion(getApplicationCompatibility(mission, { ...remote, mobilityRangeType: 'LOCAL_ONLY' }), 'location').status, 'mismatch');
});

test('partial software or patient coverage does not become a full concordance', () => {
  const partialSoftware = getApplicationCompatibility({ ...mission, knownSoftware: ['Doctolib', 'Weda'] }, profile);
  assert.equal(criterion(partialSoftware, 'software').status, 'unknown');
  assert.match(criterion(partialSoftware, 'software').detail, /Doctolib en commun/);
  assert.equal(criterion(getApplicationCompatibility(mission, { ...profile, knownSoftware: ['Weda'] }), 'software').status, 'mismatch');
  assert.equal(criterion(getApplicationCompatibility(mission, { ...profile, acceptedPatientTypes: ['Adultes'] }), 'patients').status, 'unknown');
  assert.equal(criterion(getApplicationCompatibility({ ...mission, patientType: 'Adultes' }, profile), 'patients').status, 'match');
  assert.equal(criterion(getApplicationCompatibility({ ...mission, patientType: 'Adultes' }, { ...profile, refusedPatientTypes: ['Adultes'] }), 'patients').status, 'mismatch');
  assert.equal(criterion(getApplicationCompatibility(mission, { ...profile, refusedPatientTypes: ['Enfants'] }), 'patients').status, 'unknown');
});

test('retrocession comparison never mixes percentages and fixed remuneration', () => {
  assert.equal(criterion(getApplicationCompatibility(mission, { ...profile, minimumCompensation: 75 }), 'retrocession').status, 'mismatch');
  assert.equal(criterion(getApplicationCompatibility(mission, { ...profile, minimumCompensation: 0 }), 'retrocession').status, 'match');
  for (const minimumCompensation of [null, undefined, -1, 101, Number.NaN, Number.POSITIVE_INFINITY, '70']) {
    assert.equal(criterion(getApplicationCompatibility(mission, { ...profile, minimumCompensation }), 'retrocession').status, 'unknown');
  }
  const fixed = getApplicationCompatibility({ ...mission, compensationMode: 'FIXED_AMOUNT', compensationAmount: 50000 }, profile);
  assert.equal(criterion(fixed, 'retrocession').status, 'unknown');
  assert.equal(criterion(fixed, 'retrocession').missionValue, 'Rémunération forfaitaire');
});

test('personal attributes and application decisions are outside compatibility evidence', () => {
  const original = JSON.stringify(getApplicationCompatibility(mission, profile));
  const decorated = { ...profile, firstName: 'Camille', lastName: 'Exemple', candidateGender: 'FEMININE', avatarUrl: '/portrait.webp', experienceYears: 50, birthDate: '1950-01-01', completionScore: 2, healthVerificationStatus: 'VERIFIED' };
  assert.equal(JSON.stringify(getApplicationCompatibility(mission, decorated)), original);
  assert.equal('score' in getApplicationCompatibility(mission, profile), false);
  assert.equal('eligible' in getApplicationCompatibility(mission, profile), false);
});

test('helper does not mutate the mission or profile declarations', () => {
  const missionCopy = structuredClone(mission);
  const profileCopy = structuredClone(profile);
  getApplicationCompatibility(missionCopy, profileCopy);
  assert.deepEqual(missionCopy, mission);
  assert.deepEqual(profileCopy, profile);
});
