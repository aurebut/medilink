export type UserRole =
  | 'CANDIDATE'
  | 'ESTABLISHMENT_OWNER'
  | 'ESTABLISHMENT_ADMIN'
  | 'ESTABLISHMENT_RECRUITER'
  | 'ESTABLISHMENT_VIEWER'
  | 'MEDILINK_ADMIN'
  | 'MEDILINK_SUPPORT';

export type UserStatus = 'PENDING_EMAIL_VERIFICATION' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type MedicalStatus = 'STUDENT' | 'INTERN' | 'JUNIOR_DOCTOR' | 'DOCTOR' | 'REGULAR_LOCUM' | 'NURSE' | 'OPERATING_ROOM_ASSISTANT' | 'OTHER';
export type DocumentType = 'CV' | 'ATTESTATION' | 'CONVENTION' | 'DIPLOMA' | 'IDENTITY_DOCUMENT' | 'INSURANCE' | 'AVATAR' | 'MESSAGE_ATTACHMENT' | 'OTHER';
export type DocumentVerificationStatus = 'UPLOAD_PENDING' | 'PENDING_VERIFICATION' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'DELETED';
export type EstablishmentType = 'HOSPITAL' | 'CLINIC' | 'CABINET' | 'MEDICAL_SERVICE' | 'AGENCY' | 'OTHER';
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'SUSPENDED';
export type EstablishmentMemberRole = 'OWNER' | 'ADMIN' | 'RECRUITER' | 'VIEWER';
export type MissionType = 'GARDE' | 'REMPLACEMENT' | 'VACATION' | 'STAGE' | 'AIDE_OP';
export type RequiredLevel = 'STUDENT' | 'INTERN' | 'JUNIOR_DOCTOR' | 'DOCTOR' | 'NURSE' | 'OPERATING_ROOM_ASSISTANT' | 'OTHER';
export type MissionStatus = 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'FILLED' | 'ARCHIVED';
export type CompensationMode = 'FIXED_AMOUNT' | 'RETROCESSION';
export type ApplicationStatus = 'SUBMITTED' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN' | 'CANCELLED';
export type MessageType = 'TEXT' | 'FILE' | 'SYSTEM';

export type CurrentUser = {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phone?: string | null;
  createdAt?: string;
};

export type Profile = {
  id: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  avatarUrl?: string | null;
  city?: string | null;
  country?: string | null;
  medicalStatus?: MedicalStatus | null;
  medicalStatusOther?: string | null;
  specialty?: string | null;
  orientation?: string | null;
  hospitalOrFaculty?: string | null;
  bio?: string | null;
  experienceYears?: number | null;
  actsPerformed: string[];
  availabilityNotes?: string | null;
  preferredCities: string[];
  maxTravelRadiusKm?: number | null;
  mobilityOptions: string[];
  acceptedMissionTypes: string[];
  minimumCompensation?: number | null;
  preferredDurations: string[];
  refusedSchedules: string[];
  knownSoftware: string[];
  acceptedPatientTypes: string[];
  secretaryRequired?: boolean | null;
  accommodationRequired?: boolean | null;
  fastPaymentImportant?: boolean | null;
  acceptedPressureLevel?: string | null;
  completionScore: number;
  visibilityStatus: string;
  createdAt: string;
  updatedAt: string;
  userSkills?: Array<{ id: string; level?: string | null; verified: boolean; skill: { id: string; name: string; category?: string | null } }>;
};

export type Document = {
  id: string;
  userId: string;
  documentType: DocumentType;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  verificationStatus: DocumentVerificationStatus;
  verifiedById?: string | null;
  verifiedAt?: string | null;
  rejectionReason?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; email: string; profile?: Profile | null };
};

export type EstablishmentPhoto = {
  id: string;
  establishmentId: string;
  fileName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  orderIndex: number;
  isPrimary: boolean;
  uploadedAt?: string | null;
  url?: string;
  createdAt: string;
  updatedAt: string;
};

export type Establishment = {
  id: string;
  name: string;
  type: EstablishmentType;
  address?: string | null;
  city?: string | null;
  country: string;
  sector?: string | null;
  patientType?: string | null;
  softwareUsed?: string | null;
  hasSecretary?: boolean | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  verificationStatus: VerificationStatus;
  createdAt: string;
  updatedAt: string;
  photos?: EstablishmentPhoto[];
  members?: Array<{ id: string; establishmentId: string; userId: string; role: EstablishmentMemberRole; user?: CurrentUser }>;
};

export type MissionTag = { id: string; missionId: string; tag: string };

export type Mission = {
  id: string;
  establishmentId: string;
  createdById: string;
  title: string;
  description?: string | null;
  missionType: MissionType;
  specialty: string;
  requiredLevel: RequiredLevel;
  requiredLevels?: RequiredLevel[];
  location?: string | null;
  city: string;
  sector?: string | null;
  patientType?: string | null;
  softwareUsed?: string | null;
  hasSecretary?: boolean | null;
  departmentInfo?: string | null;
  teamInfo?: string | null;
  equipmentInfo?: string | null;
  practicalInfo?: string | null;
  accommodationProvided?: boolean | null;
  parkingAvailable?: boolean | null;
  startDate: string;
  endDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  durationHours?: number | null;
  compensationMode: CompensationMode;
  retrocessionPercentage?: number | null;
  compensationAmount?: number | null;
  compensationCurrency: string;
  status: MissionStatus;
  publishedAt?: string | null;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: MissionTag[];
  establishment?: Establishment;
};

export type Application = {
  id: string;
  missionId: string;
  candidateUserId: string;
  status: ApplicationStatus;
  coverMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  mission?: Mission;
  candidate?: CurrentUser & { profile?: Profile | null };
  conversation?: Conversation | null;
};

export type Conversation = {
  id: string;
  missionId: string;
  applicationId: string;
  candidateUserId: string;
  establishmentId: string;
  lastMessageAt?: string | null;
  createdAt: string;
  updatedAt: string;
  mission?: Mission;
  application?: Application;
  establishment?: Establishment;
  participants?: Array<{ id: string; conversationId: string; userId: string; lastReadAt?: string | null; archivedAt?: string | null; muted: boolean }>;
  messages?: Message[];
};

export type Message = {
  id: string;
  conversationId: string;
  senderUserId: string;
  clientRequestId?: string | null;
  body: string;
  messageType: MessageType;
  readAt?: string | null;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  sender?: CurrentUser & { profile?: Profile | null };
};

export type Notification = {
  id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  data?: Record<string, unknown> | null;
  readAt?: string | null;
  createdAt: string;
};

export type Paginated<T> = { items: T[]; total: number };


export type CandidateProfileForApplication = {
  application: Application;
  mission: Mission;
  conversation?: Conversation | null;
  candidate: CurrentUser & {
    phone?: string | null;
    phoneVerified?: boolean;
    profile?: Profile | null;
    documents?: Document[];
  };
};
