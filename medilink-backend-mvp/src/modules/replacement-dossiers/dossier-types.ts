import { supportsDossierText } from './dossier-font';

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
}

export type GeneratedDossierKind = 'CONTRACT' | 'DECLARATION';
export const DOSSIER_ATTACHMENT_KINDS = [
  'SIGNED_CONTRACT', 'REGISTRATION', 'LICENSE', 'AUTHORIZATION', 'INSURANCE',
  'ADDENDUM', 'REPLACEMENT_CERTIFICATE', 'ORDER_RESPONSE',
  'BANK_DETAILS', 'FEE_STATEMENT', 'PAYMENT_PROOF', 'OTHER',
] as const;
export type DossierAttachmentKind = typeof DOSSIER_ATTACHMENT_KINDS[number];

/** Bump whenever the legal text or semantics of a template changes. */
export const DOSSIER_TEMPLATE_VERSION = 'FR-LIBERAL-2026-09-19.1';

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
};

/** Returns human-readable missing/invalid fields; never substitutes invented values. */
export function getMissingDossierFields(
  details: Partial<DossierDetails>,
  kind: GeneratedDossierKind = 'CONTRACT',
): string[] {
  const fields: (keyof DossierDetails)[] = [
    'holderName', 'holderRpps', 'holderOrderNumber', 'holderAddress',
    'replacementName', 'replacementAddress', 'specialty', 'practiceAddress',
    'startDate', 'endDate', 'orderCouncilName',
  ];
  if (kind === 'CONTRACT') fields.push('scheduleDetails', 'paymentTerms');
  if (details.replacementKind === 'STUDENT') fields.push('licenseNumber', 'licenseValidUntil');
  else if (details.replacementKind === 'DOCTOR') fields.push('replacementRpps', 'replacementOrderNumber');
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
  if (kind === 'CONTRACT' && (
    typeof details.retrocessionPercent !== 'number' || !Number.isFinite(details.retrocessionPercent)
    || details.retrocessionPercent < 0 || details.retrocessionPercent > 100
  )) missing.push(DOSSIER_FIELD_LABELS.retrocessionPercent);

  const validDate = (date: unknown): date is string => typeof date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(date)
    && !Number.isNaN(Date.parse(`${date}T00:00:00Z`))
    && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  for (const field of ['startDate', 'endDate', ...(details.replacementKind === 'STUDENT' ? ['licenseValidUntil'] : [])] as const) {
    if (details[field] && !validDate(details[field])) missing.push(`${DOSSIER_FIELD_LABELS[field]} : date invalide`);
  }
  if (validDate(details.startDate) && validDate(details.endDate)) {
    if (details.endDate < details.startDate) missing.push('La fin du remplacement doit suivre son début');
    if (details.replacementKind === 'STUDENT') {
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
  return [...new Set(missing)];
}
