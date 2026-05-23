import type { MedicalStatus } from './types';

export type ChoiceOption = { value: string; label: string };

export const candidateMedicalStatusOptions: Array<{ value: MedicalStatus; label: string }> = [
  { value: 'INTERN', label: 'Interne' },
  { value: 'JUNIOR_DOCTOR', label: 'Docteur junior' },
  { value: 'DOCTOR', label: 'Medecin these' },
  { value: 'REGULAR_LOCUM', label: 'Remplacant regulier' },
  { value: 'OTHER', label: 'Autre' },
];

export const specialtyOptions: ChoiceOption[] = [
  { value: 'Medecine generale', label: 'Medecine generale' },
  { value: 'Urgences', label: 'Urgences' },
  { value: 'Anesthesie-reanimation', label: 'Anesthesie-reanimation' },
  { value: 'Pediatrie', label: 'Pediatrie' },
  { value: 'Gynecologie-obstetrique', label: 'Gynecologie-obstetrique' },
  { value: 'Psychiatrie', label: 'Psychiatrie' },
  { value: 'Radiologie', label: 'Radiologie' },
  { value: 'Cardiologie', label: 'Cardiologie' },
];

export const cityOptions: ChoiceOption[] = [
  { value: 'Paris', label: 'Paris' },
  { value: 'Lyon', label: 'Lyon' },
  { value: 'Marseille', label: 'Marseille' },
  { value: 'Toulouse', label: 'Toulouse' },
  { value: 'Bordeaux', label: 'Bordeaux' },
  { value: 'Lille', label: 'Lille' },
  { value: 'Nantes', label: 'Nantes' },
  { value: 'Montpellier', label: 'Montpellier' },
];

export const countryOptions: ChoiceOption[] = [
  { value: 'France', label: 'France' },
  { value: 'Belgique', label: 'Belgique' },
  { value: 'Suisse', label: 'Suisse' },
  { value: 'Luxembourg', label: 'Luxembourg' },
];

export const sectorOptions: ChoiceOption[] = [
  { value: 'SECTEUR_1', label: 'Secteur 1' },
  { value: 'SECTEUR_2', label: 'Secteur 2' },
  { value: 'SECTEUR_3', label: 'Secteur 3' },
];

export const establishmentDepartmentOptions: ChoiceOption[] = [
  { value: 'Urgences adultes', label: 'Urgences adultes' },
  { value: 'Urgences pediatriques', label: 'Urgences pediatriques' },
  { value: 'Cabinet de groupe', label: 'Cabinet de groupe' },
  { value: 'Bloc ambulatoire', label: 'Bloc ambulatoire' },
  { value: 'Service hospitalier', label: 'Service hospitalier' },
];

export const hospitalOrFacultyOptions: ChoiceOption[] = [
  { value: 'CHU', label: 'CHU' },
  { value: 'CH', label: 'Centre hospitalier' },
  { value: 'Clinique privee', label: 'Clinique privee' },
  { value: 'Faculte de medecine', label: 'Faculte de medecine' },
  { value: 'Cabinet liberal', label: 'Cabinet liberal' },
];

export const mobilityOptions: ChoiceOption[] = [
  { value: 'Voiture', label: 'Voiture' },
  { value: 'Train', label: 'Train' },
  { value: 'Logement necessaire', label: 'Logement necessaire' },
];

export const acceptedMissionTypeOptions: ChoiceOption[] = [
  { value: 'Garde', label: 'Garde' },
  { value: 'Remplacement', label: 'Remplacement' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'Urgence', label: 'Urgence' },
  { value: 'Cabinet liberal', label: 'Cabinet liberal' },
  { value: 'Clinique', label: 'Clinique' },
];

export const durationOptions: ChoiceOption[] = [
  { value: 'Demi-journee', label: 'Demi-journee' },
  { value: 'Journee', label: 'Journee' },
  { value: '24 h', label: '24 h' },
  { value: 'Week-end', label: 'Week-end' },
  { value: '1 semaine', label: '1 semaine' },
  { value: 'Longue mission', label: 'Longue mission' },
];

export const refusedScheduleOptions: ChoiceOption[] = [
  { value: 'Nuits', label: 'Nuits' },
  { value: 'Week-ends', label: 'Week-ends' },
  { value: 'Jours feries', label: 'Jours feries' },
  { value: 'Matins tres tot', label: 'Matins tres tot' },
  { value: 'Gardes 24 h', label: 'Gardes 24 h' },
];

export const softwareOptions: ChoiceOption[] = [
  { value: 'Doctolib', label: 'Doctolib' },
  { value: 'Weda', label: 'Weda' },
  { value: 'Hellodoc', label: 'Hellodoc' },
  { value: 'Crossway', label: 'Crossway' },
  { value: 'MediStory', label: 'MediStory' },
  { value: 'Axisante', label: 'Axisante' },
  { value: 'Orbis', label: 'Orbis' },
  { value: 'DxCare', label: 'DxCare' },
];

export const secretaryTypeOptions: ChoiceOption[] = [
  { value: 'Presentiel', label: 'Presentiel' },
  { value: 'Distanciel', label: 'Distanciel' },
  { value: 'Mixte', label: 'Mixte' },
];

export const equipmentOptions: ChoiceOption[] = [
  { value: 'ECG', label: 'ECG' },
  { value: 'Echographe', label: 'Echographe' },
  { value: 'Radiologie', label: 'Radiologie' },
  { value: 'Biologie rapide', label: 'Biologie rapide' },
  { value: 'Materiel de suture', label: 'Materiel de suture' },
  { value: 'Salle de soins', label: 'Salle de soins' },
  { value: 'Oxymetre', label: 'Oxymetre' },
  { value: 'Defibrillateur', label: 'Defibrillateur' },
];

export const patientTypeOptions: ChoiceOption[] = [
  { value: 'Adultes', label: 'Adultes' },
  { value: 'Enfants', label: 'Enfants' },
  { value: 'Personnes agees', label: 'Personnes agees' },
  { value: 'Patientele chronique', label: 'Patientele chronique' },
  { value: 'Soins non programmes', label: 'Soins non programmes' },
  { value: 'Urgences', label: 'Urgences' },
];

export const actsPerformedOptions: ChoiceOption[] = [
  { value: 'Consultations', label: 'Consultations' },
  { value: 'Sutures', label: 'Sutures' },
  { value: 'ECG', label: 'ECG' },
  { value: 'Echographie', label: 'Echographie' },
  { value: 'Petite traumatologie', label: 'Petite traumatologie' },
  { value: 'Gestes d urgence', label: 'Gestes d urgence' },
];

export const pressureLevelOptions: ChoiceOption[] = [
  { value: 'Faible', label: 'Faible' },
  { value: 'Modere', label: 'Modere' },
  { value: 'Soutenu', label: 'Soutenu' },
  { value: 'Tres soutenu', label: 'Tres soutenu' },
];
