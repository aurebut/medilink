import { supportsDossierText } from './dossier-font';

export interface DossierPeriod { startDate: string; endDate: string }
export const DOSSIER_PAYMENT_METHODS = ['CARD', 'CASH', 'CHEQUE', 'TRANSFER', 'OTHER'] as const;
export interface DossierFeeEntry {
  date: string;
  actCount: number;
  feesCents: number;
  supplementsCents: number;
  patientReceiptsCents: number;
  thirdPartyReceiptsCents: number;
  paymentMethod: typeof DOSSIER_PAYMENT_METHODS[number];
}

/** Scope deliberately excludes salaried, corporate and other health professions. */
export interface DossierDetails {
  practiceFramework: 'INDIVIDUAL_LIBERAL' | '';
  replacementKind: 'DOCTOR' | 'STUDENT';
  holderName: string;
  holderRpps: string;
  holderOrderNumber: string;
  holderAddress: string;
  holderEmail: string;
  replacementName: string;
  replacementRpps: string;
  replacementOrderNumber: string;
  replacementAddress: string;
  replacementEmail: string;
  licenseNumber: string;
  licenseValidUntil: string;
  specialty: string;
  practiceAddress: string;
  startDate: string;
  endDate: string;
  scheduleDetails: string;
  retrocessionPercent: number | null;
  paymentTerms: string;
  orderCouncilName: string;
  orderEmail: string;
  holderSiret?: string;
  replacementSiret?: string;
  practiceResources?: string;
  periods?: DossierPeriod[];
  feeEntries?: DossierFeeEntry[];
}

export const DOSSIER_GENERATED_KINDS = ['CONTRACT', 'DECLARATION', 'FEE_STATEMENT'] as const;
export type GeneratedDossierKind = typeof DOSSIER_GENERATED_KINDS[number];
export const DOSSIER_ATTACHMENT_KINDS = [
  'SIGNED_CONTRACT', 'SIGNED_DECLARATION', 'REGISTRATION', 'LICENSE', 'AUTHORIZATION', 'INSURANCE',
  'ADDENDUM', 'REPLACEMENT_CERTIFICATE', 'ORDER_RESPONSE',
  'BANK_DETAILS', 'FEE_STATEMENT', 'PAYMENT_PROOF', 'OTHER',
] as const;
export type DossierAttachmentKind = typeof DOSSIER_ATTACHMENT_KINDS[number];

/** Bump whenever the legal text or semantics of a template changes. */
export const DOSSIER_TEMPLATE_VERSION = 'FR-LIBERAL-2026-11-03.1';

export const DOSSIER_FIELD_LABELS: Record<keyof DossierDetails, string> = {
  practiceFramework: 'Confirmation du remplacement médical libéral individuel',
  replacementKind: 'Statut du remplaçant',
  holderName: 'Nom du médecin remplacé',
  holderRpps: 'RPPS du médecin remplacé',
  holderOrderNumber: "Numéro d’inscription à l’Ordre du médecin remplacé",
  holderAddress: 'Adresse du médecin remplacé',
  holderEmail: 'Courriel du médecin remplacé',
  replacementName: 'Nom du remplaçant',
  replacementRpps: 'RPPS du remplaçant',
  replacementOrderNumber: "Numéro d’inscription à l’Ordre du remplaçant",
  replacementAddress: 'Adresse du remplaçant',
  replacementEmail: 'Courriel du remplaçant',
  licenseNumber: 'Numéro de la licence de remplacement',
  licenseValidUntil: 'Date de validité de la licence de remplacement',
  specialty: 'Spécialité concernée',
  practiceAddress: 'Adresse du lieu de remplacement',
  startDate: 'Début du remplacement',
  endDate: 'Fin du remplacement',
  scheduleDetails: 'Jours et horaires du remplacement',
  retrocessionPercent: 'Pourcentage des honoraires rétrocédés au remplaçant',
  paymentTerms: 'Délai et modalités de règlement des honoraires',
  orderCouncilName: 'Conseil départemental destinataire',
  orderEmail: 'Courriel du conseil départemental',
  holderSiret: 'SIRET du médecin remplacé (facultatif)',
  replacementSiret: 'SIRET du remplaçant (facultatif)',
  practiceResources: 'Locaux, matériel et secrétariat mis à disposition',
  periods: 'Périodes effectives du remplacement',
  feeEntries: 'Recettes du remplacement',
};

