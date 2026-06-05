import type { MedicalStatus } from './types';

export type ChoiceOption = { value: string; label: string };

export const candidateMedicalStatusOptions: Array<{ value: MedicalStatus; label: string }> = [
  { value: 'INTERN', label: 'Interne' },
  { value: 'JUNIOR_DOCTOR', label: 'Docteur junior' },
  { value: 'DOCTOR', label: 'Médecin thésé' },
  { value: 'REGULAR_LOCUM', label: 'Remplaçant régulier' },
  { value: 'OTHER', label: 'Autre' },
];

export const specialtyOptions: ChoiceOption[] = [
  { value: 'Medecine generale', label: 'Médecine générale' },
  { value: 'Urgences', label: 'Urgences' },
  { value: 'Anesthesie-reanimation', label: 'Anesthésie-réanimation' },
  { value: 'Pediatrie', label: 'Pédiatrie' },
  { value: 'Gynecologie-obstetrique', label: 'Gynécologie-obstétrique' },
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

export const universityDiplomaOptions: ChoiceOption[] = [
  { value: 'DFGSM', label: 'DFGSM' },
  { value: 'DFASM', label: 'DFASM' },
  { value: 'DES medecine generale', label: 'DES médecine générale' },
  { value: 'DES urgences', label: "DES médecine d'urgence" },
  { value: 'DES pediatrie', label: 'DES pédiatrie' },
  { value: 'DES gynecologie', label: 'DES gynécologie' },
  { value: 'DU', label: 'DU' },
  { value: 'DIU', label: 'DIU' },
  { value: 'These medecine', label: 'Thèse de médecine' },
];

export const establishmentDepartmentOptions: ChoiceOption[] = [
  { value: 'Urgences adultes', label: 'Urgences adultes' },
  { value: 'Urgences pediatriques', label: 'Urgences pédiatriques' },
  { value: 'Urgences gynecologiques', label: 'Urgences gynécologiques' },
  { value: 'Urgences traumatologiques', label: 'Urgences traumatologiques' },
  { value: 'Soins non programmes', label: 'Soins non programmés' },
  { value: 'Cabinet medical individuel', label: 'Cabinet médical individuel' },
  { value: 'Cabinet de groupe', label: 'Cabinet de groupe' },
  { value: 'Maison de sante pluriprofessionnelle', label: 'Maison de santé pluriprofessionnelle' },
  { value: 'Centre de sante', label: 'Centre de santé' },
  { value: 'Bloc ambulatoire', label: 'Bloc ambulatoire' },
  { value: 'Service hospitalier', label: 'Service hospitalier' },
];

export const hospitalOrFacultyOptions: ChoiceOption[] = [
  { value: 'CHU', label: 'CHU' },
  { value: 'CH', label: 'Centre hospitalier' },
  { value: 'Clinique privee', label: 'Clinique privée' },
  { value: 'Faculte de medecine', label: 'Faculté de médecine' },
  { value: 'Cabinet liberal', label: 'Cabinet libéral' },
];

export const mobilityOptions: ChoiceOption[] = [
  { value: 'Voiture', label: 'Voiture' },
  { value: 'Train', label: 'Train' },
  { value: 'Logement necessaire', label: 'Logement nécessaire' },
];

export const acceptedMissionTypeOptions: ChoiceOption[] = [
  { value: 'Garde', label: 'Garde' },
  { value: 'Remplacement', label: 'Remplacement' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'Urgence', label: 'Urgence' },
  { value: 'Cabinet liberal', label: 'Cabinet libéral' },
  { value: 'Clinique', label: 'Clinique' },
];

export const durationOptions: ChoiceOption[] = [
  { value: 'Demi-journee', label: 'Demi-journée' },
  { value: 'Journee', label: 'Journée' },
  { value: '24 h', label: '24 h' },
  { value: 'Week-end', label: 'Week-end' },
  { value: '1 semaine', label: '1 semaine' },
  { value: 'Longue mission', label: 'Longue mission' },
];

export const refusedScheduleOptions: ChoiceOption[] = [
  { value: 'Nuits', label: 'Nuits' },
  { value: 'Week-ends', label: 'Week-ends' },
  { value: 'Jours feries', label: 'Jours fériés' },
  { value: 'Matins tres tot', label: 'Matins très tôt' },
  { value: 'Gardes 24 h', label: 'Gardes 24 h' },
];

export const softwareOptions: ChoiceOption[] = [
  { value: 'Doctolib', label: 'Doctolib' },
  { value: 'Weda', label: 'Weda' },
  { value: 'Hellodoc', label: 'Hellodoc' },
  { value: 'Crossway', label: 'Crossway' },
  { value: 'MediStory', label: 'MediStory' },
  { value: 'Axisante', label: 'Axisanté' },
  { value: 'Orbis', label: 'Orbis' },
  { value: 'DxCare', label: 'DxCare' },
  { value: 'Medistory', label: 'Medistory' },
  { value: 'DrSante', label: 'DrSanté' },
  { value: 'Maiia', label: 'Maiia' },
  { value: 'MonLogicielMedical', label: 'MonLogicielMédical' },
  { value: 'Cegid Maiia', label: 'Cegid Maiia' },
  { value: 'Hopital Manager', label: 'Hôpital Manager' },
];

export const secretaryTypeOptions: ChoiceOption[] = [
  { value: 'Presentiel', label: 'Présentiel' },
  { value: 'Distanciel', label: 'Distanciel' },
  { value: 'Mixte', label: 'Mixte' },
];

export const equipmentOptions: ChoiceOption[] = [
  { value: 'ECG', label: 'ECG' },
  { value: 'Echographe', label: 'Échographe' },
  { value: 'Radiologie', label: 'Radiologie' },
  { value: 'Biologie rapide', label: 'Biologie rapide' },
  { value: 'Materiel de suture', label: 'Matériel de suture' },
  { value: 'Salle de soins', label: 'Salle de soins' },
  { value: 'Oxymetre', label: 'Oxymètre' },
  { value: 'Defibrillateur', label: 'Défibrillateur' },
];

export const patientTypeOptions: ChoiceOption[] = [
  { value: 'Adultes', label: 'Adultes' },
  { value: 'Enfants', label: 'Enfants' },
  { value: 'Nourrissons', label: 'Nourrissons' },
  { value: 'Personnes agees', label: 'Personnes âgées' },
  { value: 'Patientele chronique', label: 'Patientèle chronique' },
  { value: 'Patientele rurale', label: 'Patientèle rurale' },
  { value: 'Patientele urbaine', label: 'Patientèle urbaine' },
  { value: 'Patientele precaire', label: 'Patientèle précaire' },
  { value: 'EHPAD', label: 'EHPAD' },
  { value: 'Soins non programmes', label: 'Soins non programmés' },
  { value: 'Urgences', label: 'Urgences' },
];

export const actsPerformedOptions: ChoiceOption[] = [
  { value: 'Consultations', label: 'Consultations' },
  { value: 'Vaccination', label: 'Vaccination' },
  { value: 'Sutures', label: 'Sutures' },
  { value: 'ECG', label: 'ECG' },
  { value: 'Echographie', label: 'Échographie' },
  { value: 'Pose de sterilet', label: 'Pose de stérilet' },
  { value: 'Frottis', label: 'Frottis' },
  { value: 'Infiltration', label: 'Infiltration' },
  { value: 'Aerosoltherapie', label: 'Aérosolthérapie' },
  { value: 'Pose de voie veineuse', label: 'Pose de voie veineuse' },
  { value: 'Gestion plaies', label: 'Gestion des plaies' },
  { value: 'Petite traumatologie', label: 'Petite traumatologie' },
  { value: 'Gestes d urgence', label: "Gestes d'urgence" },
];

export const pressureLevelOptions: ChoiceOption[] = [
  { value: 'Faible', label: 'Faible' },
  { value: 'Modere', label: 'Modéré' },
  { value: 'Soutenu', label: 'Soutenu' },
  { value: 'Tres soutenu', label: 'Très soutenu' },
];
