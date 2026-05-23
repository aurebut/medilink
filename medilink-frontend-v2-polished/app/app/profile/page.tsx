'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, isMockStorageUrl } from '@/lib/api';
import type { MedicalStatus, Profile } from '@/lib/types';
import { Alert, Button, Card, Field, Input, LoadingCard, PageHeader, ProgressBar, Select, Textarea } from '@/components/ui';
import { DocumentSection } from '@/components/DocumentSection';

type UploadResponse = {
  documentId: string;
  storageKey: string;
  provider: 'mock' | 'local' | 's3';
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresInSeconds: number;
};

type ChoiceOption = { value: string; label: string };

const candidateMedicalStatusOptions: Array<{ value: MedicalStatus; label: string }> = [
  { value: 'INTERN', label: 'Interne' },
  { value: 'JUNIOR_DOCTOR', label: 'Docteur junior' },
  { value: 'DOCTOR', label: 'Medecin these' },
  { value: 'REGULAR_LOCUM', label: 'Remplacant regulier' },
  { value: 'OTHER', label: 'Autre' },
];

const specialtyOptions: ChoiceOption[] = [
  { value: 'Medecine generale', label: 'Medecine generale' },
  { value: 'Urgences', label: 'Urgences' },
  { value: 'Anesthesie-reanimation', label: 'Anesthesie-reanimation' },
  { value: 'Pediatrie', label: 'Pediatrie' },
  { value: 'Gynecologie-obstetrique', label: 'Gynecologie-obstetrique' },
  { value: 'Psychiatrie', label: 'Psychiatrie' },
  { value: 'Radiologie', label: 'Radiologie' },
  { value: 'Cardiologie', label: 'Cardiologie' },
];

const cityOptions: ChoiceOption[] = [
  { value: 'Paris', label: 'Paris' },
  { value: 'Lyon', label: 'Lyon' },
  { value: 'Marseille', label: 'Marseille' },
  { value: 'Toulouse', label: 'Toulouse' },
  { value: 'Bordeaux', label: 'Bordeaux' },
  { value: 'Lille', label: 'Lille' },
  { value: 'Nantes', label: 'Nantes' },
  { value: 'Montpellier', label: 'Montpellier' },
];

const mobilityOptions: ChoiceOption[] = [
  { value: 'Voiture', label: 'Voiture' },
  { value: 'Train', label: 'Train' },
  { value: 'Logement necessaire', label: 'Logement necessaire' },
];

const acceptedMissionTypeOptions: ChoiceOption[] = [
  { value: 'Garde', label: 'Garde' },
  { value: 'Remplacement', label: 'Remplacement' },
  { value: 'Vacation', label: 'Vacation' },
  { value: 'Urgence', label: 'Urgence' },
  { value: 'Cabinet liberal', label: 'Cabinet liberal' },
  { value: 'Clinique', label: 'Clinique' },
];

const durationOptions: ChoiceOption[] = [
  { value: 'Demi-journee', label: 'Demi-journee' },
  { value: 'Journee', label: 'Journee' },
  { value: '24 h', label: '24 h' },
  { value: 'Week-end', label: 'Week-end' },
  { value: '1 semaine', label: '1 semaine' },
  { value: 'Longue mission', label: 'Longue mission' },
];

const refusedScheduleOptions: ChoiceOption[] = [
  { value: 'Nuits', label: 'Nuits' },
  { value: 'Week-ends', label: 'Week-ends' },
  { value: 'Jours feries', label: 'Jours feries' },
  { value: 'Matins tres tot', label: 'Matins tres tot' },
  { value: 'Gardes 24 h', label: 'Gardes 24 h' },
];

const softwareOptions: ChoiceOption[] = [
  { value: 'Doctolib', label: 'Doctolib' },
  { value: 'Weda', label: 'Weda' },
  { value: 'Hellodoc', label: 'Hellodoc' },
  { value: 'Crossway', label: 'Crossway' },
  { value: 'MediStory', label: 'MediStory' },
  { value: 'Axisante', label: 'Axisante' },
  { value: 'Orbis', label: 'Orbis' },
  { value: 'DxCare', label: 'DxCare' },
];

const patientTypeOptions: ChoiceOption[] = [
  { value: 'Adultes', label: 'Adultes' },
  { value: 'Enfants', label: 'Enfants' },
  { value: 'Personnes agees', label: 'Personnes agees' },
  { value: 'Patientele chronique', label: 'Patientele chronique' },
  { value: 'Soins non programmes', label: 'Soins non programmes' },
  { value: 'Urgences', label: 'Urgences' },
];

