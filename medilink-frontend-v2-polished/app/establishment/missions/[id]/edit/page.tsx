'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MultiChoiceField, MultiChoiceTextField, SingleChoiceField } from '@/components/FormChoiceFields';
import { Alert, Badge, Button, Card, Field, Input, LinkButton, LoadingCard, PageHeader, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, missionTypeOptions, requiredLevelLabels, requiredLevelOptions, statusLabel } from '@/lib/labels';
import {
  acceptedMissionTypeOptions,
  cityOptions,
  equipmentOptions,
  establishmentDepartmentOptions,
  missionActOptions,
  patientTypeOptions,
  practiceSettingOptions,
  sectorOptions,
  secretaryTypeOptions,
  softwareOptions,
  specialtyOptions,
} from '@/lib/profile-options';
import type { Mission, MissionType, RequiredLevel } from '@/lib/types';
import { useAutoRefresh } from '@/lib/use-auto-refresh';

function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function cleanArray(value: unknown): string[] {
  return safeArray(value).map((item) => item.trim()).filter(Boolean);
}

function dateInput(value?: string | null) {
  return value?.slice(0, 10) || '';
}

function optionalText(value?: string | null) {
  const next = String(value || '').trim();
  return next || null;
}

function booleanSelectValue(value?: boolean | null) {
  if (value === true) return 'true';
  if (value === false) return 'false';
  return '';
}

function missionToForm(mission: Mission) {
  return {
    title: mission.title || '',
    description: mission.description || '',
    missionType: mission.missionType || 'REMPLACEMENT',
    specialty: mission.specialty || '',
    requiredLevel: mission.requiredLevels?.[0] || mission.requiredLevel || 'INTERN',
    requiredLevels: mission.requiredLevels?.length ? mission.requiredLevels : [mission.requiredLevel].filter(Boolean),
    practiceSetting: mission.practiceSetting || '',
    requiredActs: mission.requiredActs || [],
    city: mission.city || '',
    location: mission.location || '',
    sector: mission.sector || '',
    patientType: mission.patientType || '',
    softwareUsed: mission.softwareUsed || '',
    hasSecretary: mission.hasSecretary,
    secretaryType: mission.secretaryType || '',
    averagePatientsPerDay: mission.averagePatientsPerDay ?? '',
    isMultidisciplinary: mission.isMultidisciplinary,
    equipmentAvailable: mission.equipmentAvailable || [],
    acceptedMissionTypes: mission.acceptedMissionTypes || [],
    minimumCompensation: mission.minimumCompensation ?? '',
    acceptedPatientTypes: mission.acceptedPatientTypes || [],
    knownSoftware: mission.knownSoftware || [],
    departmentInfo: mission.departmentInfo || '',
    teamInfo: mission.teamInfo || '',
    equipmentInfo: mission.equipmentInfo || '',
    practicalInfo: mission.practicalInfo || '',
    accommodationProvided: mission.accommodationProvided,
    parkingAvailable: mission.parkingAvailable,
    startDate: dateInput(mission.startDate),
    endDate: dateInput(mission.endDate),
    startTime: mission.startTime || '',
    endTime: mission.endTime || '',
    durationHours: mission.durationHours ?? '',
    compensationCurrency: mission.compensationCurrency || 'EUR',
    retrocessionPercentage: mission.retrocessionPercentage ?? '',
    tagsText: mission.tags?.map((tag) => tag.tag).join(', ') || '',
  };
}

