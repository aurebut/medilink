'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import type { Establishment, EstablishmentBillingStatus, Mission, MissionType, RequiredLevel } from '@/lib/types';

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
  durationHours: '8',
  retrocessionPercentage: '70',
  publishNow: true,
};

function tomorrowDateInput() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
}

function optionalText(value?: unknown) {
  const next = String(value || '').trim();
  return next || undefined;
}

function sectorLabel(value?: string | null) {
  return sectorOptions.find((option) => option.value === value)?.label || value || '-';
}

function dateInput(value?: string | null) {
  return value?.slice(0, 10) || '';
}

function findStoppedStep(form: any, establishment?: any) {
  const tomorrow = tomorrowDateInput();

  const isUnchanged = (stepIdx: number): boolean => {
    switch (stepIdx) {
      case 2:
        return (!form.title || form.title === 'Mission sans titre') &&
               (!form.specialty || form.specialty === 'Specialite a preciser');
      case 3:
        return !form.description;
      case 4:
        return !form.departmentInfo &&
               (!form.softwareUsed || (establishment && form.softwareUsed === establishment.softwareUsed));
      case 5:
        return (form.hasSecretary === undefined || form.hasSecretary === null || (establishment && form.hasSecretary === establishment.hasSecretary)) &&
               (!form.secretaryType || (establishment && form.secretaryType === establishment.secretaryType)) &&
               (!form.patientType || (establishment && form.patientType === establishment.patientType));
      case 6:
        return (!form.averagePatientsPerDay || (establishment && String(form.averagePatientsPerDay) === String(establishment.averagePatientsPerDay ?? ''))) &&
               (form.isMultidisciplinary === undefined || form.isMultidisciplinary === null || (establishment && form.isMultidisciplinary === establishment.isMultidisciplinary)) &&
               (!form.equipmentAvailable || form.equipmentAvailable.length === 0 || (establishment && JSON.stringify(form.equipmentAvailable) === JSON.stringify(establishment.equipmentAvailable || [])));
      case 7:
        return !form.teamInfo && !form.equipmentInfo;
      case 8:
        return (!form.city || form.city === 'Ville a preciser' || (establishment && form.city === establishment.city)) &&
               (!form.sector || (establishment && form.sector === establishment.sector)) &&
               (!form.location || (establishment && form.location === establishment.address));
      case 9:
        return (form.accommodationProvided === undefined || form.accommodationProvided === null) &&
               (form.parkingAvailable === undefined || form.parkingAvailable === null) &&
               !form.practicalInfo;
      case 10:
        return (!form.startDate || form.startDate === tomorrow) &&
               !form.endDate &&
               !form.startTime &&
               !form.endTime;
      case 11:
        return (!form.durationHours || form.durationHours === '8') &&
               !form.preferredDuration &&
               (!form.retrocessionPercentage || form.retrocessionPercentage === '70');
      case 12:
        return (!form.mobilityOptions || form.mobilityOptions.length === 0) &&
               (!form.preferredDurations || form.preferredDurations.length === 0) &&
               (!form.refusedSchedules || form.refusedSchedules.length === 0);
      case 13:
        return (!form.acceptedPatientTypes || form.acceptedPatientTypes.length === 0) &&
               (!form.knownSoftware || form.knownSoftware.length === 0) &&
               !form.minimumCompensation;
      case 14:
        return !form.tagsText &&
               (!form.acceptedMissionTypes || form.acceptedMissionTypes.length === 0);
      default:
        return true;
    }
  };

  // Find the first step s from 2 to 14 such that s and all steps after it are unchanged
  for (let s = 2; s <= 14; s++) {
    let allUnchangedAfter = true;
    for (let i = s; i <= 14; i++) {
      if (!isUnchanged(i)) {
        allUnchangedAfter = false;
        break;
      }
    }
    if (allUnchangedAfter) {
      return s;
    }
  }

  return 14;
}

