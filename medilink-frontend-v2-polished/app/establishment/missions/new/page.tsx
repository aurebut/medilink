'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { MissionShareActions } from '@/components/MissionShareActions';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { MultiChoiceField, MultiChoiceTextField, SingleChoiceField } from '@/components/FormChoiceFields';
import { Alert, Badge, Button, Card, Field, Input, LinkButton, LoadingCard, PageHeader, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, missionTypeOptions, requiredLevelLabels, requiredLevelOptions } from '@/lib/labels';
import {
  acceptedMissionTypeOptions,
  cityOptions,
  durationOptions,
  equipmentOptions,
  establishmentDepartmentOptions,
  mobilityOptions,
  patientTypeOptions,
  refusedScheduleOptions,
  sectorOptions,
  secretaryTypeOptions,
  softwareOptions,
  specialtyOptions,
} from '@/lib/profile-options';
import type { Mission, MissionType, RequiredLevel } from '@/lib/types';

const steps = [
  { title: 'Format', helper: 'Format de la mission' },
  { title: 'Profil', helper: 'Niveaux de profil requis' },
  { title: 'Besoin', helper: 'Titre et spécialité' },
  { title: 'Description', helper: 'Description du poste' },
  { title: 'Contexte', helper: 'Service et logiciel' },
  { title: 'Secrétariat', helper: 'Secrétariat et patientèle' },
  { title: 'Cabinet', helper: 'Organisation et équipement' },
  { title: 'Infos sup', helper: 'Détails sur place' },
  { title: 'Lieu', helper: 'Ville et adresse' },
  { title: 'Accès', helper: 'Logement et transports' },
  { title: 'Planning', helper: 'Dates et horaires' },
  { title: 'Budget', helper: 'Rémunération et durée' },
  { title: 'Critères', helper: 'Mobilité et durées' },
  { title: 'Préférences', helper: 'Logiciel et patientèle' },
  { title: 'Publication', helper: 'Tags et visibilité' },
  { title: 'Récap', helper: 'Validation finale' },
];

const initialForm = {
  missionType: 'GARDE' as MissionType,
  requiredLevel: 'INTERN' as RequiredLevel,
  requiredLevels: ['INTERN'] as RequiredLevel[],
  compensationMode: 'RETROCESSION',
  compensationCurrency: 'EUR',
  publishNow: true,
};

function sectorLabel(value?: string | null) {
  return sectorOptions.find((option) => option.value === value)?.label || value || '-';
}