function buildPayload(form: any) {
  return {
    title: form.title.trim(),
    description: optionalText(form.description),
    missionType: form.missionType,
    specialty: form.specialty,
    requiredLevel: form.requiredLevels?.[0] || form.requiredLevel,
    requiredLevels: form.requiredLevels?.length ? form.requiredLevels : [form.requiredLevel],
    practiceSetting: form.practiceSetting || null,
    requiredActs: cleanArray(form.requiredActs),
    city: form.city.trim(),
    location: optionalText(form.location),
    sector: form.sector || null,
    patientType: optionalText(form.patientType),
    softwareUsed: optionalText(form.softwareUsed),
    hasSecretary: form.hasSecretary ?? null,
    secretaryType: optionalText(form.secretaryType),
    averagePatientsPerDay: form.averagePatientsPerDay === '' || form.averagePatientsPerDay == null ? null : Number(form.averagePatientsPerDay),
    isMultidisciplinary: form.isMultidisciplinary ?? null,
    equipmentAvailable: cleanArray(form.equipmentAvailable),
    acceptedMissionTypes: cleanArray(form.acceptedMissionTypes),
    minimumCompensation: form.minimumCompensation === '' || form.minimumCompensation == null ? null : Number(form.minimumCompensation),
    acceptedPatientTypes: cleanArray(form.acceptedPatientTypes),
    knownSoftware: cleanArray(form.knownSoftware),
    departmentInfo: optionalText(form.departmentInfo),
    teamInfo: optionalText(form.teamInfo),
    equipmentInfo: optionalText(form.equipmentInfo),
    practicalInfo: optionalText(form.practicalInfo),
    accommodationProvided: form.accommodationProvided ?? null,
    parkingAvailable: form.parkingAvailable ?? null,
    startDate: form.startDate,
    endDate: form.endDate || null,
    startTime: form.startTime || null,
    endTime: form.endTime || null,
    durationHours: form.durationHours === '' || form.durationHours == null ? null : Number(form.durationHours),
    compensationMode: 'RETROCESSION',
    compensationCurrency: form.compensationCurrency || 'EUR',
    retrocessionPercentage: form.retrocessionPercentage ? Number(form.retrocessionPercentage) : undefined,
    compensationAmount: undefined,
    tags: String(form.tagsText || '').split(',').map((tag) => tag.trim()).filter(Boolean),
  };
}