export const isDossierDate = (value: unknown): value is string => typeof value === 'string'
  && /^\d{4}-\d{2}-\d{2}$/.test(value)
  && !Number.isNaN(Date.parse(`${value}T00:00:00Z`))
  && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;

export function dossierPeriods(details: Partial<DossierDetails>): DossierPeriod[] {
  return details.periods?.length ? details.periods : [{ startDate: details.startDate || '', endDate: details.endDate || '' }];
}

export function dossierFeeTotals(details: Partial<DossierDetails>) {
  const totals = (details.feeEntries || []).reduce((sum, entry) => ({
    actCount: sum.actCount + entry.actCount,
    feesCents: sum.feesCents + entry.feesCents,
    supplementsCents: sum.supplementsCents + entry.supplementsCents,
    patientReceiptsCents: sum.patientReceiptsCents + entry.patientReceiptsCents,
    thirdPartyReceiptsCents: sum.thirdPartyReceiptsCents + entry.thirdPartyReceiptsCents,
  }), { actCount: 0, feesCents: 0, supplementsCents: 0, patientReceiptsCents: 0, thirdPartyReceiptsCents: 0 });
  const totalCents = totals.feesCents + totals.supplementsCents;
  const receivedCents = totals.patientReceiptsCents + totals.thirdPartyReceiptsCents;
  return { ...totals, totalCents, receivedCents, outstandingCents: totalCents - receivedCents,
    retrocessionCents: Math.round(totalCents * (details.retrocessionPercent || 0) / 100) };
}

/** Financial updates must not invalidate an otherwise unchanged signed contract or letter. */
export function dossierDocumentMatchesDetails(
  document: { kind: string; source: string; revision: number; detailsSnapshot?: unknown; templateVersion?: string | null },
  details: DossierDetails, revision: number,
) {
  if (document.source === 'GENERATED' && document.templateVersion && document.templateVersion !== DOSSIER_TEMPLATE_VERSION) return false;
  if (document.source !== 'GENERATED' && !['SIGNED_CONTRACT', 'SIGNED_DECLARATION'].includes(document.kind)) return true;
  if (!document.detailsSnapshot || typeof document.detailsSnapshot !== 'object') return document.revision === revision;
  const content = (value: DossierDetails) => Object.fromEntries(Object.keys(DOSSIER_FIELD_LABELS)
    .filter(key => key !== 'feeEntries' || document.kind === 'FEE_STATEMENT')
    .map(key => [key, key === 'periods'
      ? [...dossierPeriods(value)].sort((a, b) => a.startDate.localeCompare(b.startDate))
      : key === 'feeEntries' ? value.feeEntries || [] : value[key] ?? '']));
  return JSON.stringify(content(document.detailsSnapshot as DossierDetails)) === JSON.stringify(content(details));
}