export default function NewMissionPage() {
  const { establishments, primary, loading } = useEstablishments();
  const [form, setForm] = useState<any>(initialForm);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState('');
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [createdMission, setCreatedMission] = useState<Mission | null>(null);
  const [saving, setSaving] = useState(false);

  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);
  const isLastStep = step === steps.length - 1;
  const selectedEstablishment = useMemo(
    () => establishments.find((item) => item.id === selectedEstablishmentId) || primary,
    [establishments, primary, selectedEstablishmentId],
  );

  useEffect(() => {
    if (!primary || selectedEstablishmentId) return;
    setSelectedEstablishmentId(primary.id);
  }, [primary, selectedEstablishmentId]);

  useEffect(() => {
    if (!selectedEstablishment) return;

    setForm((current: any) => ({
      ...current,
      city: current.city || selectedEstablishment.city || '',
      location: current.location || selectedEstablishment.address || '',
      sector: selectedEstablishment.sector || '',
      patientType: selectedEstablishment.patientType || '',
      softwareUsed: selectedEstablishment.softwareUsed || '',
      hasSecretary: selectedEstablishment.hasSecretary,
      secretaryType: current.secretaryType || selectedEstablishment.secretaryType || '',
      averagePatientsPerDay: current.averagePatientsPerDay ?? selectedEstablishment.averagePatientsPerDay ?? '',
      isMultidisciplinary: current.isMultidisciplinary ?? selectedEstablishment.isMultidisciplinary,
      equipmentAvailable: current.equipmentAvailable?.length ? current.equipmentAvailable : selectedEstablishment.equipmentAvailable || [],
    }));
  }, [selectedEstablishment]);

  function set(name: string, value: unknown) {
    setForm((p: any) => ({ ...p, [name]: value }));
  }

  function validateCurrentStep() {
    if (step === 2 && (!form.title || !form.specialty)) {
      return 'Ajoutez un titre et une spécialité pour continuer.';
    }
    if (step === 8 && !form.city) {
      return 'Indiquez au moins la ville de la mission.';
    }
    if (step === 10) {
      if (!form.startDate) return 'Choisissez une date de début.';
      if (form.endDate && form.endDate < form.startDate) return 'La date de fin doit être après la date de début.';
    }
    if (step === 11 && (form.compensationMode || 'RETROCESSION') === 'RETROCESSION' && !form.retrocessionPercentage) {
      return 'Indiquez le pourcentage de rétrocession.';
    }
    return null;
  }

  function next() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setStep((value) => Math.min(value + 1, steps.length - 1));
  }

  function previous() {
    setError(null);
    setStep((value) => Math.max(value - 1, 0));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isLastStep) {
      next();
      return;
    }

    setSaving(true);
    setError(null);

    const payload = {
      ...form,
      establishmentId: selectedEstablishment?.id,
      requiredLevel: form.requiredLevels?.[0] || form.requiredLevel,
      requiredLevels: form.requiredLevels?.length ? form.requiredLevels : [form.requiredLevel],
      compensationMode: 'RETROCESSION',
      durationHours: form.durationHours ? Number(form.durationHours) : undefined,
      retrocessionPercentage: form.retrocessionPercentage ? Number(form.retrocessionPercentage) : undefined,
      compensationAmount: undefined,
      secretaryType: form.secretaryType || undefined,
      averagePatientsPerDay: form.averagePatientsPerDay === '' || form.averagePatientsPerDay == null ? undefined : Number(form.averagePatientsPerDay),
      isMultidisciplinary: form.isMultidisciplinary,
      equipmentAvailable: cleanArray(form.equipmentAvailable),
      mobilityOptions: cleanArray(form.mobilityOptions),
      acceptedMissionTypes: cleanArray(form.acceptedMissionTypes),
      minimumCompensation: form.minimumCompensation === '' || form.minimumCompensation == null ? undefined : Number(form.minimumCompensation),
      preferredDurations: cleanArray(form.preferredDurations),
      refusedSchedules: cleanArray(form.refusedSchedules),
      acceptedPatientTypes: cleanArray(form.acceptedPatientTypes),
      knownSoftware: cleanArray(form.knownSoftware),
      tags: String(form.tagsText || '').split(',').map((x) => x.trim()).filter(Boolean),
    };
    delete payload.tagsText;

    try {
      const mission = await api.post<Mission>('/missions', payload);
      setCreatedMission(mission);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function resetWizard() {
    setForm(initialForm);
    setStep(0);
    setError(null);
    setCreatedMission(null);
  }

  if (loading) return <LoadingCard />;

  if (establishments.length === 0) {
    return (
      <>
        <PageHeader
          title="Créer une mission"
          description="Un établissement est requis avant de pouvoir publier une mission."
        />
        <Card className="card-highlight">
          <h2>Aucun établissement rattaché</h2>
          <p>Créez d'abord une fiche établissement. Elle permettra de rattacher la mission, de pré-remplir la ville et le lieu, puis de recevoir les candidatures au bon endroit.</p>
          <LinkButton href="/establishment/onboarding">Créer mon établissement</LinkButton>
        </Card>
      </>
    );
  }

  if (createdMission) {
    return (
      <>
        <PageHeader
          title="Mission créée"
          description={createdMission.status === 'PUBLISHED' ? 'Le lien public est prêt à être partagé.' : 'La mission est en brouillon. Le lien public sera accessible après publication.'}
        />
        <Card className="card-highlight">
          <h2>{createdMission.title}</h2>
          <p>Copiez ce lien pour le partager avec un candidat ou dans un message.</p>
          <MissionShareActions missionId={createdMission.id} showUrl showPublicLink={false} />
          <div className="actions" style={{ marginTop: 12 }}>
            <LinkButton href="/establishment/missions">Voir mes missions</LinkButton>
            <Button type="button" variant="light" onClick={resetWizard}>Créer une autre mission</Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <div className="new-mission-page">
      <PageHeader
        title="Créer une mission"
        description={selectedEstablishment ? `Établissement : ${selectedEstablishment.name}` : 'Choisissez un établissement pour rattacher la mission.'}
      />
      <div className="wizard-layout">
        <Card className="wizard-panel">
          <div className="wizard-progress">
            <div className="toolbar">
              <div>
                <Badge tone="neutral">Étape {step + 1}/{steps.length}</Badge>
                <strong className="wizard-current-step">{steps[step].title}</strong>
                <span className="small">{steps[step].helper}</span>
              </div>
              <span className="small">{progress}% complété</span>
            </div>
            <div className="progress" aria-label={`Progression ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>

          <form className="form wizard-form" onSubmit={submit}>
            {error ? <Alert type="error">{error}</Alert> : null}
            <Field label="Établissement rattaché">
              <Select
                required
                value={selectedEstablishmentId}
                onChange={(e) => {
                  const next = establishments.find((item) => item.id === e.target.value);
                  setSelectedEstablishmentId(e.target.value);
                  setForm((current: any) => ({
                    ...current,
                    city: next?.city || current.city || '',
                    location: next?.address || current.location || '',
                    sector: next?.sector || '',
                    patientType: next?.patientType || '',
                    softwareUsed: next?.softwareUsed || '',
                    hasSecretary: next?.hasSecretary,
                    secretaryType: next?.secretaryType || '',
                    averagePatientsPerDay: next?.averagePatientsPerDay ?? '',
                    isMultidisciplinary: next?.isMultidisciplinary,
                    equipmentAvailable: next?.equipmentAvailable || [],
                  }));
                }}
              >
                {establishments.map((establishment) => (
                  <option key={establishment.id} value={establishment.id}>
                    {establishment.name}{establishment.city ? ` - ${establishment.city}` : ''}
                  </option>
                ))}
              </Select>
            </Field>
            <StepContent step={step} form={form} set={set} />
            <div className="wizard-actions">
              <Button type="button" variant="light" disabled={step === 0 || saving} onClick={previous}>Retour</Button>
              <Button disabled={saving}>{isLastStep ? (saving ? 'Création...' : 'Créer la mission') : 'Continuer'}</Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function StepContent({ step, form, set }: { step: number; form: any; set: (name: string, value: unknown) => void }) {
  if (step === 0) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Quel type de mission voulez-vous publier ?</h2>
          <p>Choisissez le format de la mission.</p>
        </div>
        <ChoiceSection title="Type de mission">
          <ChoiceGrid
            value={form.missionType}
            options={missionTypeOptions}
            onChange={(value) => set('missionType', value)}
          />
        </ChoiceSection>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Types de profils recherchés</h2>
          <p>Choisissez le niveau attendu pour cadrer la recherche des candidats.</p>
        </div>
        <ChoiceSection title="Types de profils recherchés">
          <MultiChoiceGrid
            values={form.requiredLevels || []}
            options={requiredLevelOptions}
            onChange={(values) => {
              set('requiredLevels', values);
              set('requiredLevel', values[0]);
            }}
          />
        </ChoiceSection>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Résumez le besoin médical</h2>
          <p>Un titre clair et une spécialité précise aident les bons profils à se projeter.</p>
        </div>
        <Field label="Titre de la mission">
          <Input required value={form.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Garde aux urgences - nuit" />
        </Field>
        <SingleChoiceField required label="Spécialité" value={form.specialty || ''} options={specialtyOptions} onChange={(value) => set('specialty', value)} />
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Description de la mission</h2>
          <p>Précisez les attentes générales ou le type d'activité.</p>
        </div>
        <Field label="Description">
          <Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Contexte, équipe sur place, attentes principales..." />
        </Field>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Service et outils</h2>
          <p>Indiquez le cadre de travail et les logiciels utilisés au quotidien.</p>
        </div>
        <MultiChoiceTextField label="Département / service / type de cabinet" value={form.departmentInfo || ''} options={establishmentDepartmentOptions} onChange={(value) => set('departmentInfo', value)} />
        <MultiChoiceTextField label="Logiciel utilisé" value={form.softwareUsed || ''} options={softwareOptions} onChange={(value) => set('softwareUsed', value)} />
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Secrétariat et patientèle</h2>
          <p>Indiquez la présence de secrétariat et le type de patients.</p>
        </div>
        <Field label="Présence de secrétaire">
          <Select
            value={form.hasSecretary === true ? 'true' : form.hasSecretary === false ? 'false' : ''}
            onChange={(e) => set('hasSecretary', e.target.value === '' ? undefined : e.target.value === 'true')}
          >
            <option value="">Non précisé</option>
            <option value="true">Oui</option>
            <option value="false">Non</option>
          </Select>
        </Field>
        <SingleChoiceField label="Type de secretariat" value={form.secretaryType || ''} options={secretaryTypeOptions} onChange={(value) => set('secretaryType', value)} />
        <MultiChoiceTextField label="Type de patientèle" value={form.patientType || ''} options={patientTypeOptions} onChange={(value) => set('patientType', value)} />
      </div>
    );
  }

  if (step === 6) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Activité et équipement</h2>
          <p>Indiquez la charge moyenne de travail et le matériel disponible.</p>
        </div>
        <div className="form-row">
          <Field label="Patients par jour en moyenne">
            <Input type="number" min={0} value={form.averagePatientsPerDay ?? ''} onChange={(e) => set('averagePatientsPerDay', e.target.value)} placeholder="Ex : 25" />
          </Field>
          <Field label="Cabinet pluridisciplinaire">
            <Select
              value={form.isMultidisciplinary === true ? 'true' : form.isMultidisciplinary === false ? 'false' : ''}
              onChange={(e) => set('isMultidisciplinary', e.target.value === '' ? undefined : e.target.value === 'true')}
            >
              <option value="">Non precise</option>
              <option value="true">Oui</option>
              <option value="false">Non</option>
            </Select>
          </Field>
        </div>
        <MultiChoiceField label="Materiel disponible" values={safeArray(form.equipmentAvailable)} options={equipmentOptions} onChange={(values) => set('equipmentAvailable', values)} />
      </div>
    );
  }

  if (step === 7) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Informations complémentaires</h2>
          <p>Ajoutez des détails sur l'équipe présente ou le matériel disponible.</p>
        </div>
        <Field label="Équipe sur place">
          <Textarea value={form.teamInfo || ''} onChange={(e) => set('teamInfo', e.target.value)} placeholder="Médecin senior joignable, IDE de nuit, secrétariat présent..." />
        </Field>
        <Field label="Matériel disponible">
          <Textarea value={form.equipmentInfo || ''} onChange={(e) => set('equipmentInfo', e.target.value)} placeholder="Échographe, radio, box dédiés, aide opératoire..." />
        </Field>
      </div>
    );
  }

  if (step === 8) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Où se déroule la mission ?</h2>
          <p>La ville est visible publiquement. Le lieu précis peut rester sobre si besoin.</p>
        </div>
        <SingleChoiceField required label="Ville" value={form.city || ''} options={cityOptions} onChange={(value) => set('city', value)} />
        <SingleChoiceField label="Secteur conventionné" value={form.sector || ''} options={sectorOptions} onChange={(value) => set('sector', value)} />
        <Field label="Lieu précis">
          <Input value={form.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="Service, adresse ou site" />
        </Field>
      </div>
    );
  }

  if (step === 9) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Hébergement et accès</h2>
          <p>Précisez les conditions d'accueil et d'accès pour les candidats.</p>
        </div>
        <ChoiceSection title="Options d'accueil">
          <BooleanChoice
            label="Logement proposé"
            value={form.accommodationProvided}
            onChange={(value) => set('accommodationProvided', value)}
          />
          <BooleanChoice
            label="Parking disponible"
            value={form.parkingAvailable}
            onChange={(value) => set('parkingAvailable', value)}
          />
        </ChoiceSection>
        <Field label="Infos pratiques d'accès">
          <Textarea value={form.practicalInfo || ''} onChange={(e) => set('practicalInfo', e.target.value)} placeholder="Accès badge, entrée de nuit, transports, contact à l'arrivée..." />
        </Field>
      </div>
    );
  }

  if (step === 10) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Quel est le planning ?</h2>
          <p>Indiquez les dates et horaires utiles pour éviter les allers-retours.</p>
        </div>
        <div className="form-row">
          <Field label="Date début"><Input type="date" required value={form.startDate || ''} onChange={(e) => set('startDate', e.target.value)} /></Field>
          <Field label="Date fin"><Input type="date" value={form.endDate || ''} onChange={(e) => set('endDate', e.target.value)} /></Field>
        </div>
        <div className="form-row">
          <Field label="Heure début">
            <Input type="time" value={form.startTime || ''} onChange={(e) => set('startTime', e.target.value)} />
          </Field>
          <Field label="Heure fin">
            <Input type="time" value={form.endTime || ''} onChange={(e) => set('endTime', e.target.value)} />
          </Field>
        </div>
      </div>
    );
  }

  if (step === 11) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Durée et rémunération</h2>
          <p>Indiquez la durée de la mission et le taux de rétrocession.</p>
        </div>
        <Field label="Durée estimée en heures">
          <Input type="number" min={1} max={72} value={form.durationHours || ''} onChange={(e) => set('durationHours', e.target.value)} />
        </Field>
        <SingleChoiceField label="Format de durée" value={form.preferredDuration || ''} options={durationOptions} onChange={(value) => set('preferredDuration', value)} />
        <Field label="Pourcentage de rétrocession">
          <Input type="number" min={1} max={100} value={form.retrocessionPercentage || ''} onChange={(e) => set('retrocessionPercentage', e.target.value)} placeholder="70" />
        </Field>
      </div>
    );
  }

  if (step === 12) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Critères de profil (1/2)</h2>
          <p>Définissez les préférences de mobilité et les durées idéales.</p>
        </div>
        <MultiChoiceField label="Mobilite utile" values={safeArray(form.mobilityOptions)} options={mobilityOptions} onChange={(values) => set('mobilityOptions', values)} />
        <MultiChoiceField label="Durées proposées" values={safeArray(form.preferredDurations)} options={durationOptions} onChange={(values) => set('preferredDurations', values)} />
        <MultiChoiceField label="Horaires non proposes" values={safeArray(form.refusedSchedules)} options={refusedScheduleOptions} onChange={(values) => set('refusedSchedules', values)} />
      </div>
    );
  }

  if (step === 13) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Critères de profil (2/2)</h2>
          <p>Indiquez la patientèle acceptée, les logiciels requis et la rémunération minimale.</p>
        </div>
        <MultiChoiceField label="Patienteles acceptees" values={safeArray(form.acceptedPatientTypes)} options={patientTypeOptions} onChange={(values) => set('acceptedPatientTypes', values)} />
        <MultiChoiceField label="Logiciels utiles" values={safeArray(form.knownSoftware)} options={softwareOptions} onChange={(values) => set('knownSoftware', values)} />
        <Field label="Remuneration minimale indicative (EUR)">
          <Input type="number" min={0} value={form.minimumCompensation ?? ''} onChange={(e) => set('minimumCompensation', e.target.value)} placeholder="Ex : 600" />
        </Field>
      </div>
    );
  }

  if (step === 14) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Mode de publication</h2>
          <p>Ajoutez quelques tags de recherche, puis choisissez le statut de publication.</p>
        </div>
        <Field label="Tags, séparés par virgule">
          <Input value={form.tagsText || ''} onChange={(e) => set('tagsText', e.target.value)} placeholder="urgent, nuit, week-end" />
        </Field>
        <MultiChoiceField label="Types de missions associés" values={form.acceptedMissionTypes || []} options={acceptedMissionTypeOptions} onChange={(values) => set('acceptedMissionTypes', values)} />
        <div className="publish-choice">
          <button type="button" className={form.publishNow ? 'active' : ''} onClick={() => set('publishNow', true)}>
            <strong>Publier maintenant</strong>
            <span>La mission sera visible et partageable tout de suite.</span>
          </button>
          <button type="button" className={!form.publishNow ? 'active' : ''} onClick={() => set('publishNow', false)}>
            <strong>Garder en brouillon</strong>
            <span>Vous pourrez finaliser avant de la rendre publique.</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step-content">
      <div>
        <h2>Vérifiez avant publication</h2>
        <p>Si tout est bon, créez la mission. Le lien partageable sera affiché juste après.</p>
      </div>
      <MissionDraftSummary form={form} compact />
    </div>
  );
}

function ChoiceSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="choice-section">
      <div className="choice-section-title">{title}</div>
      {children}
    </section>
  );
}

function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function cleanArray(value: unknown): string[] {
  return safeArray(value).map((item) => item.trim()).filter(Boolean);
}

function ChoiceGrid({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <div className="choice-grid">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={value === option.value ? 'active' : ''}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function MultiChoiceGrid({
  values,
  options,
  onChange,
}: {
  values: string[];
  options: Array<{ value: string; label: string }>;
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    const next = values.includes(value)
      ? values.filter((item) => item !== value)
      : [...values, value];

    onChange(next.length ? next : values);
  }

  return (
    <div className="choice-grid">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          className={values.includes(option.value) ? 'active' : ''}
          aria-pressed={values.includes(option.value)}
          onClick={() => toggle(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function BooleanChoice({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="boolean-choice">
      <span>{label}</span>
      <div className="segmented-control">
        <button
          type="button"
          className={value === true ? 'active' : ''}
          onClick={() => onChange(true)}
        >
          Oui
        </button>
        <button
          type="button"
          className={value === false ? 'active' : ''}
          onClick={() => onChange(false)}
        >
          Non
        </button>
      </div>
    </div>
  );
}

function MissionDraftSummary({ form, compact = false }: { form: any; compact?: boolean }) {
  const tags = String(form.tagsText || '').split(',').map((x) => x.trim()).filter(Boolean);

  return (
    <Card className={`mission-draft-summary ${compact ? 'compact' : 'card-highlight'}`}>
      <div className="summary-head">
        <span className="small">Aperçu mission</span>
        <Badge tone={form.publishNow ? 'success' : 'warning'}>{form.publishNow ? 'Publication' : 'Brouillon'}</Badge>
      </div>
      <h2>{form.title || 'Titre à définir'}</h2>
      <div className="tag-list">
        <Badge>{missionTypeLabel(form.missionType)}</Badge>
        <Badge tone="neutral">{requiredLevelLabels(form.requiredLevels, form.requiredLevel)}</Badge>
        {tags.map((tag) => <Badge key={tag} tone="neutral">#{tag}</Badge>)}
      </div>
      <div className="info-list">
        <div><span>Spécialité</span><strong>{form.specialty || '-'}</strong></div>
        <div><span>Ville</span><strong>{form.city || '-'}</strong></div>
        <div><span>Secteur conventionné</span><strong>{sectorLabel(form.sector)}</strong></div>
        <div><span>Patientèle</span><strong>{form.patientType || '-'}</strong></div>
        <div><span>Logiciel</span><strong>{form.softwareUsed || '-'}</strong></div>
        <div><span>Secrétaire</span><strong>{form.hasSecretary === undefined || form.hasSecretary === null ? '-' : form.hasSecretary ? 'Oui' : 'Non'}</strong></div>
        <div><span>Service</span><strong>{form.departmentInfo || '-'}</strong></div>
        <div><span>Date</span><strong>{form.startDate ? formatDate(form.startDate) : '-'}</strong></div>
        <div><span>Horaire</span><strong>{form.startTime || '-'} {form.endTime ? `- ${form.endTime}` : ''}</strong></div>
        <div><span>Durée</span><strong>{form.durationHours ? `${form.durationHours} h` : '-'}</strong></div>
        <div><span>Rémunération</span><strong>{formatCompensation({
          compensationMode: 'RETROCESSION',
          retrocessionPercentage: form.retrocessionPercentage ? Number(form.retrocessionPercentage) : null,
          compensationAmount: null,
          compensationCurrency: form.compensationCurrency || 'EUR',
        })}</strong></div>
        <div><span>Logement</span><strong>{form.accommodationProvided === undefined ? '-' : form.accommodationProvided ? 'Oui' : 'Non'}</strong></div>
        <div><span>Parking</span><strong>{form.parkingAvailable === undefined ? '-' : form.parkingAvailable ? 'Oui' : 'Non'}</strong></div>
      </div>
    </Card>
  );
}
