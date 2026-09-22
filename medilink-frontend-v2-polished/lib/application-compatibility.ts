import type { Mission, Profile, RequiredLevel } from './types';

export type CompatibilityStatus = 'match' | 'mismatch' | 'unknown';

export type CompatibilityCriterion = {
  id: 'specialty' | 'level' | 'location' | 'missionType' | 'software' | 'patients' | 'retrocession' | 'availability';
  label: string;
  status: CompatibilityStatus;
  missionValue: string;
  profileValue: string;
  detail: string;
};

export type ApplicationCompatibility = {
  criteria: CompatibilityCriterion[];
  matchedCount: number;
  comparedCount: number;
  unknownCount: number;
  mismatchCount: number;
  totalCount: number;
  summary: string;
  coverageLabel: string;
};

const levelLabels: Record<string, string> = {
  STUDENT: 'Étudiant', INTERN: 'Interne', JUNIOR_DOCTOR: 'Docteur junior',
  DOCTOR: 'Médecin diplômé', REGULAR_LOCUM: 'Médecin remplaçant', NURSE: 'Infirmier',
  OPERATING_ROOM_ASSISTANT: 'Aide opératoire', OTHER: 'Autre statut',
};

// The same professional-level hierarchy is used by the matching service.
// This describes the declared level only; it never verifies a licence to practise.
const compatibleLevels: Record<RequiredLevel, readonly RequiredLevel[]> = {
  STUDENT: ['STUDENT', 'INTERN', 'JUNIOR_DOCTOR', 'DOCTOR'],
  INTERN: ['INTERN', 'JUNIOR_DOCTOR', 'DOCTOR'],
  JUNIOR_DOCTOR: ['JUNIOR_DOCTOR', 'DOCTOR'], DOCTOR: ['DOCTOR'],
  NURSE: ['NURSE'], OPERATING_ROOM_ASSISTANT: ['OPERATING_ROOM_ASSISTANT'], OTHER: ['OTHER'],
};

const missionTypeLabels: Record<string, string> = {
  REMPLACEMENT: 'Remplacement', GARDE: 'Garde', VACATION: 'Vacation', STAGE: 'Stage', AIDE_OP: 'Aide opératoire',
};

