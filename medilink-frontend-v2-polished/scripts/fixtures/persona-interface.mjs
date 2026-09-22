// Fictional API responses for native persona-landing screenshots only.
// They are served by serve-persona-fixtures.mjs; no production account is used.
import {
  profile as originalProfile, establishment as originalEstablishment,
  mission as originalMission, application as originalApplication,
  conversation as originalConversation, messages, documents,
  replacementDossier, missionTrackingDossier, fixtureResponse,
} from './landing-interface.mjs';

export const capturedAt = '2026-09-22T10:00:00.000Z';
export const profile = {
  ...originalProfile,
  candidateGender: 'FEMININE',
  bio: 'Médecin généraliste depuis six ans, je privilégie les cabinets de quartier et le suivi de toute la famille. Habituée à Doctolib, je prends facilement le relais de votre organisation.',
  acceptedMissionTypes: ['REMPLACEMENT'], knownSoftware: ['Doctolib'],
  acceptedPatientTypes: ['Tout public'], refusedPatientTypes: [],
  acceptedActs: ['CONSULTATIONS', 'ECG', 'PEDIATRICS'], refusedActs: [], languages: ['Français'],
  actsPerformed: ['Consultations', 'ECG / vaccination'],
  acceptedPracticeSettings: ['CABINET', 'GROUP_PRACTICE'],
  acceptedWeekdays: ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'],
  acceptedTimeSlots: ['DAY'], preferredDurations: ['1 semaine', 'Longue mission'],
  availabilityNotes: 'Remplacements en semaine à Paris ; dates à confirmer ensemble.',
  maxPatientsPerDay: 30, secretaryRequired: true, accommodationRequired: false,
  minimumCompensation: 70, visibilityStatus: 'VISIBLE',
};
export const establishment = {
  ...originalEstablishment,
  ownerUserId: 'preview-recruiter', address: '12 rue des Tilleuls',
  description: 'Un cabinet de quartier lumineux, avec deux médecins généralistes et un secrétariat sur place.',
  sector: 'SECTEUR_1', softwareUsed: 'Doctolib', patientType: 'Tout public',
};
export const mission = {
  ...originalMission, establishment, city: 'Paris', specialty: 'Médecine générale',
  location: '12 rue des Tilleuls, 75011 Paris', sector: 'SECTEUR_1',
  patientType: 'Tout public', durationHours: 50,
  practiceSetting: 'GROUP_PRACTICE', requiredActs: ['CONSULTATIONS'],
  equipmentAvailable: ['ECG'], accommodationProvided: false,
  teamInfo: 'Deux médecins généralistes et une secrétaire',
};
export const offer = {
  ...mission, id: 'preview-offer', title: 'Une semaine au Cabinet des Tilleuls',
  description: 'Consultations de médecine générale dans un cabinet lumineux. Secrétariat sur place et planning préparé avec le titulaire.',
  startDate: '2026-10-12T06:30:00.000Z', endDate: '2026-10-16T16:30:00.000Z',
};
export const secondOffer = {
  ...offer, id: 'preview-offer-2', title: 'Remplacement régulier le vendredi',
  description: 'Retrouvez la même équipe chaque vendredi, avec une patientèle familiale et un secrétariat disponible.',
  startDate: '2026-10-23T07:00:00.000Z', endDate: '2026-12-18T17:00:00.000Z',
  startTime: '09:00', endTime: '18:00', durationHours: 9, retrocessionPercentage: 75,
};
const candidate = {
  id: profile.userId, email: 'sarah.bernard@example.test',
  role: 'CANDIDATE', status: 'ACTIVE', emailVerified: true, profile, documents,
};
export const application = {
  ...originalApplication, mission, candidate, conversation: { id: 'c1' },
};
export const conversation = {
  ...originalConversation, mission, establishment, application,
};
// Three received applications are an illustrative sample, never a network total.
// Missing portraits intentionally use the actual product's initials fallback.
export const candidateApplications = [
  {
    firstName: 'Sarah', lastName: 'Bernard', gender: 'FEMININE',
    avatarUrl: profile.avatarUrl, status: 'VIEWED', years: 6,
    details: { city: 'Paris', preferredCities: ['Paris'], knownSoftware: ['Doctolib', 'Weda'] },
  },
  {
    firstName: 'Olivier', lastName: 'Morel', gender: 'MASCULINE',
    avatarUrl: null, status: 'SUBMITTED', years: 8,
    details: {
      city: 'Boulogne-Billancourt', preferredCities: ['Paris', 'Boulogne-Billancourt'],
      knownSoftware: ['Weda', 'Doctolib'], minimumCompensation: 75,
      bio: 'Huit ans de médecine générale, en cabinet individuel et en maison de santé. Je recherche une équipe disponible et un rythme de consultations régulier.',
      availabilityNotes: 'Paris et proche couronne. Rétrocession souhaitée de 75 %, à échanger selon les conditions du cabinet.',
      acceptedActs: ['CONSULTATIONS', 'ECG', 'WOUND_CARE'],
      actsPerformed: ['Consultations', 'ECG / vaccination', 'Gestion plaies'],
    },
  },
  {
    firstName: 'Camille', lastName: 'Laurent', gender: 'FEMININE',
    avatarUrl: null, status: 'SUBMITTED', years: 2,
    details: {
      city: 'Paris', preferredCities: ['Paris'], medicalStatus: 'JUNIOR_DOCTOR',
      knownSoftware: [], acceptedPatientTypes: ['Adultes'],
      bio: 'Docteure junior en médecine générale, intéressée par la pratique de ville et les consultations de prévention. J’apprécie un temps de transmission avant le remplacement.',
      availabilityNotes: 'Conditions d’exercice et prise en main du logiciel à préciser ensemble.',
      acceptedActs: ['CONSULTATIONS'], actsPerformed: ['Consultations'],
      preferredDurations: ['1 semaine'],
    },
  },
].map((person, index) => {
  const userId = `preview-applicant-${index}`;
  const candidateProfile = {
    ...profile, id: `preview-applicant-profile-${index}`, userId,
    firstName: person.firstName, lastName: person.lastName,
    candidateGender: person.gender, avatarUrl: person.avatarUrl, experienceYears: person.years,
    ...person.details,
  };
  return {
    ...originalApplication, id: `preview-received-application-${index}`,
    missionId: offer.id, mission: offer, candidateUserId: userId, status: person.status,
    candidate: {
      ...candidate, id: userId, profile: candidateProfile, documents: [],
      email: `${person.firstName.toLowerCase()}.${person.lastName.toLowerCase()}@example.test`,
    },
    conversation: null,
    createdAt: `2026-09-${22 - index}T08:30:00.000Z`, updatedAt: capturedAt,
  };
});

