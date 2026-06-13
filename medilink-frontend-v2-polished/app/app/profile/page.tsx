'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, isMockStorageUrl } from '@/lib/api';
import type { CandidateGender, HealthVerificationStatus, MedicalStatus, Profile } from '@/lib/types';
import { gendered } from '@/lib/grammar';
import { medicalStatusLabel } from '@/lib/labels';
import { Alert, Badge, Button, Card, Field, Input, LoadingCard, PageHeader, ProgressBar, Select, Textarea } from '@/components/ui';
import { DocumentSection } from '@/components/DocumentSection';
import { MultiChoiceField, MultiChoiceTextField, SingleChoiceField } from '@/components/FormChoiceFields';
import {
  acceptedMissionTypeOptions,
  actsPerformedOptions,
  candidateMedicalStatusOptions,
  cityOptions,
  countryOptions,
  durationOptions,
  hospitalOrFacultyOptions,
  missionActOptions,
  mobilityOptions,
  mobilityRangeOptions,
  noticeOptions,
  patientTypeOptions,
  pressureLevelOptions,
  practiceSettingOptions,
  refusedScheduleOptions,
  softwareOptions,
  specialtyOptions,
  timeSlotOptions,
  universityDiplomaOptions,
  weekdayOptions,
} from '@/lib/profile-options';
import { useAutoRefresh } from '@/lib/use-auto-refresh';

type UploadResponse = {
  documentId: string;
  storageKey: string;
  provider: 'mock' | 'local' | 's3';
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresInSeconds: number;
};

type ProfileTab = 'identity' | 'professional' | 'missions' | 'documents';

const profileTabs: Array<{ id: ProfileTab; label: string }> = [
  { id: 'identity', label: 'Identité' },
  { id: 'professional', label: 'Professionnel' },
  { id: 'missions', label: 'Missions' },
  { id: 'documents', label: 'Documents' },
];

