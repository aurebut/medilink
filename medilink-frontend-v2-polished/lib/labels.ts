import type { ApplicationStatus, DocumentType, DocumentVerificationStatus, EstablishmentType, MedicalStatus, MissionStatus, MissionType, RequiredLevel, UserRole, UserStatus, VerificationStatus } from './types';

export const medicalStatusOptions: Array<{ value: MedicalStatus; label: string }> = [
  { value: 'STUDENT', label: 'Étudiant' },
  { value: 'INTERN', label: 'Interne' },
  { value: 'JUNIOR_DOCTOR', label: 'Docteur junior' },
  { value: 'DOCTOR', label: 'Médecin' },
  { value: 'NURSE', label: 'Infirmier / infirmière' },
  { value: 'OPERATING_ROOM_ASSISTANT', label: 'Aide opératoire' },
  { value: 'OTHER', label: 'Autre' },
];

export const documentTypeOptions: Array<{ value: DocumentType; label: string }> = [
  { value: 'CV', label: 'CV' },
  { value: 'ATTESTATION', label: 'Attestation' },
  { value: 'CONVENTION', label: 'Convention' },
  { value: 'DIPLOMA', label: 'Diplôme' },
  { value: 'IDENTITY_DOCUMENT', label: "Pièce d'identité" },
  { value: 'INSURANCE', label: 'Assurance' },
  { value: 'OTHER', label: 'Autre document' },
];

export const establishmentTypeOptions: Array<{ value: EstablishmentType; label: string }> = [
  { value: 'HOSPITAL', label: 'Hôpital public' },
  { value: 'CLINIC', label: 'Clinique privée' },
  { value: 'CABINET', label: 'Cabinet' },
  { value: 'MEDICAL_SERVICE', label: 'Service médical' },
  { value: 'AGENCY', label: 'Agence' },
  { value: 'OTHER', label: 'Autre' },
];

export const missionTypeOptions: Array<{ value: MissionType; label: string }> = [
  { value: 'GARDE', label: 'Garde' },
  { value: 'REMPLACEMENT', label: 'Remplacement' },
  { value: 'VACATION', label: 'Vacation' },
  { value: 'STAGE', label: 'Stage' },
  { value: 'AIDE_OP', label: 'Aide op.' },
];

export const requiredLevelOptions: Array<{ value: RequiredLevel; label: string }> = [
  { value: 'STUDENT', label: 'Étudiant' },
  { value: 'INTERN', label: 'Interne' },
  { value: 'JUNIOR_DOCTOR', label: 'Docteur junior' },
  { value: 'DOCTOR', label: 'Médecin' },
  { value: 'NURSE', label: 'Infirmier / infirmière' },
  { value: 'OPERATING_ROOM_ASSISTANT', label: 'Aide opératoire' },
  { value: 'OTHER', label: 'Autre profil' },
];

export function roleLabel(role?: UserRole) {
  const map: Record<UserRole, string> = {
    CANDIDATE: 'Candidat',
    ESTABLISHMENT_OWNER: 'Établissement - propriétaire',
    ESTABLISHMENT_ADMIN: 'Établissement - admin',
    ESTABLISHMENT_RECRUITER: 'Établissement - recruteur',
    ESTABLISHMENT_VIEWER: 'Établissement - lecture',
    MEDILINK_ADMIN: 'Admin Médilink',
    MEDILINK_SUPPORT: 'Support Médilink',
  };
  return role ? map[role] : '—';
}

export function statusLabel(status?: UserStatus | MissionStatus | ApplicationStatus | DocumentVerificationStatus | VerificationStatus | string) {
  const map: Record<string, string> = {
    PENDING_EMAIL_VERIFICATION: 'Email à vérifier',
    ACTIVE: 'Actif',
    SUSPENDED: 'Suspendu',
    DELETED: 'Supprimé',
    DRAFT: 'Brouillon',
    PUBLISHED: 'Publiée',
    PAUSED: 'En pause',
    FILLED: 'Pourvue',
    ARCHIVED: 'Archivée',
    SUBMITTED: 'Envoyée',
    VIEWED: 'Vue',
    ACCEPTED: 'Acceptée',
    REJECTED: 'Refusée',
    WITHDRAWN: 'Retirée',
    CANCELLED: 'Annulée',
    UPLOAD_PENDING: 'Upload en attente',
    PENDING_VERIFICATION: 'À vérifier',
    APPROVED: 'Validé',
    EXPIRED: 'Expiré',
    VERIFIED: 'Vérifié',
    PENDING: 'En attente',
  };
  return status ? map[status] || status : '—';
}

export function missionTypeLabel(value?: MissionType) {
  return missionTypeOptions.find((x) => x.value === value)?.label || value || '—';
}

export function requiredLevelLabel(value?: RequiredLevel) {
  return requiredLevelOptions.find((x) => x.value === value)?.label || value || '—';
}

export function requiredLevelLabels(values?: RequiredLevel[] | null, fallback?: RequiredLevel | null) {
  const selected = values?.length ? values : fallback ? [fallback] : [];
  return selected.map((value) => requiredLevelLabel(value)).join(', ') || '—';
}

export function documentTypeLabel(value?: DocumentType) {
  return documentTypeOptions.find((x) => x.value === value)?.label || value || '—';
}

export function establishmentTypeLabel(value?: EstablishmentType) {
  return establishmentTypeOptions.find((x) => x.value === value)?.label || value || '—';
}