const accounting = { settings: { budgetLimit: 15000 }, entries: [], classifiedIds: [] };
export const reportDossier = {
  ...replacementDossier,
  documents: [
    ...replacementDossier.documents,
    ...['Compte rendu du remplacement.pdf', 'Point de mission du 16 septembre.pdf', 'Point de mission du 15 septembre.pdf'].map((fileName, index) => ({
      id: `preview-report-${index}`, kind: 'OTHER', fileName, source: 'UPLOADED',
      mimeType: 'application/pdf', sizeBytes: 85000, status: 'READY', version: 1, revision: 1,
      createdAt: '2026-09-18T17:00:00.000Z',
    })),
  ],
  deliveries: [{
    id: 'preview-report-delivery', recipientType: 'COUNTERPART', recipientName: 'Thomas Martin',
    recipientEmail: 'thomas.martin@example.test', status: 'SENT', documentIds: ['preview-report-0'],
    createdAt: '2026-09-18T17:05:00.000Z', sentAt: '2026-09-18T17:05:02.000Z',
  }],
};
const routes = {
  '/me/profile': profile,
  '/me/applications': [application],
  '/me/dashboard': { profile, documents, applications: [application], conversations: [conversation], notifications: [] },
  '/missions': { items: [offer, secondOffer], total: 2, limit: 12, offset: 0 },
  '/missions/preview-offer': offer,
  '/missions/preview-offer-2': secondOffer,
  '/missions/preview-mission': mission,
  '/conversations': [conversation],
  '/conversations/c1': { ...conversation, messages },
  '/conversations/c1/messages': messages,
  '/establishments/me': [establishment],
  '/establishment/dashboard': { establishment, applications: [application], missions: [mission, offer], conversations: [conversation] },
  '/establishment/applications': [application],
  '/missions/mine': [mission, offer],
  '/establishment/applications/preview-application/candidate-profile': { application, mission, conversation, candidate },
  '/workspace-notes': [{
    key: 'mission:preview-mission',
    content: 'Point du 16 septembre : prise en main du logiciel effectuée. Le secrétariat reste disponible pour organiser les rendez-vous.',
    updatedAt: capturedAt, updatedById: 'preview-recruiter',
  }],
  '/billing/accounting/establishments/preview-establishment': accounting,
  '/billing/establishments/preview-establishment/status': {
    establishmentId: establishment.id, hasActiveSubscription: false, canCreateMission: true,
    availableCredits: 1, reservedCredits: 0, consumedCredits: 1, stripeConfigured: false,
    subscription: null, purchases: [],
    prices: { monthlySubscription: { amount: 9900, currency: 'EUR' }, publicationCredit: { amount: 3999, currency: 'EUR' } },
  },
};

export function personaFixtureResponse(path, method = 'GET', role = 'candidate', scenario = '') {
  const endpoint = new URL(path, 'http://fixture.local').pathname;
  if (endpoint === '/auth/me' && method === 'GET') return {
    data: role === 'recruiter'
      ? { id: 'preview-recruiter', email: 'thomas.martin@example.test', role: 'ESTABLISHMENT_OWNER', status: 'ACTIVE', emailVerified: true }
      : { id: candidate.id, email: candidate.email, role: candidate.role, status: candidate.status, emailVerified: true },
  };
  // The real billing screen autosaves its budget setting. Accept it only here.
  if (method === 'PATCH' && endpoint === '/billing/accounting/establishments/preview-establishment/settings') return { data: accounting };
  if (method === 'GET' && endpoint === '/applications/preview-application/dossier') {
    return { data: scenario === 'report' ? reportDossier : scenario === 'mission' ? missionTrackingDossier : replacementDossier };
  }
  if (method === 'GET' && scenario === 'candidates') {
    if (endpoint === '/establishment/applications') return { data: candidateApplications };
    if (endpoint === '/establishment/dashboard') return { data: {
      establishment, applications: candidateApplications, missions: [offer], conversations: [],
    } };
    if (endpoint === '/missions/mine') return { data: [offer] };
    if (endpoint === '/conversations') return { data: [] };
    const receivedApplication = candidateApplications.find(item => endpoint === `/establishment/applications/${item.id}/candidate-profile`);
    if (receivedApplication) return { data: {
      application: receivedApplication, mission: offer, conversation: null,
      candidate: receivedApplication.candidate,
    } };
  }
  if (method === 'GET' && Object.hasOwn(routes, endpoint)) return { data: routes[endpoint] };
  return fixtureResponse(endpoint, method, scenario);
}