/** Returns human-readable missing/invalid fields; never substitutes invented values. */
export function getMissingDossierFields(
  details: Partial<DossierDetails>,
  kind: GeneratedDossierKind = 'CONTRACT',
): string[] {
  const fields: (keyof DossierDetails)[] = kind === 'FEE_STATEMENT'
    ? ['holderName', 'replacementName', 'practiceAddress', 'startDate', 'endDate'] : [
    'holderName', 'holderRpps', 'holderOrderNumber', 'holderAddress',
    'replacementName', 'replacementAddress', 'specialty', 'practiceAddress',
    'startDate', 'endDate', 'orderCouncilName',
  ];
  if (kind === 'CONTRACT') fields.push('scheduleDetails', 'paymentTerms');
  if (kind !== 'FEE_STATEMENT' && details.replacementKind === 'STUDENT') fields.push('licenseNumber', 'licenseValidUntil');
  else if (kind !== 'FEE_STATEMENT' && details.replacementKind === 'DOCTOR') fields.push('replacementRpps', 'replacementOrderNumber');
  const missing = fields
    .filter((field) => typeof details[field] !== 'string' || !(details[field] as string).trim())
    .map((field) => DOSSIER_FIELD_LABELS[field]);
  if (details.practiceFramework !== 'INDIVIDUAL_LIBERAL') missing.push(DOSSIER_FIELD_LABELS.practiceFramework);
  if (details.replacementKind !== 'DOCTOR' && details.replacementKind !== 'STUDENT') missing.push(DOSSIER_FIELD_LABELS.replacementKind);
  // Reject missing glyphs rather than silently corrupting a legal identity.
  for (const [field, value] of Object.entries(details)) {
    if (typeof value === 'string' && !supportsDossierText(value)) {
      missing.push(`${DOSSIER_FIELD_LABELS[field] || field} : caractère non pris en charge par le PDF`);
    }
  }
  for (const key of ['holderSiret', 'replacementSiret'] as const) {
    if (details[key] && !/^\d{14}$/.test(details[key])) missing.push(`${DOSSIER_FIELD_LABELS[key]} : 14 chiffres attendus`);
  }
  if (kind !== 'DECLARATION' && (
    typeof details.retrocessionPercent !== 'number' || !Number.isFinite(details.retrocessionPercent)
    || details.retrocessionPercent < 0 || details.retrocessionPercent > 100
  )) missing.push(DOSSIER_FIELD_LABELS.retrocessionPercent);

  const validDate = isDossierDate;
  for (const field of ['startDate', 'endDate', ...(details.replacementKind === 'STUDENT' ? ['licenseValidUntil'] : [])] as const) {
    if (details[field] && !validDate(details[field])) missing.push(`${DOSSIER_FIELD_LABELS[field]} : date invalide`);
  }
  if (validDate(details.startDate) && validDate(details.endDate)) {
    if (details.endDate < details.startDate) missing.push('La fin du remplacement doit suivre son début');
    if (kind !== 'FEE_STATEMENT' && details.replacementKind === 'STUDENT') {
      // Conservative calendar limit for a single student authorisation request.
      const start = new Date(`${details.startDate}T00:00:00Z`);
      const limit = new Date(start);
      limit.setUTCMonth(limit.getUTCMonth() + 3);
      if (limit.getUTCDate() !== start.getUTCDate()) limit.setUTCDate(0);
      if (new Date(`${details.endDate}T00:00:00Z`) >= limit) {
        missing.push('Pour un étudiant, limiter la demande à trois mois maximum (renouvellement distinct)');
      }
      if (validDate(details.licenseValidUntil) && details.licenseValidUntil < details.endDate) {
        missing.push('La licence de remplacement doit couvrir toute la période demandée');
      }
    }
  }
  const periods = [...dossierPeriods(details)].sort((a, b) => a.startDate.localeCompare(b.startDate));
  periods.forEach((period, index) => {
    if (!validDate(period.startDate) || !validDate(period.endDate) || period.endDate < period.startDate) {
      missing.push(`Période ${index + 1} : dates invalides ou inversées`);
    }
    if (index && period.startDate <= periods[index - 1].endDate) missing.push('Les périodes du remplacement ne doivent pas se chevaucher');
  });
  if (periods.length && (periods[0].startDate !== details.startDate || periods[periods.length - 1].endDate !== details.endDate)) {
    missing.push('Les dates globales doivent correspondre aux première et dernière périodes');
  }
  if (kind === 'FEE_STATEMENT') {
    if (!details.feeEntries?.length) missing.push('Ajoutez au moins une ligne de recettes');
    for (const [index, entry] of (details.feeEntries || []).entries()) {
      const prefix = `Recettes, ligne ${index + 1}`;
      if (!validDate(entry.date) || !periods.some(period => entry.date >= period.startDate && entry.date <= period.endDate)) {
        missing.push(`${prefix} : la date doit appartenir à une période effective du remplacement`);
      }
      if (!Number.isInteger(entry.actCount) || entry.actCount < 1 || entry.actCount > 10000) missing.push(`${prefix} : nombre d’actes invalide`);
      if (['feesCents', 'supplementsCents', 'patientReceiptsCents', 'thirdPartyReceiptsCents'].some(key =>
        !Number.isSafeInteger(entry[key]) || entry[key] < 0 || entry[key] > 1_000_000_000)) missing.push(`${prefix} : montant invalide`);
      if (entry.patientReceiptsCents + entry.thirdPartyReceiptsCents > entry.feesCents + entry.supplementsCents) {
        missing.push(`${prefix} : les encaissements dépassent les honoraires et suppléments`);
      }
      if (!DOSSIER_PAYMENT_METHODS.includes(entry.paymentMethod)) missing.push(`${prefix} : mode de paiement invalide`);
    }
  }
  return [...new Set(missing)];
}