function missionToWizardForm(mission: any) {
  const tagsText = mission.tags?.map((tag: any) => tag.tag).join(', ') || '';
  return {
    missionType: mission.missionType || 'GARDE',
    requiredLevel: mission.requiredLevels?.[0] || mission.requiredLevel || 'INTERN',
    requiredLevels: mission.requiredLevels?.length ? mission.requiredLevels : [mission.requiredLevel].filter(Boolean),
    compensationMode: mission.compensationMode || 'RETROCESSION',
    compensationCurrency: mission.compensationCurrency || 'EUR',
    durationHours: mission.durationHours != null ? String(mission.durationHours) : '8',
    retrocessionPercentage: mission.retrocessionPercentage != null ? String(mission.retrocessionPercentage) : '70',
    publishNow: mission.status === 'PUBLISHED',
    title: mission.title === 'Mission sans titre' ? '' : mission.title || '',
    specialty: mission.specialty === 'Specialite a preciser' ? '' : mission.specialty || '',
    description: mission.description || '',
    departmentInfo: mission.departmentInfo || '',
    softwareUsed: mission.softwareUsed || '',
    hasSecretary: mission.hasSecretary,
    secretaryType: mission.secretaryType || '',
    patientType: mission.patientType || '',
    averagePatientsPerDay: mission.averagePatientsPerDay != null ? String(mission.averagePatientsPerDay) : '',
    isMultidisciplinary: mission.isMultidisciplinary,
    equipmentAvailable: mission.equipmentAvailable || [],
    teamInfo: mission.teamInfo || '',
    equipmentInfo: mission.equipmentInfo || '',
    city: mission.city === 'Ville a preciser' ? '' : mission.city || '',
    sector: mission.sector || '',
    location: mission.location || '',
    accommodationProvided: mission.accommodationProvided,
    parkingAvailable: mission.parkingAvailable,
    practicalInfo: mission.practicalInfo || '',
    startDate: dateInput(mission.startDate),
    endDate: dateInput(mission.endDate),
    startTime: mission.startTime || '',
    endTime: mission.endTime || '',
    mobilityOptions: mission.mobilityOptions || [],
    preferredDurations: mission.preferredDurations || [],
    refusedSchedules: mission.refusedSchedules || [],
    acceptedPatientTypes: mission.acceptedPatientTypes || [],
    knownSoftware: mission.knownSoftware || [],
    minimumCompensation: mission.minimumCompensation != null ? String(mission.minimumCompensation) : '',
    tagsText,
    acceptedMissionTypes: mission.acceptedMissionTypes || [],
  };
}