const pressureLevelOptions: ChoiceOption[] = [
  { value: 'Faible', label: 'Faible' },
  { value: 'Modere', label: 'Modere' },
  { value: 'Soutenu', label: 'Soutenu' },
  { value: 'Tres soutenu', label: 'Tres soutenu' },
];

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<any>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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
      city: form.city || undefined,
      country: form.country || undefined,
      medicalStatus: form.medicalStatus || undefined,
      medicalStatusOther: form.medicalStatus === 'OTHER' ? form.medicalStatusOther || undefined : undefined,
      specialty: form.specialty || undefined,
      orientation: form.orientation || undefined,
      hospitalOrFaculty: form.hospitalOrFaculty || undefined,
      bio: form.bio || undefined,
      experienceYears: form.experienceYears === '' || form.experienceYears == null ? undefined : Number(form.experienceYears),
      actsPerformed: String(form.actsPerformedText || '').split(',').map((x) => x.trim()).filter(Boolean),
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
      setMessage('Profil mis a jour.');
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
        description="Identite, informations professionnelles, preferences de missions et documents verifiables."
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
          <h2>Informations candidat</h2>
          <form className="form" onSubmit={submit}>
            {message ? <Alert type="success">{message}</Alert> : null}
            {error ? <Alert type="error">{error}</Alert> : null}

            <div className="form-row">
              <Field label="Prenom"><Input value={form.firstName || ''} onChange={(e) => set('firstName', e.target.value)} /></Field>
              <Field label="Nom"><Input value={form.lastName || ''} onChange={(e) => set('lastName', e.target.value)} /></Field>
            </div>

            <div className="form-row">
              <Field label="Ville"><Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></Field>
              <Field label="Pays"><Input value={form.country || 'France'} onChange={(e) => set('country', e.target.value)} /></Field>
            </div>

            <div className="form-row">
              <Field label="Statut medical">
                <Select value={form.medicalStatus || ''} onChange={(e) => set('medicalStatus', e.target.value as MedicalStatus)}>
                  <option value="">Selectionner</option>
                  {candidateMedicalStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <SingleChoiceField
                label="Specialite"
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
              <Field label="Secteur"><Input value={form.orientation || ''} onChange={(e) => set('orientation', e.target.value)} /></Field>
              <Field label="Hopital / faculte"><Input value={form.hospitalOrFaculty || ''} onChange={(e) => set('hospitalOrFaculty', e.target.value)} /></Field>
            </div>

            <div className="form-row">
              <Field label="Annees d'experience"><Input type="number" min={0} max={80} value={form.experienceYears ?? ''} onChange={(e) => set('experienceYears', e.target.value)} /></Field>
              <Field label="Actes realises, separes par virgule"><Input value={form.actsPerformedText || ''} onChange={(e) => set('actsPerformedText', e.target.value)} /></Field>
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
              <MultiChoiceField label="Duree preferee" values={safeArray(form.preferredDurations)} options={durationOptions} onChange={(values) => set('preferredDurations', values)} />
              <MultiChoiceField label="Horaires refuses" values={safeArray(form.refusedSchedules)} options={refusedScheduleOptions} onChange={(values) => set('refusedSchedules', values)} />
              <MultiChoiceField label="Logiciels connus" values={safeArray(form.knownSoftware)} options={softwareOptions} onChange={(values) => set('knownSoftware', values)} />
              <MultiChoiceField label="Patientele acceptee" values={safeArray(form.acceptedPatientTypes)} options={patientTypeOptions} onChange={(values) => set('acceptedPatientTypes', values)} />

              <div className="form-row">
                <BooleanPreference label="Secretaire obligatoire" value={form.secretaryRequired} onChange={(value) => set('secretaryRequired', value)} />
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

function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function cleanArray(value: unknown): string[] {
  return safeArray(value).map((item) => item.trim()).filter(Boolean);
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function MultiChoiceField({ label, values, options, onChange }: { label: string; values: string[]; options: ChoiceOption[]; onChange: (values: string[]) => void }) {
  const [customValue, setCustomValue] = useState('');
  const [customOpen, setCustomOpen] = useState(false);
  const customValues = values.filter((value) => !options.some((option) => option.value === value));

  function addCustomValue() {
    const next = customValue.trim();
    if (!next) return;
    onChange(values.includes(next) ? values : [...values, next]);
    setCustomValue('');
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="choice-grid profile-choice-grid">
        {options.map((option) => (
          <button key={option.value} type="button" className={values.includes(option.value) ? 'active' : ''} aria-pressed={values.includes(option.value)} onClick={() => onChange(toggleValue(values, option.value))}>
            {option.label}
          </button>
        ))}
        <button type="button" className={customOpen ? 'active' : ''} onClick={() => setCustomOpen((open) => !open)}>Autre</button>
      </div>
      {customOpen ? (
        <div className="custom-choice-row">
          <Input value={customValue} onChange={(e) => setCustomValue(e.target.value)} placeholder="Ajouter une reponse libre" />
          <Button type="button" variant="secondary" onClick={addCustomValue}>Ajouter</Button>
        </div>
      ) : null}
      {customValues.length ? (
        <div className="selected-custom-values">
          {customValues.map((value) => (
            <button key={value} type="button" onClick={() => onChange(values.filter((item) => item !== value))}>{value} x</button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SingleChoiceField({ label, value, options, onChange }: { label: string; value: string; options: ChoiceOption[]; onChange: (value: string) => void }) {
  const isCustom = Boolean(value) && !options.some((option) => option.value === value);
  const [customOpen, setCustomOpen] = useState(isCustom);
  const [customValue, setCustomValue] = useState(isCustom ? value : '');

  function applyCustomValue() {
    const next = customValue.trim();
    if (next) onChange(next);
  }

  return (
    <div className="field">
      <span className="label">{label}</span>
      <div className="choice-grid profile-choice-grid">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? 'active' : ''}
            aria-pressed={value === option.value}
            onClick={() => {
              onChange(option.value);
              setCustomOpen(false);
            }}
          >
            {option.label}
          </button>
        ))}
        <button type="button" className={customOpen || isCustom ? 'active' : ''} onClick={() => setCustomOpen((open) => !open)}>Autre</button>
      </div>
      {customOpen ? (
        <div className="custom-choice-row">
          <Input value={customValue} onChange={(e) => setCustomValue(e.target.value)} placeholder="Entrer un texte libre" />
          <Button type="button" variant="secondary" onClick={applyCustomValue}>Valider</Button>
        </div>
      ) : null}
    </div>
  );
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
