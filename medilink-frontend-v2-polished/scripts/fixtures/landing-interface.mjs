// Fictional, deterministic data used only by the screenshot browser.
// These responses never reach or modify the application backend.
export const capturedAt = '2026-09-16T10:00:00.000Z';
const createdAt = '2026-09-10T08:30:00.000Z';
export const profile = {
  id: 'preview-profile', userId: 'preview-candidate', firstName: 'Sarah', lastName: 'Bernard',
  candidateGender: 'FEMALE', city: 'Paris', country: 'France', medicalStatus: 'DOCTOR',
  specialty: 'Médecine générale', completionScore: 100, experienceYears: 6,
  bio: 'Médecin généraliste remplaçante.', healthVerificationStatus: 'VERIFIED',
  actsPerformed: [], preferredCities: ['Paris'], mobilityOptions: [], acceptedWeekdays: [],
  acceptedTimeSlots: [], acceptedPracticeSettings: [], acceptedMissionTypes: [],
  preferredDurations: [], refusedSchedules: [], knownSoftware: [], acceptedPatientTypes: [], languages: [],
};
export const establishment = {
  id: 'preview-establishment', name: 'Cabinet des Tilleuls', type: 'CABINET',
  verificationStatus: 'VERIFIED', photos: [],
};
export const mission = {
  id: 'preview-mission', title: 'Remplacement en médecine générale',
  description: 'Un cabinet de quartier et une équipe disponible pour vous accueillir.',
  practicalInfo: 'Le secrétariat vous accueille à 8 h 15. Consultations de 8 h 30 à 18 h 30.',
  startDate: '2026-09-14T06:30:00.000Z', endDate: '2026-09-18T16:30:00.000Z',
  startTime: '08:30', endTime: '18:30', missionType: 'REMPLACEMENT',
  requiredLevel: 'DOCTOR', requiredLevels: ['DOCTOR'], status: 'PUBLISHED',
  compensationMode: 'RETROCESSION', retrocessionPercentage: 70, compensationAmount: 0,
  establishmentId: establishment.id, establishment, tags: [], softwareUsed: 'Doctolib',
  hasSecretary: true, secretaryType: 'ON_SITE', parkingAvailable: true,
  averagePatientsPerDay: 25, createdAt, updatedAt: createdAt,
};
export const application = {
  id: 'preview-application', missionId: mission.id, candidateUserId: profile.userId,
  status: 'ACCEPTED', mission, createdAt, updatedAt: createdAt,
  candidate: { id: profile.userId, profile },
};
export const agreement = {
  id: 'preview-agreement', applicationId: application.id, conversationId: 'c1',
  missionId: mission.id, candidateUserId: profile.userId, establishmentId: establishment.id,
  status: 'FUNDS_SECURED', compensationMode: 'RETROCESSION', retrocessionPercentage: 70,
  amount: 0, currency: 'EUR', platformFee: 0, candidateAmount: 0,
  startDate: mission.startDate, endDate: mission.endDate, startTime: '08:30', endTime: '18:30',
  terms: 'Secrétariat présent chaque jour. Rétrocession de 70 %.',
  acceptedAt: createdAt, createdAt, updatedAt: createdAt,
};
const textMessage = (id, senderUserId, body, time) => ({
  id, conversationId: 'c1', senderUserId, body, messageType: 'TEXT',
  createdAt: `2026-09-16T${time}:00.000Z`, updatedAt: createdAt,
});
const workflowMessage = (id, kind, proposal) => ({
  id, conversationId: 'c1', senderUserId: 'preview-recruiter', messageType: 'SYSTEM',
  body: `__MEDILINK_WORKFLOW__${JSON.stringify({ kind, ...(proposal ? { proposal } : {}) })}`,
  createdAt, updatedAt: createdAt,
});
export const messages = [
  workflowMessage('preview-proposal', 'FINAL_PROPOSAL', {
    compensationMode: 'RETROCESSION', retrocessionPercentage: 70, currency: 'EUR',
    startDate: '2026-09-14', endDate: '2026-09-18', startTime: '08:30', endTime: '18:30',
    notes: 'Secrétariat présent chaque jour.',
  }),
  workflowMessage('preview-confirmed', 'FUNDS_SECURED'),
  textMessage('preview-message-1', 'preview-recruiter', 'Bonjour Sarah, le secrétariat est présent chaque jour de 8 h 30 à 17 h 30.', '06:05'),
  textMessage('preview-message-2', profile.userId, 'Bonjour ! Bien arrivée au cabinet. J’ai retrouvé les horaires et les consignes, merci.', '06:15'),
  textMessage('preview-message-3', 'preview-recruiter', 'Parfait, nous pouvons faire un point après les consultations. Bonne journée !', '06:20'),
];
export const documents = [
  ['CV', 'CV_Sarah_Bernard.pdf'], ['DIPLOMA', 'Diplome_medecine.pdf'],
  ['IDENTITY_DOCUMENT', 'Piece_identite.pdf'], ['INSURANCE', 'Attestation_RCP_2026.pdf'],
  ['ATTESTATION', 'Attestation_Ordre.pdf'], ['CONVENTION', 'Convention_remplacement.pdf'],
].map(([documentType, fileName], index) => ({
  id: `preview-document-${index}`, userId: profile.userId, documentType, fileName,
  storageKey: `fictional/${fileName}`, mimeType: 'application/pdf', sizeBytes: 85000,
  verificationStatus: 'APPROVED', createdAt, updatedAt: createdAt, verifiedAt: createdAt,
}));
export const conversation = {
  id: 'c1', missionId: mission.id, applicationId: application.id, candidateUserId: profile.userId,
  establishmentId: establishment.id, establishment, mission: { ...mission, city: 'Paris' }, application,
  agreements: [agreement], messages: [messages.at(-1)], participants: [],
  createdAt, updatedAt: createdAt, lastMessageAt: messages.at(-1).createdAt,
};
// Documents belonging to this replacement, separate from the private profile.
// The contract is prepared, not signed or approved by the Ordre.
export const replacementDossier = {
  id: 'preview-dossier', applicationId: application.id, revision: 1,
  canEdit: true, canSend: true, missingFields: [],
  details: {
    practiceFramework: 'INDIVIDUAL_LIBERAL', replacementKind: 'DOCTOR',
    holderName: 'Thomas Martin', holderRpps: '10101234567', holderOrderNumber: '75/12345',
    holderAddress: '12 rue des Tilleuls, 75011 Paris', holderEmail: 'thomas.martin@example.test',
    replacementName: 'Sarah Bernard', replacementRpps: '10107654321', replacementOrderNumber: '75/54321',
    replacementAddress: '8 rue des Lilas, 75012 Paris', replacementEmail: 'sarah.bernard@example.test',
    licenseNumber: '', licenseValidUntil: '', specialty: 'Médecine générale',
    practiceAddress: '12 rue des Tilleuls, 75011 Paris', startDate: '2026-09-14', endDate: '2026-09-18',
    scheduleDetails: 'Du lundi au vendredi, de 8 h 30 à 18 h 30.', retrocessionPercent: 70,
    paymentTerms: 'Règlement par virement dans les 7 jours suivant la fin du remplacement.',
    orderCouncilName: 'Conseil départemental de Paris', orderEmail: 'conseil-demo@example.test',
  },
  documents: [
    ['CONTRACT', 'Contrat_remplacement_Bernard_Martin.pdf', 'GENERATED'],
    ['DECLARATION', 'Declaration_remplacement_Ordre.pdf', 'GENERATED'],
    ['REGISTRATION', 'Attestation_inscription_Ordre.pdf', 'UPLOADED'],
    ['INSURANCE', 'Attestation_RCP_2026.pdf', 'UPLOADED'],
  ].map(([kind, fileName, source], index) => ({
    id: `preview-dossier-document-${index}`, kind, fileName, source,
    mimeType: 'application/pdf', sizeBytes: 85000, status: 'READY', version: 1, revision: 1,
    createdAt, expiresAt: kind === 'INSURANCE' ? '2026-12-31T00:00:00.000Z' : null,
    templateVersion: source === 'GENERATED' ? '2026-09-19' : null,
  })),
  deliveries: [],
};
export function fixtureResponse(path, method = 'GET') {
  if (path === '/conversations/events') return { eventStream: true };
  if (method === 'POST' && path === '/conversations/c1/read') return { data: {} };
  if (method !== 'GET') return null;
  const data = {
    '/auth/me': { id: profile.userId, email: 'sarah.bernard@example.test', role: 'CANDIDATE', status: 'ACTIVE', emailVerified: true },
    '/me/profile': profile, '/me/documents': documents, '/me/applications': [application],
    '/notifications': [], '/conversations': [conversation], '/conversations/c1/messages': messages,
    '/me/dashboard': { profile, documents, applications: [application], conversations: [conversation], notifications: [] },
    '/missions': { items: [mission], total: 1, limit: 50, offset: 0 },
    '/applications/preview-application/dossier': replacementDossier,
  }[path];
  return data === undefined ? null : { data };
}