export default function NewMissionPage() {
  const { establishments, primary, loading } = useEstablishments();
  const [form, setForm] = useState<any>(initialForm);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState('');
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [createdMission, setCreatedMission] = useState<Mission | null>(null);
  const [saving, setSaving] = useState(false);
  const [billingStatus, setBillingStatus] = useState<EstablishmentBillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingBusy, setBillingBusy] = useState<'subscription' | 'credit' | null>(null);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const [billingReturnStatus, setBillingReturnStatus] = useState<'subscription-success' | 'credit-success' | 'cancelled' | null>(null);
  const [draftMissionId, setDraftMissionId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const draftMissionIdRef = useRef<string | null>(null);
  const draftDirtyRef = useRef(false);
  const autosaveInFlightRef = useRef(false);
  const hasSubmittedRef = useRef(false);
  const hasFetchedRef = useRef(false);

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
    if (loading) return;
    if (hasFetchedRef.current) return;
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const draftId = searchParams.get('draftId') || searchParams.get('id');
    if (!draftId) return;

    hasFetchedRef.current = true;
    setLoadingDraft(true);
    api.get<any>(`/missions/mine/${draftId}`)
      .then((m) => {
        const parsedForm = missionToWizardForm(m);
        setForm(parsedForm);
        setDraftMissionId(m.id);
        draftMissionIdRef.current = m.id;
        if (m.establishmentId) {
          setSelectedEstablishmentId(m.establishmentId);
        }

        const establishment = establishments.find((item) => item.id === (m.establishmentId || primary?.id)) || primary;

        const savedStep = localStorage.getItem(`draft_step_${m.id}`);
        if (savedStep) {
          const parsedStep = parseInt(savedStep, 10);
          if (!isNaN(parsedStep) && parsedStep >= 0 && parsedStep < steps.length) {
            setStep(parsedStep);
          } else {
            setStep(findStoppedStep(parsedForm, establishment));
          }
        } else {
          setStep(findStoppedStep(parsedForm, establishment));
        }
      })
      .catch((err) => {
        setError("Impossible de charger le brouillon : " + err.message);
      })
      .finally(() => {
        setLoadingDraft(false);
      });
  }, [loading, establishments, primary]);

  useEffect(() => {
    if (draftMissionId) {
      localStorage.setItem(`draft_step_${draftMissionId}`, String(step));
    }
  }, [step, draftMissionId]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const status = new URLSearchParams(window.location.search).get('billing');
    if (status === 'subscription-success') {
      setBillingReturnStatus('subscription-success');
      setBillingNotice("Abonnement confirme. L'activation peut prendre quelques secondes apres validation Stripe.");
    } else if (status === 'credit-success') {
      setBillingReturnStatus('credit-success');
      setBillingNotice("Crédit de publication confirmé. Il reste disponible jusqu'à l'acceptation d'une mission par un candidat.");
    } else if (status === 'cancelled') {
      setBillingReturnStatus('cancelled');
      setBillingNotice("Paiement annulé. Aucun crédit n'est consommé tant que le paiement n'est pas confirmé.");
    }
  }, []);

  useEffect(() => {
    if (!selectedEstablishment?.id) {
      setBillingStatus(null);
      return;
    }

    let cancelled = false;
    const path = `/billing/establishments/${selectedEstablishment.id}/status`;

    setBillingLoading(true);
    setBillingStatus(null);
    setError(null);
    api.get<EstablishmentBillingStatus>(path)
      .then((status) => {
        if (cancelled) return;
        setBillingStatus(status);
        setBillingLoading(false);
        return api.reload<EstablishmentBillingStatus>(path)
          .then((freshStatus) => {
            if (!cancelled) setBillingStatus(freshStatus);
          })
          .catch(() => undefined);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(e.message);
        setBillingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEstablishment?.id]);

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
    draftDirtyRef.current = true;
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

  const buildMissionPayload = useCallback((publishNow: boolean) => {
    const title = optionalText(form.title) || 'Mission sans titre';
    const specialty = optionalText(form.specialty) || 'Specialite a preciser';
    const city = optionalText(form.city) || optionalText(selectedEstablishment?.city) || 'Ville a preciser';
    const startDate = form.startDate || tomorrowDateInput();

    return {
      ...form,
      title,
      specialty,
      city,
      startDate,
      establishmentId: selectedEstablishment?.id,
      requiredLevel: form.requiredLevels?.[0] || form.requiredLevel,
      requiredLevels: form.requiredLevels?.length ? form.requiredLevels : [form.requiredLevel],
      compensationMode: 'RETROCESSION',
      durationHours: form.durationHours ? Number(form.durationHours) : undefined,
      retrocessionPercentage: form.retrocessionPercentage ? Number(form.retrocessionPercentage) : 70,
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
      tags: String(form.tagsText || '').split(',').map((x: string) => x.trim()).filter(Boolean),
      publishNow,
    };
  }, [form, selectedEstablishment?.city, selectedEstablishment?.id]);

  useEffect(() => {
    draftMissionIdRef.current = draftMissionId;
  }, [draftMissionId]);

  const saveDraft = useCallback(async () => {
    if (!draftDirtyRef.current || autosaveInFlightRef.current || hasSubmittedRef.current) return;
    if (!selectedEstablishment?.id || !billingStatus?.canCreateMission) return;

    autosaveInFlightRef.current = true;
    setDraftStatus('saving');

    const payload = buildMissionPayload(false);
    delete payload.tagsText;
    draftDirtyRef.current = false;

    try {
      const mission = draftMissionIdRef.current
        ? await api.patchSilent<Mission>(`/missions/${draftMissionIdRef.current}`, { ...payload, publishNow: undefined })
        : await api.postSilent<Mission>('/missions', payload);

      draftMissionIdRef.current = mission.id;
      setDraftMissionId(mission.id);
      setDraftStatus('saved');
    } catch {
      draftDirtyRef.current = true;
      setDraftStatus('error');
    } finally {
      autosaveInFlightRef.current = false;
    }
  }, [billingStatus?.canCreateMission, buildMissionPayload, selectedEstablishment?.id]);

  async function waitForAutosave() {
    for (let index = 0; index < 20 && autosaveInFlightRef.current; index += 1) {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
  }

  useEffect(() => {
    if (!draftDirtyRef.current || hasSubmittedRef.current || createdMission) return;
    const timeout = window.setTimeout(() => {
      void saveDraft();
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [form, selectedEstablishmentId, createdMission, saveDraft]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!isLastStep) {
      next();
      return;
    }

    setSaving(true);
    setError(null);
    hasSubmittedRef.current = true;
    await waitForAutosave();

    const payload = buildMissionPayload(true);
    delete payload.tagsText;

    try {
      if (draftMissionIdRef.current) {
        await api.patch<Mission>(`/missions/${draftMissionIdRef.current}`, { ...payload, publishNow: undefined });
        const mission = await api.post<Mission>(`/missions/${draftMissionIdRef.current}/publish`);
        setCreatedMission(mission);
      } else {
        const mission = await api.post<Mission>('/missions', payload);
        setCreatedMission(mission);
      }
    } catch (e: any) {
      setError(e.message);
      hasSubmittedRef.current = false;
    } finally {
      setSaving(false);
    }
  }

  function resetWizard() {
    setForm(initialForm);
    setStep(0);
    setError(null);
    setCreatedMission(null);
    setDraftMissionId(null);
    setDraftStatus('idle');
    draftMissionIdRef.current = null;
    draftDirtyRef.current = false;
    hasSubmittedRef.current = false;
  }

  async function startBillingCheckout(kind: 'subscription' | 'credit') {
    if (!selectedEstablishment?.id) return;

    setBillingBusy(kind);
    setError(null);
    try {
      const endpoint = kind === 'subscription'
        ? '/billing/checkout/subscription'
        : '/billing/checkout/publication-credit';
      const response = await api.post<{ url: string }>(endpoint, { establishmentId: selectedEstablishment.id });
      window.location.href = response.url;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBillingBusy(null);
    }
  }

  if (loading || loadingDraft) return <LoadingCard label={loadingDraft ? "Chargement du brouillon..." : "Chargement..."} />;

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

  if (billingLoading || !billingStatus) return <LoadingCard label="Verification de votre acces publication..." />;

  if (!billingStatus.canCreateMission) {
    return (
      <PublicationPaymentGate
        establishments={establishments}
        selectedEstablishmentId={selectedEstablishmentId}
        setSelectedEstablishmentId={setSelectedEstablishmentId}
        billingStatus={billingStatus}
        billingNotice={billingNotice}
        billingReturnStatus={billingReturnStatus}
        error={error}
        busy={billingBusy}
        onSubscribe={() => void startBillingCheckout('subscription')}
        onBuyCredit={() => void startBillingCheckout('credit')}
      />
    );
  }

  return (
    <div className="new-mission-page">
      <PageHeader
        title="Créer une mission"
        description={selectedEstablishment ? `Établissement : ${selectedEstablishment.name}` : 'Choisissez un établissement pour rattacher la mission.'}
      />
      {billingReturnStatus === 'credit-success' ? (
        <CreditPurchaseBanner billingStatus={billingStatus} />
      ) : billingNotice ? (
        <Alert type={billingReturnStatus === 'cancelled' ? 'info' : 'success'}>{billingNotice}</Alert>
      ) : null}
      {billingStatus.hasActiveSubscription ? (
        <Alert type="success">Abonnement actif : vous pouvez créer et publier vos annonces sans paiement unitaire.</Alert>
      ) : billingStatus.availableCredits > 0 ? (
        <Alert type="success">
          {billingStatus.availableCredits} crédit{billingStatus.availableCredits > 1 ? 's' : ''} de publication disponible{billingStatus.availableCredits > 1 ? 's' : ''}. Il sera débité quand un candidat acceptera la mission.
        </Alert>
      ) : null}
      <div className="wizard-layout">
        <Card className="wizard-panel">
          <div className="wizard-progress">
            <div className="toolbar">
              <div>
                <Badge tone="neutral">Étape {step + 1}/{steps.length}</Badge>
                <strong className="wizard-current-step">{steps[step].title}</strong>
                <span className="small">{steps[step].helper}</span>
              </div>
              <div className="wizard-progress-meta">
                <span className="small">{progress}% complété</span>
                {draftStatus === 'saving' ? <span className="small">Sauvegarde...</span> : null}
                {draftStatus === 'saved' ? <span className="small">Brouillon sauvegardé</span> : null}
                {draftStatus === 'error' ? <span className="small">Brouillon non sauvegardé</span> : null}
              </div>
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
                  draftDirtyRef.current = true;
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

function PublicationPaymentGate({
  establishments,
  selectedEstablishmentId,
  setSelectedEstablishmentId,
  billingStatus,
  billingNotice,
  billingReturnStatus,
  error,
  busy,
  onSubscribe,
  onBuyCredit,
}: {
  establishments: Establishment[];
  selectedEstablishmentId: string;
  setSelectedEstablishmentId: (id: string) => void;
  billingStatus: EstablishmentBillingStatus;
  billingNotice: string | null;
  billingReturnStatus: 'subscription-success' | 'credit-success' | 'cancelled' | null;
  error: string | null;
  busy: 'subscription' | 'credit' | null;
  onSubscribe: () => void;
  onBuyCredit: () => void;
}) {
  const subscriptionAmount = formatCents(billingStatus.prices.monthlySubscription.amount, billingStatus.prices.monthlySubscription.currency);
  const creditAmount = formatCents(billingStatus.prices.publicationCredit.amount, billingStatus.prices.publicationCredit.currency);

  return (
    <div className="new-mission-page">
      <PageHeader
        title="Publier une annonce"
        description="Choisissez votre mode d'accès avant de remplir le formulaire. Aucun formulaire long ne vous est demandé avant paiement."
      />

      {billingReturnStatus === 'credit-success' ? (
        <CreditPurchaseBanner billingStatus={billingStatus} compact />
      ) : billingNotice ? (
        <Alert type="info">{billingNotice}</Alert>
      ) : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      {!billingStatus.stripeConfigured ? (
        <Alert type="error">Stripe n'est pas encore configure sur le serveur. Ajoutez les cles Render avant d'activer les paiements.</Alert>
      ) : null}

      <Card className="card-highlight publication-access-card">
        <div className="toolbar">
          <div>
            <h2>Votre annonce reste acquise</h2>
            <p>Si vous payez une publication unique, le crédit reste disponible tant qu'aucun candidat n'a accepté une mission.</p>
          </div>
          <Badge tone="warning">Paiement avant formulaire</Badge>
        </div>

        <Field label="Etablissement">
          <Select value={selectedEstablishmentId} onChange={(event) => setSelectedEstablishmentId(event.target.value)}>
            {establishments.map((establishment) => (
              <option key={establishment.id} value={establishment.id}>
                {establishment.name}{establishment.city ? ` - ${establishment.city}` : ''}
              </option>
            ))}
          </Select>
        </Field>
      </Card>

      <div className="publication-plan-grid">
        <Card className="publication-plan-card">
          <div>
            <Badge tone="success">Recommande</Badge>
            <h2>Abonnement etablissement</h2>
            <p>Pour publier plusieurs annonces sans repasser par un paiement unitaire.</p>
          </div>
          <div className="publication-price">
            <strong>{subscriptionAmount}</strong>
            <span>/ mois</span>
          </div>
          <ul className="publication-plan-list">
            <li>Publications incluses tant que l'abonnement est actif</li>
            <li>Gestion de l'abonnement et des factures via Stripe</li>
            <li>Creation en brouillon ou publication immediate</li>
          </ul>
          <Button type="button" disabled={!billingStatus.stripeConfigured || Boolean(busy)} onClick={onSubscribe}>
            {busy === 'subscription' ? 'Redirection...' : "S'abonner"}
          </Button>
        </Card>

        <Card className="publication-plan-card">
          <div>
            <Badge tone="neutral">A l'unite</Badge>
            <h2>Credit de publication</h2>
            <p>Pour publier une annonce unique, avec un crédit débité seulement après acceptation candidat.</p>
          </div>
          <div className="publication-price">
            <strong>{creditAmount}</strong>
            <span>une fois</span>
          </div>
          <ul className="publication-plan-list">
            <li>Valable pour une annonce</li>
            <li>Réservé à la publication, débité à l'acceptation candidat</li>
            <li>Permet aussi de preparer un brouillon</li>
          </ul>
          <Button type="button" variant="secondary" disabled={!billingStatus.stripeConfigured || Boolean(busy)} onClick={onBuyCredit}>
            {busy === 'credit' ? 'Redirection...' : 'Payer une annonce'}
          </Button>
        </Card>
      </div>
    </div>
  );
}

function CreditPurchaseBanner({
  billingStatus,
  compact,
}: {
  billingStatus: EstablishmentBillingStatus;
  compact?: boolean;
}) {
  const remainingCredits = billingStatus.availableCredits;

  return (
    <Card className={`publication-credit-success ${compact ? 'compact' : ''}`}>
      <div className="publication-credit-success-main">
        <Badge tone="success">Crédit confirmé</Badge>
        <h2>Votre crédit mission est disponible</h2>
        <p>
          Vous pouvez créer une nouvelle mission avec ce crédit ou reprendre un brouillon existant.
          Dans les deux cas, le crédit sera utilisé pour la mission publiée.
        </p>
      </div>
      <div className="publication-credit-success-side">
        <div className="publication-credit-remaining">
          <span>Crédits restants</span>
          <strong>{remainingCredits}</strong>
          <small>{remainingCredits > 1 ? 'missions publiables' : 'mission publiable'}</small>
        </div>
        <div className="publication-credit-success-stats">
          <div><span>Réservés</span><strong>{billingStatus.reservedCredits}</strong></div>
          <div><span>Utilisés</span><strong>{billingStatus.consumedCredits}</strong></div>
        </div>
      </div>
      <div className="actions">
        <LinkButton href="/establishment/onboarding" variant="light">Voir mon etablissement</LinkButton>
        <LinkButton href="/establishment/missions/new" variant="secondary">Creer une mission</LinkButton>
        <LinkButton href="/establishment/missions?tab=drafts" variant="light">Reprendre un brouillon</LinkButton>
      </div>
    </Card>
  );
}

function formatCents(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
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
            <NumberStepper min={0} step={1} value={form.averagePatientsPerDay ?? ''} onChange={(value) => set('averagePatientsPerDay', value)} placeholder="Ex : 25" />
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
          <NumberStepper min={1} max={72} step={1} value={form.durationHours || ''} onChange={(value) => set('durationHours', value)} />
        </Field>
        <SingleChoiceField label="Format de durée" value={form.preferredDuration || ''} options={durationOptions} onChange={(value) => set('preferredDuration', value)} />
        <Field label="Pourcentage de rétrocession">
          <NumberStepper min={1} max={100} step={1} value={form.retrocessionPercentage || ''} onChange={(value) => set('retrocessionPercentage', value)} suffix="%" />
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
          <NumberStepper min={0} step={50} value={form.minimumCompensation ?? ''} onChange={(value) => set('minimumCompensation', value)} placeholder="Ex : 600" suffix="EUR" />
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

function NumberStepper({
  value,
  onChange,
  min,
  max,
  step = 1,
  placeholder,
  suffix,
}: {
  value: string | number;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
  suffix?: string;
}) {
  const numericValue = value === '' || value == null ? undefined : Number(value);

  function clamp(next: number) {
    if (Number.isNaN(next)) return '';
    const withMin = min == null ? next : Math.max(min, next);
    return String(max == null ? withMin : Math.min(max, withMin));
  }

  function nudge(direction: 1 | -1) {
    const base = numericValue == null || Number.isNaN(numericValue) ? min ?? 0 : numericValue;
    onChange(clamp(base + direction * step));
  }

  return (
    <div className="number-stepper">
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => onChange(e.target.value === '' ? '' : clamp(Number(e.target.value)))}
        placeholder={placeholder}
      />
      {suffix ? <span className="number-stepper-suffix">{suffix}</span> : null}
      <div className="number-stepper-actions">
        <button type="button" aria-label="Augmenter" onClick={() => nudge(1)}>▲</button>
        <button type="button" aria-label="Diminuer" onClick={() => nudge(-1)}>▼</button>
      </div>
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
