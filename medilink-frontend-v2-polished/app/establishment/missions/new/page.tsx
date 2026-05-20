'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { MissionShareActions } from '@/components/MissionShareActions';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Alert, Badge, Button, Card, Field, Input, LinkButton, LoadingCard, PageHeader, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, missionTypeOptions, requiredLevelLabels, requiredLevelOptions } from '@/lib/labels';
import type { Mission, MissionType, RequiredLevel } from '@/lib/types';

const steps = [
  { title: 'Type', helper: 'Cadre de la mission' },
  { title: 'Besoin', helper: 'Titre et spécialité' },
  { title: 'Contexte', helper: 'Logiciel et équipe' },
  { title: 'Lieu', helper: 'Ville et adresse' },
  { title: 'Planning', helper: 'Dates et horaires' },
  { title: 'Budget', helper: 'Rémunération' },
  { title: 'Publication', helper: 'Visibilité' },
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
    }));
  }, [selectedEstablishment]);

  function set(name: string, value: unknown) {
    setForm((p: any) => ({ ...p, [name]: value }));
  }

  function validateCurrentStep() {
    if (step === 1 && (!form.title || !form.specialty)) {
      return 'Ajoute un titre et une spécialité pour continuer.';
    }
    if (step === 3 && !form.city) {
      return 'Indique au moins la ville de la mission.';
    }
    if (step === 4) {
      if (!form.startDate) return 'Choisis une date de début.';
      if (form.endDate && form.endDate < form.startDate) return 'La date de fin doit être après la date de début.';
    }
    if (step === 5 && (form.compensationMode || 'RETROCESSION') === 'RETROCESSION' && !form.retrocessionPercentage) {
      return 'Indique le pourcentage de rétrocession.';
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
          <p>Crée d'abord une fiche établissement. Elle permettra de rattacher la mission, de pré-remplir la ville et le lieu, puis de recevoir les candidatures au bon endroit.</p>
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
          <p>Copie ce lien pour le partager avec un candidat ou dans un message.</p>
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
    <>
      <PageHeader
        title="Créer une mission"
        description={selectedEstablishment ? `Établissement : ${selectedEstablishment.name}` : 'Choisis un établissement pour rattacher la mission.'}
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
    </>
  );
}

function StepContent({ step, form, set }: { step: number; form: any; set: (name: string, value: unknown) => void }) {
  if (step === 0) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Quel type de mission veux-tu publier ?</h2>
          <p>Choisis le format et le niveau attendu pour cadrer la recherche des candidats.</p>
        </div>
        <ChoiceSection title="Type de mission">
          <ChoiceGrid
            value={form.missionType}
            options={missionTypeOptions}
            onChange={(value) => set('missionType', value)}
          />
        </ChoiceSection>
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

  if (step === 1) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Résume le besoin médical</h2>
          <p>Un titre clair et une spécialité précise aident les bons profils à se projeter.</p>
        </div>
        <Field label="Titre de la mission">
          <Input required value={form.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Garde aux urgences - nuit" />
        </Field>
        <Field label="Spécialité">
          <Input required value={form.specialty || ''} onChange={(e) => set('specialty', e.target.value)} placeholder="Urgences, médecine générale..." />
        </Field>
        <Field label="Description">
          <Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Contexte, équipe sur place, attentes principales..." />
        </Field>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Ajoute le contexte terrain</h2>
          <p>Ces informations aident le candidat à comprendre l'environnement avant de postuler.</p>
        </div>
        <Field label="Logiciel utilisé">
          <Input value={form.softwareUsed || ''} onChange={(e) => set('softwareUsed', e.target.value)} placeholder="Doctolib, Orbis, Hôpital Manager..." />
        </Field>
        <Field label="Service ou unité">
          <Input value={form.departmentInfo || ''} onChange={(e) => set('departmentInfo', e.target.value)} placeholder="Urgences adultes, bloc ambulatoire, cabinet de groupe..." />
        </Field>
        <Field label="Équipe sur place">
          <Textarea value={form.teamInfo || ''} onChange={(e) => set('teamInfo', e.target.value)} placeholder="Médecin senior joignable, IDE de nuit, secrétariat présent..." />
        </Field>
        <Field label="Matériel disponible">
          <Textarea value={form.equipmentInfo || ''} onChange={(e) => set('equipmentInfo', e.target.value)} placeholder="Échographe, radio, box dédiés, aide opératoire..." />
        </Field>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Où se déroule la mission ?</h2>
          <p>La ville est visible publiquement. Le lieu précis peut rester sobre si besoin.</p>
        </div>
        <Field label="Ville">
          <Input required value={form.city || ''} onChange={(e) => set('city', e.target.value)} placeholder="Lyon" />
        </Field>
        <Field label="Lieu précis">
          <Input value={form.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="Service, adresse ou site" />
        </Field>
        <Field label="Infos pratiques d'accès">
          <Textarea value={form.practicalInfo || ''} onChange={(e) => set('practicalInfo', e.target.value)} placeholder="Accès badge, entrée de nuit, transports, contact à l'arrivée..." />
        </Field>
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
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Quel est le planning ?</h2>
          <p>Indique les dates et horaires utiles pour éviter les allers-retours.</p>
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
        <Field label="Durée estimée en heures">
          <Input type="number" min={1} max={72} value={form.durationHours || ''} onChange={(e) => set('durationHours', e.target.value)} />
        </Field>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Quel mode de rémunération afficher ?</h2>
          <p>Indique le pourcentage de rétrocession d'honoraires affiché aux candidats.</p>
        </div>
        <Field label="Pourcentage de rétrocession">
          <Input type="number" min={1} max={100} value={form.retrocessionPercentage || ''} onChange={(e) => set('retrocessionPercentage', e.target.value)} placeholder="70" />
        </Field>
      </div>
    );
  }

  if (step === 6) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Comment veux-tu la publier ?</h2>
          <p>Ajoute quelques tags pour la recherche, puis choisis publication immédiate ou brouillon.</p>
        </div>
        <Field label="Tags, séparés par virgule">
          <Input value={form.tagsText || ''} onChange={(e) => set('tagsText', e.target.value)} placeholder="urgent, nuit, week-end" />
        </Field>
        <div className="publish-choice">
          <button type="button" className={form.publishNow ? 'active' : ''} onClick={() => set('publishNow', true)}>
            <strong>Publier maintenant</strong>
            <span>La mission sera visible et partageable tout de suite.</span>
          </button>
          <button type="button" className={!form.publishNow ? 'active' : ''} onClick={() => set('publishNow', false)}>
            <strong>Garder en brouillon</strong>
            <span>Tu pourras finaliser avant de la rendre publique.</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="wizard-step-content">
      <div>
        <h2>Vérifie avant publication</h2>
        <p>Si tout est bon, crée la mission. Le lien partageable sera affiché juste après.</p>
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
        <div><span>Logiciel</span><strong>{form.softwareUsed || '-'}</strong></div>
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
