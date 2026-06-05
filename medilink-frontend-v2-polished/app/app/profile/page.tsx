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
  mobilityOptions,
  patientTypeOptions,
  pressureLevelOptions,
  refusedScheduleOptions,
  softwareOptions,
  specialtyOptions,
  universityDiplomaOptions,
} from '@/lib/profile-options';

type UploadResponse = {
  documentId: string;
  storageKey: string;
  provider: 'mock' | 'local' | 's3';
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresInSeconds: number;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<any>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [verifyingHealth, setVerifyingHealth] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Profile>('/me/profile')
      .then((p) => {
        setProfile(p);
        setForm({ ...p, actsPerformedText: (p.actsPerformed || []).join(', ') });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !profile) return <LoadingCard />;

  function set(name: string, value: unknown) {
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
      acceptedMissionTypes: cleanArray(form.acceptedMissionTypes),
      minimumCompensation: form.minimumCompensation === '' || form.minimumCompensation == null ? undefined : Number(form.minimumCompensation),
      preferredDurations: cleanArray(form.preferredDurations),
      refusedSchedules: cleanArray(form.refusedSchedules),
      knownSoftware: cleanArray(form.knownSoftware),
      acceptedPatientTypes: cleanArray(form.acceptedPatientTypes),
      secretaryRequired: form.secretaryRequired,
      accommodationRequired: form.accommodationRequired,
      fastPaymentImportant: form.fastPaymentImportant,
      acceptedPressureLevel: form.acceptedPressureLevel || undefined,
    };

    try {
      const updated = await api.patch<Profile>('/me/profile', payload);
      setProfile(updated);
      setForm({ ...updated, actsPerformedText: (updated.actsPerformed || []).join(', ') });
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
      setProfile(updated);
      setForm({ ...updated, actsPerformedText: (updated.actsPerformed || []).join(', ') });
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
      setProfile(updated);
      setForm({ ...updated, actsPerformedText: (updated.actsPerformed || []).join(', ') });
      setMessage(healthVerificationMessage(updated.healthVerificationStatus));
    } catch (e: any) {
      setError(e.message || 'Verification RPPS impossible.');
      try {
        const refreshed = await api.get<Profile>('/me/profile');
        setProfile(refreshed);
        setForm({ ...refreshed, actsPerformedText: (refreshed.actsPerformed || []).join(', ') });
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
        description={`Identite, informations professionnelles, preferences de missions et documents verifiables pour ${gendered(form, 'un candidat', 'une candidate')}.`}
      />

      <div className="grid-main">
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
                {uploadingAvatar ? 'Upload...' : 'Mettre a jour la photo'}
              </Button>
            </div>
          </div>
          <div className="divider" />
          <h2>Completion</h2>
          <div className="stat">
            <strong>{profile.completionScore}%</strong>
            <ProgressBar value={profile.completionScore} />
            <span>Plus votre profil est complet, plus vos candidatures sont lisibles pour les etablissements.</span>
          </div>
          <div className="divider" />
          <p className="small">A renseigner en priorite : ville, statut medical, specialite, mobilite, missions acceptees et CV.</p>
        </Card>

        <Card>
          <div className="toolbar">
            <div>
              <h2>Verification professionnelle</h2>
              <p className="small">Controle automatique via l'Annuaire Sante ANS a partir du RPPS.</p>
            </div>
            <Badge tone={healthVerificationTone(profile.healthVerificationStatus)}>
              {healthVerificationLabel(profile.healthVerificationStatus)}
            </Badge>
          </div>
          <div className="form">
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
                    <span>Profession validee</span>
                    <strong>{profile.verifiedProfession}</strong>
                  </div>
                ) : null}
                {profile.verifiedSpecialty ? (
                  <div>
                    <span>Specialite validee</span>
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
              {verifyingHealth ? 'Verification...' : 'Valider mon compte'}
            </Button>
          </div>
        </Card>

        <Card>
          <h2>Informations {gendered(form, 'candidat', 'candidate')}</h2>
          <form className="form" onSubmit={submit}>
            {message ? <Alert type="success">{message}</Alert> : null}
            {error ? <Alert type="error">{error}</Alert> : null}

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

            <div className="form-row">
              <SingleChoiceField label="Pays" value={form.country || 'France'} options={countryOptions} onChange={(value) => set('country', value)} />
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
            </div>

            <div className="form-row">
              <MultiChoiceTextField
                label="Spécialité"
                value={form.specialty || ''}
                options={specialtyOptions}
                onChange={(value) => set('specialty', value)}
              />
              <MultiChoiceTextField label="Diplôme universitaire" value={form.orientation || ''} options={universityDiplomaOptions} onChange={(value) => set('orientation', value)} />
            </div>

            {form.medicalStatus === 'OTHER' ? (
              <Field label="Statut personnalise">
                <Input value={form.medicalStatusOther || ''} onChange={(e) => set('medicalStatusOther', e.target.value)} placeholder="Ex : assistant specialiste..." />
              </Field>
            ) : null}

            <SingleChoiceField label="Hôpital / faculté" value={form.hospitalOrFaculty || ''} options={hospitalOrFacultyOptions} onChange={(value) => set('hospitalOrFaculty', value)} />

            <div className="form-row">
              <Field label="Annees d'experience"><Input type="number" min={0} max={80} value={form.experienceYears ?? ''} onChange={(e) => set('experienceYears', e.target.value)} /></Field>
              <MultiChoiceField label="Compétences" values={safeArray(form.actsPerformed)} options={actsPerformedOptions} onChange={(values) => set('actsPerformed', values)} />
            </div>

            <Field label="Disponibilites"><Textarea value={form.availabilityNotes || ''} onChange={(e) => set('availabilityNotes', e.target.value)} placeholder="Ex : nuits, week-ends, gardes ponctuelles..." /></Field>

            <div className="profile-preferences-section">
              <h3>Preferences de missions</h3>

              <MultiChoiceField label="Villes acceptees" values={safeArray(form.preferredCities)} options={cityOptions} onChange={(values) => set('preferredCities', values)} />

              <div className="form-row">
                <Field label="Rayon maximum (km)">
                  <Input type="number" min={0} max={1000} value={form.maxTravelRadiusKm ?? ''} onChange={(e) => set('maxTravelRadiusKm', e.target.value)} placeholder="Ex : 50" />
                </Field>
                <Field label="Remuneration minimale (EUR)">
                  <Input type="number" min={0} value={form.minimumCompensation ?? ''} onChange={(e) => set('minimumCompensation', e.target.value)} placeholder="Ex : 600" />
                </Field>
              </div>

              <MultiChoiceField label="Mobilite" values={safeArray(form.mobilityOptions)} options={mobilityOptions} onChange={(values) => set('mobilityOptions', values)} />
              <MultiChoiceField label="Types de missions acceptees" values={safeArray(form.acceptedMissionTypes)} options={acceptedMissionTypeOptions} onChange={(values) => set('acceptedMissionTypes', values)} />
              <MultiChoiceField label="Durée préférée" values={safeArray(form.preferredDurations)} options={durationOptions} onChange={(values) => set('preferredDurations', values)} />
              <MultiChoiceField label="Horaires refuses" values={safeArray(form.refusedSchedules)} options={refusedScheduleOptions} onChange={(values) => set('refusedSchedules', values)} />
              <MultiChoiceField label="Logiciels déjà utilisés" values={safeArray(form.knownSoftware)} options={softwareOptions} onChange={(values) => set('knownSoftware', values)} />
              <MultiChoiceField label="Patientele acceptee" values={safeArray(form.acceptedPatientTypes)} options={patientTypeOptions} onChange={(values) => set('acceptedPatientTypes', values)} />

              <div className="form-row">
                <BooleanPreference label="Secrétaire obligatoire" value={form.secretaryRequired} onChange={(value) => set('secretaryRequired', value)} />
                <BooleanPreference label="Logement obligatoire" value={form.accommodationRequired} onChange={(value) => set('accommodationRequired', value)} />
              </div>

              <div className="form-row">
                <BooleanPreference label="Paiement rapide important" value={form.fastPaymentImportant} onChange={(value) => set('fastPaymentImportant', value)} />
                <SingleChoiceField label="Niveau de pression accepte" value={form.acceptedPressureLevel || ''} options={pressureLevelOptions} onChange={(value) => set('acceptedPressureLevel', value)} />
              </div>
            </div>

            <Field label="Bio"><Textarea value={form.bio || ''} onChange={(e) => set('bio', e.target.value)} placeholder="Quelques lignes pour presenter votre profil." /></Field>
            <Button disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer le profil'}</Button>
          </form>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}><DocumentSection /></div>
    </>
  );
}

function healthVerificationLabel(status?: HealthVerificationStatus | null) {
  switch (status) {
    case 'VERIFIED':
      return 'Verifie';
    case 'PENDING':
      return 'Verification...';
    case 'NOT_FOUND':
      return 'RPPS introuvable';
    case 'MISMATCH':
      return 'Identite differente';
    case 'ERROR':
      return 'Erreur ANS';
    default:
      return 'Non verifie';
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
  if (status === 'VERIFIED') return 'Compte professionnel verifie.';
  if (status === 'NOT_FOUND') return 'Aucun professionnel actif trouve pour ce RPPS.';
  if (status === 'MISMATCH') return 'RPPS trouve, mais le nom ou le prenom ne correspond pas au profil.';
  return 'Verification RPPS terminee.';
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
