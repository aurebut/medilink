'use client';

import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { MissionShareActions } from '@/components/MissionShareActions';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Alert, Badge, Button, Card, Field, Input, LinkButton, LoadingCard, PageHeader, Select, Textarea } from '@/components/ui';
import { api } from '@/lib/api';
import { formatDate, formatMoney } from '@/lib/format';
import { missionTypeLabel, missionTypeOptions, requiredLevelLabel, requiredLevelOptions } from '@/lib/labels';
import type { Mission, MissionType, RequiredLevel } from '@/lib/types';

const steps = [
  { title: 'Type', helper: 'Cadre de la mission' },
  { title: 'Besoin', helper: 'Titre et specialite' },
  { title: 'Lieu', helper: 'Ville et adresse' },
  { title: 'Planning', helper: 'Dates et horaires' },
  { title: 'Budget', helper: 'Remuneration' },
  { title: 'Publication', helper: 'Visibilite' },
  { title: 'Recap', helper: 'Validation finale' },
];

const initialForm = {
  missionType: 'GARDE' as MissionType,
  requiredLevel: 'INTERN' as RequiredLevel,
  compensationCurrency: 'EUR',
  publishNow: true,
};

const startTimePresets = ['08:00', '09:00', '14:00', '20:00'];
const endTimePresets = ['12:00', '17:00', '20:00', '08:00'];

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
      return 'Ajoute un titre et une specialite pour continuer.';
    }
    if (step === 2 && !form.city) {
      return 'Indique au moins la ville de la mission.';
    }
    if (step === 3) {
      if (!form.startDate) return 'Choisis une date de debut.';
      if (form.endDate && form.endDate < form.startDate) return 'La date de fin doit etre apres la date de debut.';
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
      durationHours: form.durationHours ? Number(form.durationHours) : undefined,
      compensationAmount: form.compensationAmount ? Number(form.compensationAmount) : undefined,
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
          title="Creer une mission"
          description="Un etablissement est requis avant de pouvoir publier une mission."
        />
        <Card className="card-highlight">
          <h2>Aucun etablissement rattache</h2>
          <p>Cree d'abord une fiche etablissement. Elle permettra de rattacher la mission, de pre-remplir la ville et le lieu, puis de recevoir les candidatures au bon endroit.</p>
          <LinkButton href="/establishment/onboarding">Creer mon etablissement</LinkButton>
        </Card>
      </>
    );
  }

  if (createdMission) {
    return (
      <>
        <PageHeader
          title="Mission creee"
          description={createdMission.status === 'PUBLISHED' ? 'Le lien public est pret a etre partage.' : 'La mission est en brouillon. Le lien public sera accessible apres publication.'}
        />
        <Card className="card-highlight">
          <h2>{createdMission.title}</h2>
          <p>Copie ce lien pour le partager avec un candidat ou dans un message.</p>
          <MissionShareActions missionId={createdMission.id} showUrl showPublicLink={false} />
          <div className="actions" style={{ marginTop: 12 }}>
            <LinkButton href="/establishment/missions">Voir mes missions</LinkButton>
            <Button type="button" variant="light" onClick={resetWizard}>Creer une autre mission</Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Creer une mission"
        description={selectedEstablishment ? `Etablissement : ${selectedEstablishment.name}` : 'Choisis un etablissement pour rattacher la mission.'}
      />
      <div className="wizard-layout">
        <Card className="wizard-panel">
          <div className="wizard-progress">
            <div className="toolbar">
              <div>
                <Badge tone="neutral">Etape {step + 1}/{steps.length}</Badge>
                <strong className="wizard-current-step">{steps[step].title}</strong>
                <span className="small">{steps[step].helper}</span>
              </div>
              <span className="small">{progress}% complete</span>
            </div>
            <div className="progress" aria-label={`Progression ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>

          <form className="form wizard-form" onSubmit={submit}>
            {error ? <Alert type="error">{error}</Alert> : null}
            <Field label="Etablissement rattache">
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
              <Button disabled={saving}>{isLastStep ? (saving ? 'Creation...' : 'Creer la mission') : 'Continuer'}</Button>
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
        <ChoiceSection title="Type de profil demande">
          <ChoiceGrid
            value={form.requiredLevel}
            options={requiredLevelOptions}
            onChange={(value) => set('requiredLevel', value)}
          />
        </ChoiceSection>
      </div>
    );
  }

  if (step === 1) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Resume le besoin medical</h2>
          <p>Un titre clair et une specialite precise aident les bons profils a se projeter.</p>
        </div>
        <Field label="Titre de la mission">
          <Input required value={form.title || ''} onChange={(e) => set('title', e.target.value)} placeholder="Garde aux urgences - nuit" />
        </Field>
        <Field label="Specialite">
          <Input required value={form.specialty || ''} onChange={(e) => set('specialty', e.target.value)} placeholder="Urgences, medecine generale..." />
        </Field>
        <Field label="Description">
          <Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Contexte, equipe sur place, attentes principales..." />
        </Field>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Ou se deroule la mission ?</h2>
          <p>La ville est visible publiquement. Le lieu precis peut rester sobre si besoin.</p>
        </div>
        <Field label="Ville">
          <Input required value={form.city || ''} onChange={(e) => set('city', e.target.value)} placeholder="Lyon" />
        </Field>
        <Field label="Lieu precis">
          <Input value={form.location || ''} onChange={(e) => set('location', e.target.value)} placeholder="Service, adresse ou site" />
        </Field>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Quel est le planning ?</h2>
          <p>Indique les dates et horaires utiles pour eviter les allers-retours.</p>
        </div>
        <div className="form-row">
          <Field label="Date debut"><Input type="date" required value={form.startDate || ''} onChange={(e) => set('startDate', e.target.value)} /></Field>
          <Field label="Date fin"><Input type="date" value={form.endDate || ''} onChange={(e) => set('endDate', e.target.value)} /></Field>
        </div>
        <div className="form-row">
          <TimeField
            label="Heure debut"
            value={form.startTime || ''}
            presets={startTimePresets}
            placeholder="08:00"
            onChange={(value) => set('startTime', value)}
          />
          <TimeField
            label="Heure fin"
            value={form.endTime || ''}
            presets={endTimePresets}
            placeholder="20:00"
            onChange={(value) => set('endTime', value)}
          />
        </div>
        <Field label="Duree estimee en heures">
          <Input type="number" min={1} max={72} value={form.durationHours || ''} onChange={(e) => set('durationHours', e.target.value)} />
        </Field>
      </div>
    );
  }

  if (step === 4) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Quelle remuneration afficher ?</h2>
          <p>Le montant peut rester indicatif, mais il rend la mission beaucoup plus lisible.</p>
        </div>
        <div className="form-row">
          <Field label="Montant">
            <Input type="number" min={0} value={form.compensationAmount || ''} onChange={(e) => set('compensationAmount', e.target.value)} placeholder="650" />
          </Field>
          <Field label="Devise">
            <Input value={form.compensationCurrency || 'EUR'} onChange={(e) => set('compensationCurrency', e.target.value.toUpperCase())} />
          </Field>
        </div>
      </div>
    );
  }

  if (step === 5) {
    return (
      <div className="wizard-step-content">
        <div>
          <h2>Comment veux-tu la publier ?</h2>
          <p>Ajoute quelques tags pour la recherche, puis choisis publication immediate ou brouillon.</p>
        </div>
        <Field label="Tags, separes par virgule">
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
        <h2>Verifie avant publication</h2>
        <p>Si tout est bon, cree la mission. Le lien partageable sera affiche juste apres.</p>
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

function TimeField({
  label,
  value,
  presets,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  presets: string[];
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label}>
      <Input value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
      <div className="time-presets" aria-label={`Raccourcis ${label.toLowerCase()}`}>
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            className={value === preset ? 'active' : ''}
            onClick={() => onChange(preset)}
          >
            {preset}
          </button>
        ))}
      </div>
    </Field>
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

function MissionDraftSummary({ form, compact = false }: { form: any; compact?: boolean }) {
  const tags = String(form.tagsText || '').split(',').map((x) => x.trim()).filter(Boolean);

  return (
    <Card className={`mission-draft-summary ${compact ? 'compact' : 'card-highlight'}`}>
      <div className="summary-head">
        <span className="small">Apercu mission</span>
        <Badge tone={form.publishNow ? 'success' : 'warning'}>{form.publishNow ? 'Publication' : 'Brouillon'}</Badge>
      </div>
      <h2>{form.title || 'Titre a definir'}</h2>
      <div className="tag-list">
        <Badge>{missionTypeLabel(form.missionType)}</Badge>
        <Badge tone="neutral">{requiredLevelLabel(form.requiredLevel)}</Badge>
        {tags.map((tag) => <Badge key={tag} tone="neutral">#{tag}</Badge>)}
      </div>
      <div className="info-list">
        <div><span>Specialite</span><strong>{form.specialty || '-'}</strong></div>
        <div><span>Ville</span><strong>{form.city || '-'}</strong></div>
        <div><span>Date</span><strong>{form.startDate ? formatDate(form.startDate) : '-'}</strong></div>
        <div><span>Horaire</span><strong>{form.startTime || '-'} {form.endTime ? `- ${form.endTime}` : ''}</strong></div>
        <div><span>Duree</span><strong>{form.durationHours ? `${form.durationHours} h` : '-'}</strong></div>
        <div><span>Remuneration</span><strong>{formatMoney(form.compensationAmount ? Number(form.compensationAmount) : null, form.compensationCurrency || 'EUR')}</strong></div>
      </div>
    </Card>
  );
}