export default function ProfilePage() {
  const cachedProfile = api.getSync<Profile>('/me/profile');
  const [profile, setProfile] = useState<Profile | null>(cachedProfile || null);
  const [form, setForm] = useState<any>(cachedProfile ? { ...cachedProfile, actsPerformedText: (cachedProfile.actsPerformed || []).join(', ') } : {});
  const [activeTab, setActiveTab] = useState<ProfileTab>('identity');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [loading, setLoading] = useState(!cachedProfile);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [verifyingHealth, setVerifyingHealth] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function applyProfile(p: Profile) {
    setProfile(p);
    setForm({ ...p, actsPerformedText: (p.actsPerformed || []).join(', ') });
    setFormDirty(false);
  }

  async function loadProfile(options: { reload?: boolean } = {}) {
    const p = options.reload
      ? await api.reload<Profile>('/me/profile')
      : await api.get<Profile>('/me/profile');
    applyProfile(p);
  }

  useEffect(() => {
    loadProfile().finally(() => setLoading(false));
  }, []);

  useAutoRefresh(() => loadProfile({ reload: true }), { enabled: !loading && !formDirty && !saving && !uploadingAvatar && !verifyingHealth });

  if (loading || !profile) return <LoadingCard />;

  function set(name: string, value: unknown) {
    setFormDirty(true);
    setForm((prev: any) => ({ ...prev, [name]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      candidateGender: form.candidateGender || undefined,
      city: form.city || undefined,
      country: form.country || undefined,
      medicalStatus: form.medicalStatus || undefined,
      medicalStatusOther: form.medicalStatus === 'OTHER' ? form.medicalStatusOther || undefined : undefined,
      specialty: form.specialty || undefined,
      orientation: form.orientation || undefined,
      hospitalOrFaculty: form.hospitalOrFaculty || undefined,
      bio: form.bio || undefined,
      experienceYears: form.experienceYears === '' || form.experienceYears == null ? undefined : Number(form.experienceYears),
      actsPerformed: cleanArray(form.actsPerformed),
      availabilityNotes: form.availabilityNotes || undefined,
      preferredCities: cleanArray(form.preferredCities),
      maxTravelRadiusKm: form.maxTravelRadiusKm === '' || form.maxTravelRadiusKm == null ? undefined : Number(form.maxTravelRadiusKm),
      mobilityOptions: cleanArray(form.mobilityOptions),
      acceptedWeekdays: cleanArray(form.acceptedWeekdays),
      acceptedTimeSlots: cleanArray(form.acceptedTimeSlots),
      minimumNoticeHours: form.minimumNoticeHours === '' || form.minimumNoticeHours == null ? undefined : Number(form.minimumNoticeHours),
      mobilityRangeType: form.mobilityRangeType || undefined,
      housingRequiredBeyondKm: form.housingRequiredBeyondKm === '' || form.housingRequiredBeyondKm == null ? undefined : Number(form.housingRequiredBeyondKm),
      acceptedPracticeSettings: cleanArray(form.acceptedPracticeSettings),
      acceptedMissionTypes: cleanArray(form.acceptedMissionTypes),
      minimumCompensation: form.minimumCompensation === '' || form.minimumCompensation == null ? undefined : Number(form.minimumCompensation),
      preferredDurations: cleanArray(form.preferredDurations),
      refusedSchedules: cleanArray(form.refusedSchedules),
      knownSoftware: cleanArray(form.knownSoftware),
      acceptedPatientTypes: cleanArray(form.acceptedPatientTypes),
      refusedPatientTypes: cleanArray(form.refusedPatientTypes),
      maxPatientsPerDay: form.maxPatientsPerDay === '' || form.maxPatientsPerDay == null ? undefined : Number(form.maxPatientsPerDay),
      parkingRequired: form.parkingRequired,
      acceptedActs: cleanArray(form.acceptedActs),
      refusedActs: cleanArray(form.refusedActs),
      secretaryRequired: form.secretaryRequired,
      accommodationRequired: form.accommodationRequired,
      fastPaymentImportant: form.fastPaymentImportant,
      acceptedPressureLevel: form.acceptedPressureLevel || undefined,
    };

    try {
      const updated = await api.patch<Profile>('/me/profile', payload);
      applyProfile(updated);
      setMessage(`Profil ${gendered(updated, 'mis a jour', 'mise a jour')}.`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar() {
    if (!avatarFile) return;

    setUploadingAvatar(true);
    setMessage(null);
    setError(null);

    try {
      const upload = await api.post<UploadResponse>('/documents/upload-url', {
        documentType: 'AVATAR',
        fileName: avatarFile.name,
        mimeType: avatarFile.type || 'application/octet-stream',
        sizeBytes: avatarFile.size,
      });

      if (!isMockStorageUrl(upload.uploadUrl)) {
        const put = await fetch(upload.uploadUrl, {
          method: upload.method,
          headers: upload.headers,
          body: avatarFile,
        });

        if (!put.ok) throw new Error('Upload de la photo impossible.');
      }

      await api.post(`/documents/${upload.documentId}/confirm-upload`, {});
      const updated = await api.get<Profile>('/me/profile');
      applyProfile(updated);
      setAvatarFile(null);
      setAvatarInputKey((key) => key + 1);
      setMessage('Photo de profil mise a jour.');
    } catch (e: any) {
      setError(e.message || 'Erreur upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function verifyHealthProfessional() {
    setVerifyingHealth(true);
    setMessage(null);
    setError(null);

    try {
      const updated = await api.post<Profile>('/me/profile/verify-health-professional', {
        rpps: form.rpps,
      });
      applyProfile(updated);
      setMessage(healthVerificationMessage(updated.healthVerificationStatus));
    } catch (e: any) {
      setError(e.message || 'Verification RPPS impossible.');
      try {
        const refreshed = await api.get<Profile>('/me/profile');
        applyProfile(refreshed);
      } catch {
        // Keep current form state if refresh fails.
      }
    } finally {
      setVerifyingHealth(false);
    }
  }

  const initials = `${form.firstName || ''} ${form.lastName || ''}`
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'ML';

  return (
    <>
      <PageHeader
        title="Mon profil"
        description={`Identité, informations professionnelles, préférences de missions et documents vérifiables pour ${gendered(form, 'un candidat', 'une candidate')}.`}
      />

      <div className="grid-main">
        <div className="profile-sidebar">
          <Card className="card-highlight">
            <div className="profile-photo-panel">
              <div className="profile-photo-preview">
                {profile.avatarUrl ? (
                  <img src={profile.avatarUrl} alt="Photo de profil" />
                ) : (
                  <span>{initials}</span>
                )}
              </div>
              <div className="profile-photo-controls">
                <h2>Photo de profil</h2>
                <p className="small">JPG, PNG ou WebP, 3 Mo maximum.</p>
                <Field label="Image">
                  <input
                    key={avatarInputKey}
                    className="input"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                  />
                </Field>
                <Button type="button" disabled={!avatarFile || uploadingAvatar} onClick={uploadAvatar}>
                  {uploadingAvatar ? 'Upload...' : 'Mettre à jour la photo'}
                </Button>
              </div>
            </div>
            <div className="divider" />
            <h2>Completion</h2>
            <div className="stat">
              <strong>{profile.completionScore}%</strong>
              <ProgressBar value={profile.completionScore} />
              <span>Plus votre profil est complet, plus vos candidatures sont lisibles pour les établissements.</span>
            </div>
            <div className="divider" />
            <p className="small">À renseigner en priorité : ville, statut médical, spécialité, mobilité, missions acceptées et CV.</p>
          </Card>
        </div>

        <div className="profile-main-panel">
          <div className="candidate-page-tabs billing-tabs" role="tablist" aria-label="Sections du profil">
            {profileTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={activeTab === tab.id ? 'active' : ''}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                aria-selected={activeTab === tab.id}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'documents' ? (
            <DocumentSection />
          ) : (
            <Card>
              <h2>
                {activeTab === 'identity' ? `Identité ${gendered(form, 'candidat', 'candidate')}` : null}
                {activeTab === 'professional' ? 'Parcours professionnel' : null}
                {activeTab === 'missions' ? 'Préférences de missions' : null}
              </h2>
              <form className="form" onSubmit={submit}>
                {message ? <Alert type="success">{message}</Alert> : null}
                {error ? <Alert type="error">{error}</Alert> : null}

                {activeTab === 'identity' ? (
                  <>
                    <div className="form-row">
                      <Field label="Prenom"><Input value={form.firstName || ''} onChange={(e) => set('firstName', e.target.value)} /></Field>
                      <Field label="Nom"><Input value={form.lastName || ''} onChange={(e) => set('lastName', e.target.value)} /></Field>
                    </div>

                    <div className="form-row">
                      <Field label="Sexe / accord grammatical">
                        <Select value={form.candidateGender || ''} onChange={(e) => set('candidateGender', e.target.value as CandidateGender)}>
                          <option value="">Selectionner</option>
                          <option value="FEMININE">Feminin</option>
                          <option value="MASCULINE">Masculin</option>
                        </Select>
                      </Field>
                      <SingleChoiceField label="Ville" value={form.city || ''} options={cityOptions} onChange={(value) => set('city', value)} />
                    </div>

                    <SingleChoiceField label="Pays" value={form.country || 'France'} options={countryOptions} onChange={(value) => set('country', value)} />

                    <Field label="Bio"><Textarea value={form.bio || ''} onChange={(e) => set('bio', e.target.value)} placeholder="Quelques lignes pour présenter votre profil." /></Field>
                  </>
                ) : null}

                {activeTab === 'professional' ? (
                  <>
                    <div className="profile-preferences-section">
                      <div className="toolbar">
                        <div>
                          <h3>Vérification professionnelle</h3>
                          <p className="small">Contrôle automatique via l'Annuaire Santé ANS à partir du RPPS.</p>
                        </div>
                        <Badge tone={healthVerificationTone(profile.healthVerificationStatus)}>
                          {healthVerificationLabel(profile.healthVerificationStatus)}
                        </Badge>
                      </div>
                      <Field label="Numero RPPS">
                        <Input
                          inputMode="numeric"
                          value={form.rpps || ''}
                          onChange={(e) => set('rpps', e.target.value)}
                          placeholder="Ex : 10001234567"
                        />
                      </Field>
                      {profile.verifiedProfession || profile.verifiedSpecialty ? (
                        <div className="info-list">
                          {profile.verifiedProfession ? (
                            <div>
                              <span>Profession validée</span>
                              <strong>{profile.verifiedProfession}</strong>
                            </div>
                          ) : null}
                          {profile.verifiedSpecialty ? (
                            <div>
                              <span>Spécialité validée</span>
                              <strong>{profile.verifiedSpecialty}</strong>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={verifyingHealth || !String(form.rpps || '').trim()}
                        onClick={verifyHealthProfessional}
                      >
                        {verifyingHealth ? 'Vérification...' : 'Valider mon compte'}
                      </Button>
                    </div>

                    <div className="form-row">
                      <Field label="Statut medical">
                        <Select value={form.medicalStatus || ''} onChange={(e) => set('medicalStatus', e.target.value as MedicalStatus)}>
                          <option value="">Selectionner</option>
                          {candidateMedicalStatusOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {medicalStatusLabel(o.value, form)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <MultiChoiceTextField
                        label="Spécialité"
                        value={form.specialty || ''}
                        options={specialtyOptions}
                        onChange={(value) => set('specialty', value)}
                      />
                    </div>

                    {form.medicalStatus === 'OTHER' ? (
                      <Field label="Statut personnalise">
                        <Input value={form.medicalStatusOther || ''} onChange={(e) => set('medicalStatusOther', e.target.value)} placeholder="Ex : assistant specialiste..." />
                      </Field>
                    ) : null}

                    <div className="form-row">
                      <MultiChoiceTextField label="Diplôme universitaire" value={form.orientation || ''} options={universityDiplomaOptions} onChange={(value) => set('orientation', value)} />
                      <SingleChoiceField label="Hôpital / faculté" value={form.hospitalOrFaculty || ''} options={hospitalOrFacultyOptions} onChange={(value) => set('hospitalOrFaculty', value)} />
                    </div>

                    <div className="form-row">
                      <Field label="Années d'expérience"><Input type="number" min={0} max={80} value={form.experienceYears ?? ''} onChange={(e) => set('experienceYears', e.target.value)} /></Field>
                      <MultiChoiceField label="Compétences" values={safeArray(form.actsPerformed)} options={actsPerformedOptions} onChange={(values) => set('actsPerformed', values)} />
                    </div>
                  </>
                ) : null}

                {activeTab === 'missions' ? (
                  <>
                    <Field label="Disponibilités"><Textarea value={form.availabilityNotes || ''} onChange={(e) => set('availabilityNotes', e.target.value)} placeholder="Ex : nuits, week-ends, gardes ponctuelles..." /></Field>

                    <div className="profile-preferences-section">
                      <h3>Disponibilités structurées</h3>
                      <MultiChoiceField label="Jours acceptés" values={safeArray(form.acceptedWeekdays)} options={weekdayOptions} onChange={(values) => set('acceptedWeekdays', values)} />
                      <MultiChoiceField label="Créneaux acceptés" values={safeArray(form.acceptedTimeSlots)} options={timeSlotOptions} onChange={(values) => set('acceptedTimeSlots', values)} />
                      <SingleChoiceField label="Préavis minimum" value={form.minimumNoticeHours == null ? '' : String(form.minimumNoticeHours)} options={noticeOptions} onChange={(value) => set('minimumNoticeHours', value)} />
                    </div>

                    <MultiChoiceField label="Villes acceptées" values={safeArray(form.preferredCities)} options={cityOptions} onChange={(values) => set('preferredCities', values)} />

                    <div className="form-row">
                      <Field label="Rayon maximum (km)">
                        <Input type="number" min={0} max={1000} value={form.maxTravelRadiusKm ?? ''} onChange={(e) => set('maxTravelRadiusKm', e.target.value)} placeholder="Ex : 50" />
                      </Field>
                      <Field label="Rémunération minimale (EUR)">
                        <Input type="number" min={0} value={form.minimumCompensation ?? ''} onChange={(e) => set('minimumCompensation', e.target.value)} placeholder="Ex : 600" />
                      </Field>
                    </div>

                    <MultiChoiceField label="Mobilité" values={safeArray(form.mobilityOptions)} options={mobilityOptions} onChange={(values) => set('mobilityOptions', values)} />
                    <div className="form-row">
                      <SingleChoiceField label="Type de mobilité" value={form.mobilityRangeType || ''} options={mobilityRangeOptions} onChange={(value) => set('mobilityRangeType', value)} />
                      <Field label="Logement requis au-delà de (km)">
                        <Input type="number" min={0} max={1000} value={form.housingRequiredBeyondKm ?? ''} onChange={(e) => set('housingRequiredBeyondKm', e.target.value)} placeholder="Ex : 50" />
                      </Field>
                    </div>
                    <MultiChoiceField label="Types de missions acceptées" values={safeArray(form.acceptedMissionTypes)} options={acceptedMissionTypeOptions} onChange={(values) => set('acceptedMissionTypes', values)} />
                    <MultiChoiceField label="Cadres d'exercice acceptés" values={safeArray(form.acceptedPracticeSettings)} options={practiceSettingOptions} onChange={(values) => set('acceptedPracticeSettings', values)} />
                    <MultiChoiceField label="Durée préférée" values={safeArray(form.preferredDurations)} options={durationOptions} onChange={(values) => set('preferredDurations', values)} />
                    <MultiChoiceField label="Horaires refusés" values={safeArray(form.refusedSchedules)} options={refusedScheduleOptions} onChange={(values) => set('refusedSchedules', values)} />
                    <MultiChoiceField label="Logiciels déjà utilisés" values={safeArray(form.knownSoftware)} options={softwareOptions} onChange={(values) => set('knownSoftware', values)} />
                    <MultiChoiceField label="Patientèle acceptée" values={safeArray(form.acceptedPatientTypes)} options={patientTypeOptions} onChange={(values) => set('acceptedPatientTypes', values)} />
                    <MultiChoiceField label="Patientèle refusée" values={safeArray(form.refusedPatientTypes)} options={patientTypeOptions} onChange={(values) => set('refusedPatientTypes', values)} />

                    <div className="profile-preferences-section">
                       <h3>Actes et charge de travail</h3>
                       <MultiChoiceField label="Actes acceptés" values={safeArray(form.acceptedActs)} options={missionActOptions} onChange={(values) => set('acceptedActs', values)} />
                       <MultiChoiceField label="Actes refusés" values={safeArray(form.refusedActs)} options={missionActOptions} onChange={(values) => set('refusedActs', values)} />
                      <Field label="Patients par jour maximum">
                        <Input type="number" min={0} max={300} value={form.maxPatientsPerDay ?? ''} onChange={(e) => set('maxPatientsPerDay', e.target.value)} placeholder="Ex : 25" />
                      </Field>
                    </div>

                    <div className="form-row">
                      <BooleanPreference label="Secrétaire obligatoire" value={form.secretaryRequired} onChange={(value) => set('secretaryRequired', value)} />
                      <BooleanPreference label="Logement obligatoire" value={form.accommodationRequired} onChange={(value) => set('accommodationRequired', value)} />
                    </div>

                    <div className="form-row">
                      <BooleanPreference label="Parking obligatoire" value={form.parkingRequired} onChange={(value) => set('parkingRequired', value)} />
                      <BooleanPreference label="Paiement rapide important" value={form.fastPaymentImportant} onChange={(value) => set('fastPaymentImportant', value)} />
                    </div>

                    <div className="form-row">
                      <SingleChoiceField label="Niveau de pression accepté" value={form.acceptedPressureLevel || ''} options={pressureLevelOptions} onChange={(value) => set('acceptedPressureLevel', value)} />
                    </div>
                  </>
                ) : null}

                <Button disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer'}</Button>
              </form>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function healthVerificationLabel(status?: HealthVerificationStatus | null) {
  switch (status) {
    case 'VERIFIED':
      return 'Vérifié';
    case 'PENDING':
      return 'Vérification...';
    case 'NOT_FOUND':
      return 'RPPS introuvable';
    case 'MISMATCH':
      return 'Identité différente';
    case 'ERROR':
      return 'Erreur ANS';
    default:
      return 'Non vérifié';
  }
}

function healthVerificationTone(
  status?: HealthVerificationStatus | null,
): 'neutral' | 'success' | 'warning' | 'danger' {
  if (status === 'VERIFIED') return 'success';
  if (status === 'NOT_FOUND' || status === 'MISMATCH') return 'warning';
  if (status === 'ERROR') return 'danger';
  return 'neutral';
}

function healthVerificationMessage(status?: HealthVerificationStatus | null) {
  if (status === 'VERIFIED') return 'Compte professionnel vérifié.';
  if (status === 'NOT_FOUND') return 'Aucun professionnel actif trouvé pour ce RPPS.';
  if (status === 'MISMATCH') return 'RPPS trouvé, mais le nom ou le prénom ne correspond pas au profil.';
  return 'Vérification RPPS terminée.';
}

function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function cleanArray(value: unknown): string[] {
  return safeArray(value).map((item) => item.trim()).filter(Boolean);
}

function BooleanPreference({ label, value, onChange }: { label: string; value?: boolean | null; onChange: (value: boolean) => void }) {
  return (
    <div className="boolean-choice profile-boolean-choice">
      <span>{label}</span>
      <div className="segmented-control">
        <button type="button" className={value === true ? 'active' : ''} onClick={() => onChange(true)}>Oui</button>
        <button type="button" className={value === false ? 'active' : ''} onClick={() => onChange(false)}>Non</button>
      </div>
    </div>
  );
}