export default function EditMissionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [form, setForm] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formDirty, setFormDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function applyMission(nextMission: Mission) {
    setMission(nextMission);
    setForm(missionToForm(nextMission));
    setFormDirty(false);
  }

  async function loadMission(options: { silent?: boolean; reload?: boolean } = {}) {
    if (!options.silent) setLoading(true);
    setError(null);
    try {
      const nextMission = options.reload
        ? await api.reload<Mission>(`/missions/mine/${id}`)
        : await api.get<Mission>(`/missions/mine/${id}`);
      applyMission(nextMission);
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  useEffect(() => {
    void loadMission();
  }, [id]);

  useAutoRefresh(() => loadMission({ silent: true, reload: true }), { enabled: !loading && !formDirty && !saving });

  function set(name: string, value: unknown) {
    setFormDirty(true);
    setForm((current: any) => ({ ...current, [name]: value }));
  }

  function validate() {
    if (!form?.title?.trim()) return 'Ajoutez un titre.';
    if (!form.specialty) return 'Choisissez une spécialité.';
    if (!form.requiredLevels?.length) return 'Choisissez au moins un type de profil.';
    if (!form.city?.trim()) return 'Indiquez la ville.';
    if (!form.startDate) return 'Choisissez une date de début.';
    if (form.endDate && form.endDate < form.startDate) return 'La date de fin doit être après la date de début.';
    if (!form.retrocessionPercentage) return 'Indiquez le pourcentage de rétrocession.';
    return null;
  }

  async function save() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const updated = await api.patch<Mission>(`/missions/${id}`, buildPayload(form));
      applyMission(updated);
      setSuccess('Annonce mise à jour.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingCard label="Chargement de l'annonce..." />;

  if (!mission || !form) {
    return (
      <>
        <PageHeader title="Modifier l'annonce" description="Impossible de charger cette mission." />
        {error ? <Alert type="error">{error}</Alert> : null}
        <Card>
          <LinkButton href={`/establishment/missions/${id}`}>Retour à la mission</LinkButton>
        </Card>
      </>
    );
  }

  return (
    <div className="edit-mission-page">
      <PageHeader
        title="Modifier l'annonce"
        description={mission.title}
        actions={
          <>
            <LinkButton href={`/establishment/missions/${mission.id}`} variant="light">Retour au pilotage</LinkButton>
            <Button type="button" disabled={saving} onClick={() => void save()}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </>
        }
      />

      {error ? <Alert type="error">{error}</Alert> : null}
      {success ? <Alert type="success">{success}</Alert> : null}

      <div className="edit-mission-layout">
        <div className="edit-mission-form">
          <Card className="edit-mission-section">
            <div className="toolbar">
              <div>
                <h2>Type et besoin</h2>
                <p className="small">Les informations principales visibles dans les listes et la page publique.</p>
              </div>
            </div>
            <div className="form">
              <Field label="Titre de la mission">
                <Input required value={form.title || ''} onChange={(event) => set('title', event.target.value)} />
              </Field>
              <div className="form-row">
                <Field label="Type de mission">
                  <Select value={form.missionType} onChange={(event) => set('missionType', event.target.value as MissionType)}>
                    {missionTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </Select>
                </Field>
                <SingleChoiceField required label="Spécialité" value={form.specialty || ''} options={specialtyOptions} onChange={(value) => set('specialty', value)} />
              </div>
              <div className="choice-section">
                <div className="choice-section-title">Types de profils recherchés</div>
                <MultiChoiceField
                  label="Profils"
                  values={safeArray(form.requiredLevels)}
                  options={requiredLevelOptions}
                  onChange={(values) => {
                    set('requiredLevels', values);
                    set('requiredLevel', values[0]);
                  }}
                />
              </div>
              <Field label="Description">
                <Textarea rows={5} value={form.description || ''} onChange={(event) => set('description', event.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="edit-mission-section">
            <div className="toolbar">
              <div>
                <h2>Contexte terrain</h2>
                <p className="small">Tous les éléments utiles pour aider le candidat à se projeter.</p>
              </div>
            </div>
            <div className="form">
              <SingleChoiceField label="Cadre d'exercice" value={form.practiceSetting || ''} options={practiceSettingOptions} onChange={(value) => set('practiceSetting', value)} />
              <MultiChoiceTextField label="Département / service / type de cabinet" value={form.departmentInfo || ''} options={establishmentDepartmentOptions} onChange={(value) => set('departmentInfo', value)} />
              <MultiChoiceTextField label="Type de patientèle" value={form.patientType || ''} options={patientTypeOptions} onChange={(value) => set('patientType', value)} />
              <MultiChoiceTextField label="Logiciel utilisé" value={form.softwareUsed || ''} options={softwareOptions} onChange={(value) => set('softwareUsed', value)} />
              <MultiChoiceField label="Actes attendus" values={safeArray(form.requiredActs)} options={missionActOptions} onChange={(values) => set('requiredActs', values)} />
              <div className="form-row">
                <Field label="Présence de secrétaire">
                  <Select value={booleanSelectValue(form.hasSecretary)} onChange={(event) => set('hasSecretary', event.target.value === '' ? undefined : event.target.value === 'true')}>
                    <option value="">Non précisé</option>
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </Select>
                </Field>
                <SingleChoiceField label="Type de secrétariat" value={form.secretaryType || ''} options={secretaryTypeOptions} onChange={(value) => set('secretaryType', value)} />
              </div>
              <div className="form-row">
                <Field label="Patients par jour en moyenne">
                  <Input type="number" min={0} value={form.averagePatientsPerDay ?? ''} onChange={(event) => set('averagePatientsPerDay', event.target.value)} />
                </Field>
                <Field label="Cabinet pluridisciplinaire">
                  <Select value={booleanSelectValue(form.isMultidisciplinary)} onChange={(event) => set('isMultidisciplinary', event.target.value === '' ? undefined : event.target.value === 'true')}>
                    <option value="">Non précisé</option>
                    <option value="true">Oui</option>
                    <option value="false">Non</option>
                  </Select>
                </Field>
              </div>
              <MultiChoiceField label="Matériel disponible" values={safeArray(form.equipmentAvailable)} options={equipmentOptions} onChange={(values) => set('equipmentAvailable', values)} />
              <Field label="Équipe sur place">
                <Textarea rows={3} value={form.teamInfo || ''} onChange={(event) => set('teamInfo', event.target.value)} />
              </Field>
              <Field label="Matériel disponible complémentaire">
                <Textarea rows={3} value={form.equipmentInfo || ''} onChange={(event) => set('equipmentInfo', event.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="edit-mission-section">
            <div className="toolbar">
              <div>
                <h2>Lieu et accueil</h2>
                <p className="small">Ville, adresse, accès et conditions d'accueil.</p>
              </div>
            </div>
            <div className="form">
              <div className="form-row">
                <SingleChoiceField required label="Ville" value={form.city || ''} options={cityOptions} onChange={(value) => set('city', value)} />
                <SingleChoiceField label="Secteur conventionné" value={form.sector || ''} options={sectorOptions} onChange={(value) => set('sector', value)} />
              </div>
              <Field label="Lieu précis">
                <Input value={form.location || ''} onChange={(event) => set('location', event.target.value)} />
              </Field>
              <Field label="Infos pratiques d'accès">
                <Textarea rows={3} value={form.practicalInfo || ''} onChange={(event) => set('practicalInfo', event.target.value)} />
              </Field>
              <div className="form-row">
                <BooleanField label="Logement nécessaire" value={form.accommodationProvided} onChange={(value) => set('accommodationProvided', value)} />
                <BooleanField label="Parking disponible" value={form.parkingAvailable} onChange={(value) => set('parkingAvailable', value)} />
              </div>
            </div>
          </Card>

          <Card className="edit-mission-section">
            <div className="toolbar">
              <div>
                <h2>Planning et rémunération</h2>
                <p className="small">Dates, horaires et rétrocession d'honoraires.</p>
              </div>
            </div>
            <div className="form">
              <div className="form-row">
                <Field label="Date début">
                  <Input type="date" required value={form.startDate || ''} onChange={(event) => set('startDate', event.target.value)} />
                </Field>
                <Field label="Date fin">
                  <Input type="date" value={form.endDate || ''} onChange={(event) => set('endDate', event.target.value)} />
                </Field>
              </div>
              <div className="form-row">
                <Field label="Heure début">
                  <Input type="time" value={form.startTime || ''} onChange={(event) => set('startTime', event.target.value)} />
                </Field>
                <Field label="Heure fin">
                  <Input type="time" value={form.endTime || ''} onChange={(event) => set('endTime', event.target.value)} />
                </Field>
              </div>
              <div className="form-row">
                <Field label="Durée estimée en heures">
                  <Input type="number" min={1} max={72} value={form.durationHours || ''} onChange={(event) => set('durationHours', event.target.value)} />
                </Field>
                <Field label="Pourcentage de rétrocession">
                  <Input type="number" min={1} max={100} value={form.retrocessionPercentage || ''} onChange={(event) => set('retrocessionPercentage', event.target.value)} />
                </Field>
              </div>
            </div>
          </Card>

          <Card className="edit-mission-section">
            <div className="toolbar">
              <div>
                <h2>Options de recherche</h2>
                <p className="small">Critères et tags utilisés pour qualifier l'annonce.</p>
              </div>
            </div>
            <div className="form">
              <Field label="Tags, séparés par virgule">
                <Input value={form.tagsText || ''} onChange={(event) => set('tagsText', event.target.value)} />
              </Field>
              <MultiChoiceField label="Types de missions associés" values={safeArray(form.acceptedMissionTypes)} options={acceptedMissionTypeOptions} onChange={(values) => set('acceptedMissionTypes', values)} />
              <MultiChoiceField label="Patientèles acceptées" values={safeArray(form.acceptedPatientTypes)} options={patientTypeOptions} onChange={(values) => set('acceptedPatientTypes', values)} />
              <MultiChoiceField label="Logiciels utiles" values={safeArray(form.knownSoftware)} options={softwareOptions} onChange={(values) => set('knownSoftware', values)} />
              <Field label="Rémunération minimale indicative (%)">
                <Input type="number" min={0} max={100} value={form.minimumCompensation ?? ''} onChange={(event) => set('minimumCompensation', event.target.value)} />
              </Field>
            </div>
          </Card>
        </div>

        <aside className="edit-mission-summary">
          <Card className="mission-draft-summary compact">
            <div className="summary-head">
              <span className="small">Aperçu mission</span>
              <Badge tone={mission.status === 'PUBLISHED' ? 'success' : 'warning'}>{statusLabel(mission.status)}</Badge>
            </div>
            <h2>{form.title || 'Titre à définir'}</h2>
            <div className="tag-list">
              <Badge>{missionTypeLabel(form.missionType)}</Badge>
              <Badge tone="neutral">{requiredLevelLabels(form.requiredLevels, form.requiredLevel)}</Badge>
            </div>
            <div className="info-list">
              <div><span>Spécialité</span><strong>{form.specialty || '-'}</strong></div>
              <div><span>Cadre</span><strong>{form.practiceSetting || '-'}</strong></div>
              <div><span>Ville</span><strong>{form.city || '-'}</strong></div>
              <div><span>Date</span><strong>{form.startDate ? formatDate(form.startDate) : '-'}</strong></div>
              <div><span>Horaire</span><strong>{form.startTime || '-'} {form.endTime ? `- ${form.endTime}` : ''}</strong></div>
              <div><span>Rémunération</span><strong>{formatCompensation({
                compensationMode: 'RETROCESSION',
                retrocessionPercentage: form.retrocessionPercentage ? Number(form.retrocessionPercentage) : null,
                compensationAmount: null,
                compensationCurrency: form.compensationCurrency || 'EUR',
              })}</strong></div>
            </div>
            <Button type="button" block disabled={saving} onClick={() => void save()}>{saving ? 'Enregistrement...' : 'Enregistrer'}</Button>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function BooleanField({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="boolean-choice">
      <span>{label}</span>
      <div className="segmented-control">
        <button type="button" className={value === true ? 'active' : ''} onClick={() => onChange(true)}>Oui</button>
        <button type="button" className={value === false ? 'active' : ''} onClick={() => onChange(false)}>Non</button>
      </div>
    </div>
  );
}