function normalize(value: string | null | undefined) {
  return (value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function values(items: readonly (string | null | undefined)[] | null | undefined) {
  return [...new Map((items || []).filter((item): item is string => Boolean(item?.trim())).map(item => [normalize(item), item.trim()])).values()];
}

function missionType(value: string) {
  const legacy: Record<string, string> = {
    remplacement: 'REMPLACEMENT', remplacement_courte_duree: 'REMPLACEMENT', remplacement_longue_duree: 'REMPLACEMENT',
    garde: 'GARDE', vacation: 'VACATION', stage: 'STAGE', 'aide op': 'AIDE_OP', 'aide op.': 'AIDE_OP',
  };
  return legacy[normalize(value)] || value.toUpperCase();
}

function contains(items: readonly string[], value: string) {
  return items.some(item => normalize(item) === normalize(value));
}

function percentage(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 100;
}

function dateLabel(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/Paris' }).format(date);
}

/**
 * Explain a received application from the mission and profile already authorized
 * by the applications API. Equal-weight counts describe available declarations;
 * they are not the backend dispatch score, an eligibility decision or a ranking.
 * Identity, photos, gender, age and profile completeness do not affect the result.
 */
export function getApplicationCompatibility(
  mission?: Partial<Mission> | null,
  profile?: Partial<Profile> | null,
): ApplicationCompatibility {
  const criteria: CompatibilityCriterion[] = [];
  const add = (criterion: CompatibilityCriterion) => criteria.push(criterion);
  const missing = 'Non renseigné';

  const specialties = values([profile?.specialty, profile?.verifiedSpecialty]);
  const expectedSpecialty = mission?.specialty?.trim() || '';
  const specialtyKnown = Boolean(expectedSpecialty && specialties.length);
  const sameSpecialty = specialtyKnown && contains(specialties, expectedSpecialty);
  add({
    id: 'specialty', label: 'Spécialité', status: !specialtyKnown ? 'unknown' : sameSpecialty ? 'match' : 'mismatch',
    missionValue: expectedSpecialty || missing, profileValue: specialties.join(' · ') || missing,
    detail: !specialtyKnown ? 'La spécialité doit être renseignée des deux côtés.' : sameSpecialty ? 'La spécialité du profil correspond à celle de la mission.' : 'Les spécialités renseignées diffèrent ; échangez sur le besoin.',
  });

  const expectedLevels = values(mission?.requiredLevels?.length ? mission.requiredLevels : [mission?.requiredLevel]);
  const rawLevel = profile?.medicalStatus;
  const candidateLevel = rawLevel === 'REGULAR_LOCUM' ? 'DOCTOR' : rawLevel;
  const levelKnown = Boolean(candidateLevel && candidateLevel !== 'OTHER' && expectedLevels.length && expectedLevels.every(level => level !== 'OTHER' && level in compatibleLevels));
  const sameLevel = levelKnown && expectedLevels.some(level => compatibleLevels[level as RequiredLevel].includes(candidateLevel as RequiredLevel));
  add({
    id: 'level', label: 'Niveau professionnel', status: !levelKnown ? 'unknown' : sameLevel ? 'match' : 'mismatch',
    missionValue: expectedLevels.map(level => levelLabels[level] || level).join(' ou ') || missing,
    profileValue: (rawLevel && levelLabels[rawLevel]) || missing,
    detail: !levelKnown ? 'Le niveau professionnel reste à préciser.' : sameLevel ? 'Le statut déclaré correspond au niveau demandé. Les justificatifs restent à vérifier.' : 'Le statut déclaré ne correspond pas au niveau demandé.',
  });

  const expectedCity = mission?.city?.trim() || '';
  const preferredCities = values(profile?.preferredCities);
  const profileCity = profile?.city?.trim() || '';
  const sameCity = Boolean(expectedCity && (contains(preferredCities, expectedCity) || (profileCity && normalize(profileCity) === normalize(expectedCity))));
  const otherLocalCity = Boolean(expectedCity && profileCity && !sameCity && profile?.mobilityRangeType === 'LOCAL_ONLY');
  add({
    id: 'location', label: 'Lieu de mission', status: sameCity ? 'match' : otherLocalCity ? 'mismatch' : 'unknown',
    missionValue: expectedCity || missing,
    profileValue: [profileCity, preferredCities.length ? `Villes souhaitées : ${preferredCities.join(', ')}` : ''].filter(Boolean).join(' · ') || missing,
    detail: sameCity ? 'La mission est dans la ville du profil ou dans ses villes souhaitées.' : otherLocalCity ? 'Le profil indique une mobilité locale dans une autre ville.' : 'Le trajet et la mobilité vers cette ville restent à confirmer ensemble.',
  });

  const expectedType = mission?.missionType ? missionType(mission.missionType) : '';
  const acceptedTypes = values(profile?.acceptedMissionTypes).map(missionType);
  const typeKnown = Boolean(expectedType && acceptedTypes.length);
  const sameType = typeKnown && acceptedTypes.includes(expectedType);
  add({
    id: 'missionType', label: 'Type de mission', status: !typeKnown ? 'unknown' : sameType ? 'match' : 'mismatch',
    missionValue: missionTypeLabels[expectedType] || expectedType || missing,
    profileValue: values(acceptedTypes.map(type => missionTypeLabels[type] || type)).join(' · ') || missing,
    detail: !typeKnown ? 'Les préférences de mission restent à renseigner.' : sameType ? 'Ce type de mission figure dans les préférences du profil.' : 'Ce type de mission ne figure pas dans les préférences renseignées.',
  });

  const expectedSoftware = values([mission?.softwareUsed, ...(mission?.knownSoftware || [])]);
  const knownSoftware = values(profile?.knownSoftware);
  const softwareKnown = Boolean(expectedSoftware.length && knownSoftware.length);
  const sharedSoftware = expectedSoftware.filter(software => contains(knownSoftware, software));
  const allSoftware = softwareKnown && sharedSoftware.length === expectedSoftware.length;
  add({
    id: 'software', label: 'Logiciels', status: !softwareKnown || (sharedSoftware.length > 0 && !allSoftware) ? 'unknown' : allSoftware ? 'match' : 'mismatch',
    missionValue: expectedSoftware.join(' · ') || missing, profileValue: knownSoftware.join(' · ') || missing,
    detail: !softwareKnown ? 'Les logiciels utilisés et connus restent à préciser.' : allSoftware ? 'Les logiciels de la mission sont mentionnés dans le profil.' : sharedSoftware.length ? `${sharedSoftware.join(', ')} en commun ; les autres logiciels restent à confirmer.` : 'Les logiciels de la mission ne figurent pas parmi ceux renseignés dans le profil.',
  });

  const expectedPatients = values([mission?.patientType, ...(mission?.acceptedPatientTypes || [])]);
  const acceptedPatients = values(profile?.acceptedPatientTypes);
  const refusedPatients = values(profile?.refusedPatientTypes);
  const refusedMatch = expectedPatients.some(patient => contains(refusedPatients, patient));
  const patientsKnown = Boolean(expectedPatients.length && acceptedPatients.length);
  // “Tout public” covers specific groups. Specific groups do not prove that
  // every group in a “Tout public” mission is accepted.
  const allPatients = patientsKnown && (contains(acceptedPatients, 'Tout public') || expectedPatients.every(patient => contains(acceptedPatients, patient)));
  const patientsStatus: CompatibilityStatus = refusedMatch ? 'mismatch' : !patientsKnown ? 'unknown' : allPatients && !refusedPatients.length ? 'match' : 'unknown';
  add({
    id: 'patients', label: 'Patientèle', status: patientsStatus,
    missionValue: expectedPatients.join(' · ') || missing,
    profileValue: [acceptedPatients.join(' · '), refusedPatients.length ? `Non souhaitée : ${refusedPatients.join(', ')}` : ''].filter(Boolean).join(' — ') || missing,
    detail: refusedMatch ? 'Une patientèle de la mission figure parmi celles que le profil ne souhaite pas prendre en charge.' : patientsStatus === 'match' ? 'La patientèle indiquée correspond aux préférences du profil.' : 'La prise en charge de toute la patientèle reste à confirmer ensemble.',
  });

  const rate = mission?.retrocessionPercentage;
  const minimum = profile?.minimumCompensation;
  const retrocessionKnown = mission?.compensationMode === 'RETROCESSION' && percentage(rate) && percentage(minimum);
  const rateMatches = retrocessionKnown && rate >= minimum;
  add({
    id: 'retrocession', label: 'Rétrocession', status: !retrocessionKnown ? 'unknown' : rateMatches ? 'match' : 'mismatch',
    missionValue: mission?.compensationMode === 'FIXED_AMOUNT' ? 'Rémunération forfaitaire' : percentage(rate) ? `${rate} % proposés` : missing,
    profileValue: percentage(minimum) ? `${minimum} % minimum souhaité` : missing,
    detail: !retrocessionKnown ? 'Le pourcentage proposé et le minimum souhaité doivent être comparables et renseignés.' : rateMatches ? 'Le pourcentage proposé atteint le minimum souhaité.' : 'Le pourcentage proposé est inférieur au minimum souhaité ; les conditions sont à discuter.',
  });

  const dates = values([dateLabel(mission?.startDate), dateLabel(mission?.endDate)]);
  add({
    id: 'availability', label: 'Disponibilités', status: 'unknown',
    missionValue: dates.join(' → ') || missing, profileValue: profile?.availabilityNotes?.trim() || 'À confirmer ensemble',
    detail: 'Les préférences du profil ne confirment pas la disponibilité sur ces dates. Validez les jours et horaires dans votre échange.',
  });

  const matchedCount = criteria.filter(criterion => criterion.status === 'match').length;
  const mismatchCount = criteria.filter(criterion => criterion.status === 'mismatch').length;
  const comparedCount = matchedCount + mismatchCount;
  const unknownCount = criteria.length - comparedCount;
  return {
    criteria, matchedCount, comparedCount, mismatchCount, unknownCount, totalCount: criteria.length,
    summary: comparedCount ? `${matchedCount} critère${matchedCount === 1 ? '' : 's'} concordant${matchedCount === 1 ? '' : 's'}` : 'Compatibilité à préciser',
    coverageLabel: `${comparedCount} critère${comparedCount === 1 ? '' : 's'} comparé${comparedCount === 1 ? '' : 's'} sur ${criteria.length}`,
  };
}
