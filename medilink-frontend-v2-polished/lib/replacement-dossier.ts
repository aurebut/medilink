export const dossierUploadKinds = [
  'SIGNED_CONTRACT', 'REGISTRATION', 'LICENSE', 'AUTHORIZATION', 'INSURANCE',
  'ADDENDUM', 'REPLACEMENT_CERTIFICATE', 'ORDER_RESPONSE',
  'BANK_DETAILS', 'FEE_STATEMENT', 'PAYMENT_PROOF', 'OTHER',
] as const;
export type DossierUploadKind = typeof dossierUploadKinds[number];
export type DossierDocumentKind = 'CONTRACT' | 'DECLARATION' | DossierUploadKind;
export type DossierCategory = 'replacement' | 'payment' | 'additional';
export type DossierRecipientType = 'COUNTERPART' | 'ORDER' | 'CPAM' | 'OTHER';
export const dossierRecipientLabels: Record<DossierRecipientType, string> = {
  COUNTERPART: 'Autre partie du remplacement', ORDER: 'Conseil de l’Ordre', CPAM: 'Assurance maladie (CPAM)', OTHER: 'Autre destinataire',
};

export const dossierCategories: { id: DossierCategory; label: string; title: string }[] = [
  { id: 'replacement', label: 'Remplacement', title: 'Préparer le remplacement' },
  { id: 'payment', label: 'Paiement', title: 'Régler la rétrocession' },
  { id: 'additional', label: 'Compléments', title: 'Selon votre situation' },
];

export function dossierCategoryFor(kind: DossierDocumentKind): DossierCategory {
  if (['BANK_DETAILS', 'FEE_STATEMENT', 'PAYMENT_PROOF'].includes(kind)) return 'payment';
  if (['ADDENDUM', 'REPLACEMENT_CERTIFICATE', 'ORDER_RESPONSE', 'OTHER'].includes(kind)) return 'additional';
  return 'replacement';
}

// Each amendment, reply and miscellaneous attachment can be a distinct document.
export function dossierKindAllowsMultiple(kind: DossierDocumentKind) {
  return ['ADDENDUM', 'ORDER_RESPONSE', 'OTHER'].includes(kind);
}

export type ReplacementDetails = {
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
};

export type DossierDocument = {
  id: string;
  kind: DossierDocumentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: 'UPLOADING' | 'READY';
  version: number;
  revision: number;
  createdAt: string;
  expiresAt?: string | null;
  source: 'GENERATED' | 'UPLOADED';
  templateVersion?: string | null;
};

export type DossierDelivery = {
  id: string;
  idempotencyKey?: string;
  recipientEmail: string;
  recipientName?: string;
  recipientType: DossierRecipientType;
  status: 'SENT' | 'FAILED' | 'SENDING';
  createdAt: string;
  sentAt?: string | null;
  documentIds: string[];
  error?: string | null;
};

export type ReplacementDossierData = {
  id: string;
  applicationId: string;
  revision: number;
  details: ReplacementDetails;
  documents: DossierDocument[];
  deliveries: DossierDelivery[];
  canEdit: boolean;
  canSend: boolean;
  missingFields: string[];
};

export const dossierDocumentLabels: Record<DossierDocumentKind, string> = {
  CONTRACT: 'Contrat de remplacement',
  SIGNED_CONTRACT: 'Contrat signé',
  DECLARATION: 'Courrier au Conseil de l’Ordre',
  REGISTRATION: 'Inscription au Tableau de l’Ordre',
  LICENSE: 'Licence de remplacement',
  AUTHORIZATION: 'Autorisation du Conseil de l’Ordre',
  INSURANCE: 'Attestation d’assurance RCP',
  ADDENDUM: 'Avenant au contrat',
  REPLACEMENT_CERTIFICATE: 'Attestation de remplacement pour la CPAM',
  ORDER_RESPONSE: 'Retour du Conseil de l’Ordre',
  BANK_DETAILS: 'RIB pour le règlement',
  FEE_STATEMENT: 'Décompte de rétrocession',
  PAYMENT_PROOF: 'Justificatif de paiement',
  OTHER: 'Autre pièce du dossier',
};

export const dossierDocumentHints: Partial<Record<DossierDocumentKind, string>> = {
  ADDENDUM: 'Ajoutez l’avenant signé si les conditions du remplacement ont été modifiées.',
  REPLACEMENT_CERTIFICATE: 'Ajoutez l’attestation de remplacement si votre CPAM la demande.',
  ORDER_RESPONSE: 'Conservez ici les courriers et accusés de réception du Conseil. Un accusé de réception ne vaut pas autorisation.',
  BANK_DETAILS: 'Le RIB partagé permet à l’autre partie de préparer le règlement.',
  FEE_STATEMENT: 'Ajoutez le décompte des honoraires et de la rétrocession convenus pour cette période.',
  PAYMENT_PROOF: 'Ajoutez le reçu ou la confirmation de virement correspondant au règlement.',
  OTHER: 'Ajoutez une pièce utile à ce remplacement. Elle sera partagée avec l’autre partie.',
};

export const dossierFieldLabels: Record<keyof ReplacementDetails, string> = {
  practiceFramework: 'Cadre d’exercice', replacementKind: 'Statut du remplaçant',
  holderName: 'Nom du médecin remplacé', holderRpps: 'RPPS du médecin remplacé', holderOrderNumber: 'N° ordinal du médecin remplacé',
  holderAddress: 'Adresse professionnelle du médecin remplacé', holderEmail: 'Email du médecin remplacé',
  replacementName: 'Nom du remplaçant', replacementRpps: 'RPPS du remplaçant', replacementOrderNumber: 'N° ordinal du remplaçant',
  replacementAddress: 'Adresse professionnelle du remplaçant', replacementEmail: 'Email du remplaçant',
  licenseNumber: 'N° de licence', licenseValidUntil: 'Validité de la licence', specialty: 'Spécialité', practiceAddress: 'Lieu du remplacement',
  startDate: 'Premier jour', endDate: 'Dernier jour', scheduleDetails: 'Jours et horaires convenus', retrocessionPercent: 'Rétrocession au remplaçant (%)',
  paymentTerms: 'Modalités et délai de paiement', orderCouncilName: 'Conseil départemental destinataire', orderEmail: 'Email du Conseil départemental',
};

export function currentDossierDocument(dossier: ReplacementDossierData, kind: DossierDocumentKind) {
  return dossier.documents.filter((document) => document.kind === kind && document.status === 'READY')
    .sort((a, b) => b.version - a.version || b.createdAt.localeCompare(a.createdAt))[0];
}

export function dossierDocumentIsCurrent(document: DossierDocument, dossier: ReplacementDossierData) {
  if ((document.source === 'GENERATED' || document.kind === 'SIGNED_CONTRACT') && document.revision !== dossier.revision) return false;
  // An attestation must cover the replacement through its final day.
  const coverageDate = dossier.details.endDate?.slice(0, 10) || new Date().toISOString().slice(0, 10);
  return !document.expiresAt || document.expiresAt.slice(0, 10) >= coverageDate;
}

export function dossierDate(value?: string | null) {
  if (!value) return 'À préciser';
  // Dossier dates are calendar dates, including validity stored at UTC midnight.
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isNaN(date.getTime()) ? 'À préciser' : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(date);
}
