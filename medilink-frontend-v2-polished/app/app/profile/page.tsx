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
  additionalTrainingOptions,
  candidateMedicalStatusOptions,
  cityOptions,
  countryOptions,
  missionActOptions,
  mobilityOptions,
  noticeOptions,
  patientTypeOptions,
  practiceSettingOptions,
  softwareOptions,
  timeSlotOptions,
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
      orientation: buildOrientationValue(form),
      bio: form.bio || undefined,
      experienceYears: form.experienceYears === '' || form.experienceYears == null ? undefined : Number(form.experienceYears),
      actsPerformed: normalizeCandidateSkills(form.actsPerformed),
      availabilityNotes: form.availabilityNotes || undefined,
      preferredCities: cleanArray(form.preferredCities),
      maxTravelRadiusKm: form.maxTravelRadiusKm === '' || form.maxTravelRadiusKm == null ? undefined : Number(form.maxTravelRadiusKm),
      mobilityOptions: cleanArray(form.mobilityOptions),
      acceptedWeekdays: cleanArray(form.acceptedWeekdays),
      acceptedTimeSlots: cleanArray(form.acceptedTimeSlots),
      minimumNoticeHours: form.minimumNoticeHours === '' || form.minimumNoticeHours == null ? undefined : Number(form.minimumNoticeHours),
      acceptedPracticeSettings: cleanArray(form.acceptedPracticeSettings),
      acceptedMissionTypes: cleanArray(form.acceptedMissionTypes),
      minimumCompensation: form.minimumCompensation === '' || form.minimumCompensation == null ? undefined : Number(form.minimumCompensation),
      knownSoftware: cleanArray(form.knownSoftware),
      acceptedPatientTypes: cleanArray(form.acceptedPatientTypes),
      refusedPatientTypes: cleanArray(form.refusedPatientTypes),
      parkingRequired: form.parkingRequired,
      acceptedActs: cleanArray(form.acceptedActs),
      refusedActs: cleanArray(form.refusedActs),
      secretaryRequired: form.secretaryRequired,
      accommodationRequired: form.accommodationRequired,
      fastPaymentImportant: form.fastPaymentImportant,
    };

    try {
      const updated = await api.patch<Profile>('/me/profile', payload);
      applyProfile(updated);
      setMessage(`Profil ${gendered(updated, 'mis à jour', 'mise à jour')}.`);
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

        if (!put.ok) throw new Error('Téléversement de la photo impossible.');
      }

      await api.post(`/documents/${upload.documentId}/confirm-upload`, {});
      const updated = await api.get<Profile>('/me/profile');
      applyProfile(updated);
      setAvatarFile(null);
      setAvatarInputKey((key) => key + 1);
      setMessage('Photo de profil mise à jour.');
    } catch (e: any) {
      setError(e.message || 'Erreur lors du téléversement de la photo.');
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
      setError(e.message || 'Vérification RPPS impossible.');
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
                  {uploadingAvatar ? 'Envoi en cours...' : 'Mettre à jour la photo'}
                </Button>
              </div>
            </div>
            <div className="divider" />
            <h2>Complétion</h2>
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
                      <Field label="Prénom"><Input value={form.firstName || ''} onChange={(e) => set('firstName', e.target.value)} /></Field>
                      <Field label="Nom"><Input value={form.lastName || ''} onChange={(e) => set('lastName', e.target.value)} /></Field>
                    </div>

                    <div className="form-row">
                      <Field label="Sexe / accord grammatical">
                        <Select value={form.candidateGender || ''} onChange={(e) => set('candidateGender', e.target.value as CandidateGender)}>
                          <option value="">Sélectionner</option>
                          <option value="FEMININE">Féminin</option>
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
                      <Field label="Numéro RPPS">
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
                      <Field label="Statut médical">
                        <Select value={form.medicalStatus || ''} onChange={(e) => set('medicalStatus', e.target.value as MedicalStatus)}>
                          <option value="">Sélectionner</option>
                          {candidateMedicalStatusOptions.map((o) => (
                            <option key={o.value} value={o.value}>
                              {medicalStatusLabel(o.value, form)}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <BooleanPreference label="Thésé" value={readOrientationFlag(form.orientation, 'Thèse')} onChange={(value) => set('orientation', setOrientationFlag(form.orientation, 'Thèse', value))} />
                    </div>

                    {form.medicalStatus === 'OTHER' ? (
                      <Field label="Statut personnalisé">
                        <Input value={form.medicalStatusOther || ''} onChange={(e) => set('medicalStatusOther', e.target.value)} placeholder="Ex : assistant spécialiste..." />
                      </Field>
                    ) : null}

                    <div className="form-row">
                      <BooleanPreference label="DES médecin généraliste" value={readOrientationFlag(form.orientation, 'DES médecin généraliste')} onChange={(value) => set('orientation', setOrientationFlag(form.orientation, 'DES médecin généraliste', value))} />
                      <MultiChoiceTextField label="Formation supplémentaire" value={orientationTrainingsValue(form.orientation)} options={additionalTrainingOptions} onChange={(value) => set('orientation', setOrientationTrainings(form.orientation, value))} />
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
                      <StructuredAvailabilityField
                        weekdays={safeArray(form.acceptedWeekdays)}
                        timeSlots={safeArray(form.acceptedTimeSlots)}
                        notice={form.minimumNoticeHours == null ? '' : String(form.minimumNoticeHours)}
                        onWeekdaysChange={(values) => set('acceptedWeekdays', values)}
                        onTimeSlotsChange={(values) => set('acceptedTimeSlots', values)}
                        onNoticeChange={(value) => set('minimumNoticeHours', value)}
                      />
                    </div>

                    <MultiChoiceField label="Villes acceptées" values={safeArray(form.preferredCities)} options={cityOptions} onChange={(values) => set('preferredCities', values)} />

                    <div className="form-row">
                      <Field label="Rayon maximum (km)">
                        <Input type="number" min={0} max={1000} value={form.maxTravelRadiusKm ?? ''} onChange={(e) => set('maxTravelRadiusKm', e.target.value)} placeholder="Ex : 50" />
                      </Field>
                      <Field label="Rémunération minimale (%)">
                        <Input type="number" min={0} max={100} value={form.minimumCompensation ?? ''} onChange={(e) => set('minimumCompensation', e.target.value)} placeholder="Ex : 70" />
                      </Field>
                    </div>

                    <MultiChoiceField label="Mobilité" values={safeArray(form.mobilityOptions)} options={mobilityOptions} onChange={(values) => set('mobilityOptions', values)} />
                    <div className="form-row">
                      <BooleanPreference label="Logement nécessaire" value={form.accommodationRequired} onChange={(value) => set('accommodationRequired', value)} />
                    </div>
                    <MultiChoiceField label="Types de missions acceptées" values={safeArray(form.acceptedMissionTypes)} options={acceptedMissionTypeOptions} onChange={(values) => set('acceptedMissionTypes', values)} />
                    <MultiChoiceField label="Cadres d'exercice acceptés" values={safeArray(form.acceptedPracticeSettings)} options={practiceSettingOptions} onChange={(values) => set('acceptedPracticeSettings', values)} />
                    <MultiChoiceField label="Logiciels déjà utilisés" values={safeArray(form.knownSoftware)} options={softwareOptions} onChange={(values) => set('knownSoftware', values)} />
                    <MultiChoiceField label="Patientèle acceptée" values={safeArray(form.acceptedPatientTypes)} options={patientTypeOptions} onChange={(values) => set('acceptedPatientTypes', values)} />
                    <MultiChoiceField label="Patientèle refusée" values={safeArray(form.refusedPatientTypes)} options={patientTypeOptions} onChange={(values) => set('refusedPatientTypes', values)} />

                    <div className="profile-preferences-section">
                       <h3>Actes et charge de travail</h3>
                       <MultiChoiceField label="Actes acceptés" values={safeArray(form.acceptedActs)} options={missionActOptions} onChange={(values) => set('acceptedActs', values)} />
                       <MultiChoiceField label="Actes refusés" values={safeArray(form.refusedActs)} options={missionActOptions} onChange={(values) => set('refusedActs', values)} />
                    </div>

                    <div className="form-row">
                      <BooleanPreference label="Secrétaire obligatoire" value={form.secretaryRequired} onChange={(value) => set('secretaryRequired', value)} />
                      <BooleanPreference label="Parking obligatoire" value={form.parkingRequired} onChange={(value) => set('parkingRequired', value)} />
                    </div>

                    <div className="form-row">
                      <BooleanPreference label="Paiement rapide important" value={form.fastPaymentImportant} onChange={(value) => set('fastPaymentImportant', value)} />
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

const ORIENTATION_FLAGS = ['Thèse', 'DES médecin généraliste'];
const ADDITIONAL_TRAINING_VALUES = new Set(additionalTrainingOptions.map((option) => option.value));

function orientationParts(value: unknown) {
  return String(value || '').split(',').map((item) => item.trim()).filter(Boolean);
}

function orientationTrainingsValue(value: unknown) {
  return orientationParts(value).filter((item) => ADDITIONAL_TRAINING_VALUES.has(item)).join(', ');
}

function readOrientationFlag(value: unknown, label: string) {
  const yes = `${label}: Oui`;
  const no = `${label}: Non`;
  const parts = orientationParts(value);
  if (parts.includes(yes)) return true;
  if (parts.includes(no)) return false;
  return null;
}

function setOrientationFlag(value: unknown, label: string, enabled: boolean) {
  const parts = orientationParts(value).filter((item) => item !== `${label}: Oui` && item !== `${label}: Non`);
  return [...parts, `${label}: ${enabled ? 'Oui' : 'Non'}`].join(', ');
}

function setOrientationTrainings(value: unknown, trainings: string) {
  const parts = orientationParts(value).filter((item) => !ADDITIONAL_TRAINING_VALUES.has(item));
  return [...parts, ...orientationParts(trainings)].join(', ');
}

function buildOrientationValue(form: any) {
  return orientationParts(form.orientation).filter((item) => {
    if (ADDITIONAL_TRAINING_VALUES.has(item)) return true;
    return ORIENTATION_FLAGS.some((label) => item === `${label}: Oui` || item === `${label}: Non`);
  }).join(', ') || undefined;
}

function normalizeCandidateSkills(value: unknown) {
  const values = cleanArray(value);
  return values.includes('ECG / vaccination') ? values : ['ECG / vaccination', ...values];
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

function StructuredAvailabilityField({
  weekdays,
  timeSlots,
  notice,
  onWeekdaysChange,
  onTimeSlotsChange,
  onNoticeChange,
}: {
  weekdays: string[];
  timeSlots: string[];
  notice: string;
  onWeekdaysChange: (values: string[]) => void;
  onTimeSlotsChange: (values: string[]) => void;
  onNoticeChange: (value: string) => void;
}) {
  const customWeekdays = weekdays.filter((value) => !weekdayOptions.some((option) => option.value === value));
  const customTimeSlots = timeSlots.filter((value) => !timeSlotOptions.some((option) => option.value === value));

  return (
    <div className="structured-availability">
      <div className="structured-availability-head">
        <div>
          <span className="label">Calendrier de disponibilité</span>
          <p className="small">Cochez les jours et les périodes que les établissements peuvent vous proposer.</p>
        </div>
        <div className="availability-counter">
          <strong>{weekdays.length}</strong>
          <span>jour(s)</span>
        </div>
      </div>

      <ChoiceCalendar
        label="Jours acceptés"
        values={weekdays}
        options={weekdayOptions}
        onChange={onWeekdaysChange}
      />

      {customWeekdays.length ? (
        <RemovableChoiceChips values={customWeekdays} allValues={weekdays} onChange={onWeekdaysChange} />
      ) : null}

      <ChoiceTileGrid
        label="Créneaux acceptés"
        values={timeSlots}
        options={timeSlotOptions}
        onChange={onTimeSlotsChange}
      />

      {customTimeSlots.length ? (
        <RemovableChoiceChips values={customTimeSlots} allValues={timeSlots} onChange={onTimeSlotsChange} />
      ) : null}

      <SingleChoiceField label="Préavis minimum" value={notice} options={noticeOptions} onChange={onNoticeChange} />
    </div>
  );
}

function ChoiceCalendar({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: Array<{ value: string; label: string }>;
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="availability-calendar-grid">
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              className={selected ? 'selected' : ''}
              aria-pressed={selected}
              aria-label={`${option.label} ${selected ? 'accepté' : 'non sélectionné'}`}
              onClick={() => onChange(toggleChoice(values, option.value))}
            >
              <span className="availability-check" aria-hidden="true">{selected ? '✓' : ''}</span>
              <strong>
                <span className="availability-day-initial" aria-hidden="true">{shortWeekdayLabel(option.label, 'initial')}</span>
                <span className="availability-day-short" aria-hidden="true">{shortWeekdayLabel(option.label, 'short')}</span>
                <span className="availability-day-full">{option.label}</span>
              </strong>
              <small>{selected ? 'Accepté' : 'Libre'}</small>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ChoiceTileGrid({
  label,
  values,
  options,
  onChange,
}: {
  label: string;
  values: string[];
  options: Array<{ value: string; label: string }>;
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="availability-slot-grid">
        {options.map((option) => {
          const selected = values.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              className={selected ? 'selected' : ''}
              aria-pressed={selected}
              onClick={() => onChange(toggleChoice(values, option.value))}
            >
              <span className="availability-check" aria-hidden="true">{selected ? '✓' : ''}</span>
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function RemovableChoiceChips({
  values,
  allValues,
  onChange,
}: {
  values: string[];
  allValues: string[];
  onChange: (values: string[]) => void;
}) {
  return (
    <div className="selected-custom-values">
      {values.map((value) => (
        <button key={value} type="button" onClick={() => onChange(allValues.filter((item) => item !== value))}>
          {value} ×
        </button>
      ))}
    </div>
  );
}

function toggleChoice(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function shortWeekdayLabel(label: string, format: 'initial' | 'short') {
  const labels: Record<string, { initial: string; short: string }> = {
    Lundi: { initial: 'L', short: 'Lun.' },
    Mardi: { initial: 'Ma', short: 'Mar.' },
    Mercredi: { initial: 'Me', short: 'Mer.' },
    Jeudi: { initial: 'J', short: 'Jeu.' },
    Vendredi: { initial: 'V', short: 'Ven.' },
    Samedi: { initial: 'S', short: 'Sam.' },
    Dimanche: { initial: 'D', short: 'Dim.' },
  };

  return labels[label]?.[format] || label.slice(0, format === 'initial' ? 1 : 4);
}
