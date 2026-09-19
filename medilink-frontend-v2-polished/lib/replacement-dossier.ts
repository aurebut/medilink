export type DossierDocumentKind = 'CONTRACT' | 'DECLARATION' | 'SIGNED_CONTRACT' | 'REGISTRATION' | 'LICENSE' | 'AUTHORIZATION' | 'INSURANCE' | 'OTHER';
export type DossierUploadKind = Exclude<DossierDocumentKind, 'CONTRACT' | 'DECLARATION'>;

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
  recipientType: 'COUNTERPART' | 'ORDER';
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
  OTHER: 'Autre pièce du dossier',
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
