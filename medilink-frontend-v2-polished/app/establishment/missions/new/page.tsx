'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode, RefObject } from 'react';
import { MissionShareActions } from '@/components/MissionShareActions';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { MultiChoiceField, MultiChoiceTextField, SingleChoiceField } from '@/components/FormChoiceFields';
import { Alert, Badge, Button, Card, Field, Input, LinkButton, LoadingCard, PageHeader, Select, Textarea } from '@/components/ui';
import { api, clearApiCache } from '@/lib/api';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, missionTypeOptions, requiredLevelLabels, requiredLevelOptions } from '@/lib/labels';
import {
  acceptedMissionTypeOptions,
  cityOptions,
  durationOptions,
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
import type { Establishment, EstablishmentBillingStatus, Mission, MissionType, RequiredLevel } from '@/lib/types';
import { errorMessage } from '@/lib/user-facing';

type DraftSummary = {
  id: string;
  title: string;
  specialty: string;
  startDate: string;
};

type WizardForm = {
  missionType: MissionType;
  requiredLevel: RequiredLevel;
  requiredLevels: RequiredLevel[];
  compensationMode: string;
  compensationCurrency: string;
  durationHours: string;
  retrocessionPercentage: string;
  publishNow: boolean;
  title: string;
  specialty: string;
  description: string;
  practiceSetting: string;
  requiredActs: string[];
  departmentInfo: string;
  softwareUsed: string;
  hasSecretary?: boolean | null;
  secretaryType: string;
  patientType: string;
  averagePatientsPerDay: string;
  isMultidisciplinary?: boolean | null;
  equipmentAvailable: string[];
  teamInfo: string;
  equipmentInfo: string;
  city: string;
  sector: string;
  location: string;
  accommodationProvided?: boolean | null;
  parkingAvailable?: boolean | null;
  practicalInfo: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  mobilityOptions: string[];
  preferredDurations: string[];
  refusedSchedules: string[];
  acceptedPatientTypes: string[];
  knownSoftware: string[];
  minimumCompensation: string;
  tagsText?: string;
  acceptedMissionTypes: string[];
};

const steps = [
  { title: 'Mission', helper: 'Format, profil recherché et besoin' },
  { title: 'Contexte', helper: 'Activité, organisation et équipement' },
  { title: 'Lieu', helper: 'Adresse, accueil et accès' },
  { title: 'Planning', helper: 'Dates, horaires et rémunération' },
  { title: 'Publication', helper: 'Visibilité et statut de la mission' },
  { title: 'Vérification', helper: 'Dernière relecture avant validation' },
];

const initialForm: WizardForm = {
  missionType: 'REMPLACEMENT',
  requiredLevel: 'INTERN',
  requiredLevels: ['INTERN'],
  compensationMode: 'RETROCESSION',
  compensationCurrency: 'EUR',
  durationHours: '8',
  retrocessionPercentage: '70',
  publishNow: true,
  title: '',
  specialty: '',
  description: '',
  practiceSetting: '',
  requiredActs: [],
  departmentInfo: '',
  softwareUsed: '',
  secretaryType: '',
  patientType: '',
  averagePatientsPerDay: '',
  equipmentAvailable: [],
  teamInfo: '',
  equipmentInfo: '',
  city: '',
  sector: '',
  location: '',
  practicalInfo: '',
  startDate: '',
  endDate: '',
  startTime: '',
  endTime: '',
  mobilityOptions: [],
  preferredDurations: [],
  refusedSchedules: [],
  acceptedPatientTypes: [],
  knownSoftware: [],
  minimumCompensation: '',
  tagsText: '',
  acceptedMissionTypes: [],
};

function tomorrowDateInput() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function missionToDraftSummary(mission: Pick<Mission, 'id' | 'title' | 'specialty' | 'startDate'>): DraftSummary {
  return {
    id: mission.id,
    title: mission.title,
    specialty: mission.specialty,
    startDate: mission.startDate,
  };
}

function mergeDraftSummaries(...groups: Array<DraftSummary[] | undefined>) {
  const byId = new Map<string, DraftSummary>();
  groups.flatMap((group) => group || []).forEach((draft) => {
    byId.set(draft.id, draft);
  });
  return Array.from(byId.values());
}

function mergeAccountCreditStatus(
  selectedStatus: EstablishmentBillingStatus,
  accountStatuses: EstablishmentBillingStatus[],
) {
  const totals = accountStatuses.reduce(
    (sum, status) => ({
      availableCredits: sum.availableCredits + status.availableCredits,
      reservedCredits: sum.reservedCredits + status.reservedCredits,
      consumedCredits: sum.consumedCredits + status.consumedCredits,
    }),
    { availableCredits: 0, reservedCredits: 0, consumedCredits: 0 },
  );
  const accountDrafts = mergeDraftSummaries(...accountStatuses.map((status) => status.drafts));

  return {
    ...selectedStatus,
    ...totals,
    canCreateMission: selectedStatus.hasActiveSubscription || (totals.availableCredits - accountDrafts.length) > 0,
    drafts: accountDrafts,
  };
}

function findStoppedStep(form: WizardForm, establishment?: Establishment) {
  if (
    !form.title ||
    form.title === 'Mission sans titre' ||
    !form.specialty ||
    form.specialty === 'Specialite a preciser' ||
    !safeArray(form.requiredLevels).length
  ) {
    return 0;
  }

  const contextStarted = Boolean(
    form.description ||
    form.practiceSetting ||
    form.departmentInfo ||
    form.requiredActs?.length ||
    form.teamInfo ||
    form.equipmentInfo ||
    (form.softwareUsed && form.softwareUsed !== establishment?.softwareUsed),
  );
  if (!contextStarted) return 1;

  if (!form.city || form.city === 'Ville a preciser') return 2;
  if (!form.startDate) return 3;
  if (!form.tagsText && !safeArray(form.acceptedMissionTypes).length) return 4;
  return 5;
}

function missionToWizardForm(mission: Mission): WizardForm {
  const tagsText = mission.tags?.map((tag) => tag.tag).join(', ') || '';
  return {
    missionType: mission.missionType || 'REMPLACEMENT',
    requiredLevel: mission.requiredLevels?.[0] || mission.requiredLevel || 'INTERN',
    requiredLevels: mission.requiredLevels?.length ? mission.requiredLevels : [mission.requiredLevel].filter(Boolean) as RequiredLevel[],
    compensationMode: mission.compensationMode || 'RETROCESSION',
    compensationCurrency: mission.compensationCurrency || 'EUR',
    durationHours: mission.durationHours != null ? String(mission.durationHours) : '8',
    retrocessionPercentage: mission.retrocessionPercentage != null ? String(mission.retrocessionPercentage) : '70',
    publishNow: mission.status === 'PUBLISHED',
    title: mission.title === 'Mission sans titre' ? '' : mission.title || '',
    specialty: mission.specialty === 'Specialite a preciser' ? '' : mission.specialty || '',
    description: mission.description || '',
    practiceSetting: mission.practiceSetting || '',
    requiredActs: mission.requiredActs || [],
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

function validateWizardStep(stepIndex: number, form: WizardForm): string | null {
  if (stepIndex === 0) {
    if (!form.missionType) return 'Choisissez un type de mission.';
    if (!safeArray(form.requiredLevels).length) return 'Sélectionnez au moins un profil recherché.';
    if (!optionalText(form.title)) return 'Ajoutez un titre à la mission.';
    if (!optionalText(form.specialty)) return 'Choisissez une spécialité.';
  }

  if (stepIndex === 2 && !optionalText(form.city)) {
    return 'Indiquez au moins la ville de la mission.';
  }

  if (stepIndex === 3) {
    const minimumDate = tomorrowDateInput();
    if (!form.startDate) return 'Choisissez une date de début.';
    if (form.startDate < minimumDate) return 'La date de début doit être située dans le futur.';
    if (form.endDate && form.endDate < form.startDate) {
      return 'La date de fin doit être postérieure ou égale à la date de début.';
    }
    if (
      (!form.endDate || form.endDate === form.startDate) &&
      form.startTime &&
      form.endTime &&
      form.endTime <= form.startTime
    ) {
      return "L'heure de fin doit être postérieure à l'heure de début.";
    }

    const durationHours = Number(form.durationHours);
    if (!Number.isFinite(durationHours) || durationHours < 1 || durationHours > 72) {
      return 'Indiquez une durée comprise entre 1 et 72 heures.';
    }

    const retrocessionPercentage = Number(form.retrocessionPercentage);
    if (
      !Number.isFinite(retrocessionPercentage) ||
      retrocessionPercentage < 1 ||
      retrocessionPercentage > 100
    ) {
      return 'Indiquez un pourcentage de rétrocession compris entre 1 et 100 %.';
    }

    if (form.minimumCompensation !== '' && form.minimumCompensation != null) {
      const minimumCompensation = Number(form.minimumCompensation);
      if (
        !Number.isFinite(minimumCompensation) ||
        minimumCompensation < 0 ||
        minimumCompensation > 100
      ) {
        return 'La rémunération minimale doit être comprise entre 0 et 100 %.';
      }
    }
  }

  if (stepIndex === 4 && typeof form.publishNow !== 'boolean') {
    return 'Choisissez de publier maintenant ou de conserver un brouillon.';
  }

  if (stepIndex === 5) {
    for (let candidateStep = 0; candidateStep < 5; candidateStep += 1) {
      const error = validateWizardStep(candidateStep, form);
      if (error) return error;
    }
  }

  return null;
}

function firstInvalidWizardStep(form: WizardForm) {
  for (let stepIndex = 0; stepIndex < steps.length - 1; stepIndex += 1) {
    if (validateWizardStep(stepIndex, form)) return stepIndex;
  }
  return null;
}

export default function NewMissionPage() {
  const { establishments, primary, loading } = useEstablishments();
  const [form, setForm] = useState<WizardForm>(initialForm);
  const [selectedEstablishmentId, setSelectedEstablishmentId] = useState('');
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [createdMission, setCreatedMission] = useState<Mission | null>(null);
  const [saving, setSaving] = useState(false);
  const [billingStatus, setBillingStatus] = useState<EstablishmentBillingStatus | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingBusy, setBillingBusy] = useState<'subscription' | 'credit' | null>(null);
  const [billingNotice, setBillingNotice] = useState<string | null>(null);
  const [landingIntentNotice, setLandingIntentNotice] = useState<string | null>(null);
  const [billingReturnStatus, setBillingReturnStatus] = useState<'subscription-success' | 'credit-success' | 'cancelled' | null>(null);
  const [forceShowPaymentGate, setForceShowPaymentGate] = useState(false);
  const [forceNewMission, setForceNewMission] = useState(false);
  const [billingTrigger, setBillingTrigger] = useState(0);
  const [existingDrafts, setExistingDrafts] = useState<DraftSummary[]>([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [draftMissionId, setDraftMissionId] = useState<string | null>(null);
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [creditAlertVisible, setCreditAlertVisible] = useState(false);
  const [creditAlertFading, setCreditAlertFading] = useState(false);
  const creditAlertShownRef = useRef(false);
  const draftMissionIdRef = useRef<string | null>(null);
  const draftDirtyRef = useRef(false);
  const autosaveInFlightRef = useRef(false);
  const hasSubmittedRef = useRef(false);
  const hasFetchedRef = useRef(false);
  const landingIntentAppliedRef = useRef(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const progress = useMemo(() => Math.round(((step + 1) / steps.length) * 100), [step]);
  const isLastStep = step === steps.length - 1;
  const selectedEstablishment = useMemo(
    () => establishments.find((item) => item.id === selectedEstablishmentId) || primary,
    [establishments, primary, selectedEstablishmentId],
  );
  const establishmentIdsKey = useMemo(
    () => establishments.map((establishment) => establishment.id).join('|'),
    [establishments],
  );

  const drafts = useMemo(() => {
    return billingStatus ? mergeDraftSummaries(existingDrafts, billingStatus.drafts) : [];
  }, [existingDrafts, billingStatus]);

  const hasAccessToCreate = useMemo(() => {
    if (!billingStatus) return false;
    return billingStatus.hasActiveSubscription || (billingStatus.availableCredits - drafts.length > 0);
  }, [billingStatus, drafts]);

  const showWizard = useMemo(() => {
    if (!billingStatus) return false;
    return Boolean(draftMissionId) || (hasAccessToCreate && forceNewMission) || (billingStatus.hasActiveSubscription && !forceShowPaymentGate && drafts.length === 0);
  }, [draftMissionId, hasAccessToCreate, forceNewMission, billingStatus, forceShowPaymentGate, drafts]);

  useEffect(() => {
    if (!primary || selectedEstablishmentId) return;
    setSelectedEstablishmentId(primary.id);
  }, [primary, selectedEstablishmentId]);

  useEffect(() => {
    if (landingIntentAppliedRef.current || typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('draftId') || searchParams.get('id')) return;

    let storedIntent: Record<string, unknown> = {};
    try {
      storedIntent = JSON.parse(
        window.sessionStorage.getItem('medilink_establishment_intent') || '{}',
      );
    } catch {
      storedIntent = {};
    }

    const missionType = String(
      storedIntent.missionType || searchParams.get('intentType') || '',
    );
    const specialty = String(
      storedIntent.specialty || searchParams.get('intentSpecialty') || '',
    ).trim();
    const city = String(
      storedIntent.city || searchParams.get('intentCity') || '',
    ).trim();
    const period = String(
      storedIntent.period || searchParams.get('intentPeriod') || '',
    ).trim();
    if (!missionType && !specialty && !city && !period) return;

    landingIntentAppliedRef.current = true;
    const supportedMissionType = missionTypeOptions.some(
      (option) => option.value === missionType,
    )
      ? (missionType as MissionType)
      : undefined;
    setForm((current: WizardForm) => ({
      ...current,
      missionType: supportedMissionType || current.missionType,
      specialty: specialty || current.specialty || '',
      city: city || current.city || '',
      description:
        period && !current.description
          ? `Période souhaitée : ${period}`
          : current.description,
    }));
    setLandingIntentNotice(
      'Les informations saisies avant votre inscription ont été reprises. Vérifiez-les avant publication.',
    );
  }, []);

  useEffect(() => {
    if (showWizard && billingStatus && billingStatus.availableCredits > 0) {
      if (creditAlertShownRef.current) return;
      creditAlertShownRef.current = true;
      setCreditAlertVisible(true);
      setCreditAlertFading(false);
      const timer = setTimeout(() => {
        setCreditAlertFading(true);
      }, 3000);
      return () => clearTimeout(timer);
    } else {
      setCreditAlertVisible(false);
      setCreditAlertFading(false);
    }
  }, [showWizard, billingStatus]);

  useEffect(() => {
    if (creditAlertFading) {
      const timer = setTimeout(() => {
        setCreditAlertVisible(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [creditAlertFading]);

  useEffect(() => {
    if (loading) return;
    if (hasFetchedRef.current) return;
    if (typeof window === 'undefined') return;
    const searchParams = new URLSearchParams(window.location.search);
    const draftId = searchParams.get('draftId') || searchParams.get('id');
    if (!draftId) return;

    hasFetchedRef.current = true;
    setLoadingDraft(true);
    api.get<Mission>(`/missions/mine/${draftId}`)
      .then((m) => {
        const parsedForm = missionToWizardForm(m);
        setForm(parsedForm);
        setDraftMissionId(m.id);
        draftMissionIdRef.current = m.id;
        if (m.establishmentId) {
          setSelectedEstablishmentId(m.establishmentId);
        }

        const establishment = establishments.find((item) => item.id === (m.establishmentId || primary?.id)) || primary;

        const savedStep = localStorage.getItem(`draft_step_v2_${m.id}`);
        if (savedStep) {
          const parsedStep = parseInt(savedStep, 10);
          if (!isNaN(parsedStep) && parsedStep >= 0 && parsedStep < steps.length) {
            setStep(parsedStep);
          } else {
            setStep(findStoppedStep(parsedForm, establishment ?? undefined));
          }
        } else {
          setStep(findStoppedStep(parsedForm, establishment ?? undefined));
        }
      })
      .catch((err) => {
        setError("Impossible de charger le brouillon : " + errorMessage(err));
      })
      .finally(() => {
        setLoadingDraft(false);
      });
  }, [loading, establishments, primary]);

  useEffect(() => {
    if (draftMissionId) {
      localStorage.setItem(`draft_step_v2_${draftMissionId}`, String(step));
    }
  }, [step, draftMissionId]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      stepHeadingRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [step]);

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
    setForceNewMission(false);
    setForceShowPaymentGate(false);

    if (!selectedEstablishment?.id) {
      setBillingStatus(null);
      return;
    }

    let cancelled = false;
    const statusPath = (establishmentId: string) => `/billing/establishments/${establishmentId}/status`;
    const cachedStatuses = establishments
      .map((establishment) => api.getSync<EstablishmentBillingStatus>(statusPath(establishment.id)))
      .filter((status): status is EstablishmentBillingStatus => Boolean(status));
    const cachedSelectedStatus = cachedStatuses.find((status) => status.establishmentId === selectedEstablishment.id);

    if (cachedSelectedStatus) {
      setBillingStatus(mergeAccountCreditStatus(cachedSelectedStatus, cachedStatuses));
      setBillingLoading(false);
    } else {
      setBillingStatus(null);
      setBillingLoading(true);
    }
    setError(null);

    Promise.all(
      establishments.map(async (establishment) => {
        try {
          return await api.reload<EstablishmentBillingStatus>(statusPath(establishment.id));
        } catch (e) {
          if (establishment.id === selectedEstablishment.id) throw e;
          return null;
        }
      }),
    )
      .then((statuses) => {
        if (cancelled) return;
        const accountStatuses = statuses.filter((status): status is EstablishmentBillingStatus => Boolean(status));
        const selectedStatus = accountStatuses.find((status) => status.establishmentId === selectedEstablishment.id);
        if (!selectedStatus) throw new Error("Impossible de charger le statut de facturation de l'établissement sélectionné.");
        setBillingStatus(mergeAccountCreditStatus(selectedStatus, accountStatuses));
        setBillingLoading(false);
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(errorMessage(e));
        setBillingLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEstablishment?.id, billingTrigger, establishmentIdsKey, establishments]);

  useEffect(() => {
    if (!selectedEstablishment?.id) {
      setExistingDrafts([]);
      setDraftsLoading(false);
      return;
    }

    let cancelled = false;
    const path = `/missions/mine?establishmentId=${selectedEstablishment.id}`;

    const cachedMissionsSync = api.getSync<Mission[]>(path);
    if (cachedMissionsSync) {
      setExistingDrafts(
        cachedMissionsSync
          .filter((mission) => mission.status === 'DRAFT')
          .map(missionToDraftSummary),
      );
      setDraftsLoading(false);
    } else {
      setExistingDrafts([]);
      setDraftsLoading(true);
    }

    api.reload<Mission[]>(path)
      .then((missions) => {
        if (cancelled) return;
        setExistingDrafts(
          missions
            .filter((mission) => mission.status === 'DRAFT')
            .map(missionToDraftSummary),
        );
      })
      .catch((e: Error) => {
        if (cancelled) return;
        setError(errorMessage(e));
        setExistingDrafts([]);
      })
      .finally(() => {
        if (!cancelled) setDraftsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [selectedEstablishment?.id, billingTrigger]);

  useEffect(() => {
    if (!selectedEstablishment) return;

    setForm((current: WizardForm) => ({
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

  function set<K extends keyof WizardForm>(name: K, value: WizardForm[K]) {
    draftDirtyRef.current = true;
    setForm((p) => ({ ...p, [name]: value }));
  }

  const currentStepValidationError = validateWizardStep(step, form);

  function next() {
    if (currentStepValidationError) {
      setError(currentStepValidationError);
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
      endDate: form.endDate || undefined,
      startTime: form.startTime || undefined,
      endTime: form.endTime || undefined,
      establishmentId: selectedEstablishment?.id,
      requiredLevel: form.requiredLevels?.[0] || form.requiredLevel,
      requiredLevels: form.requiredLevels?.length ? form.requiredLevels : [form.requiredLevel],
      practiceSetting: form.practiceSetting || undefined,
      requiredActs: cleanArray(form.requiredActs),
      compensationMode: 'RETROCESSION',
      durationHours: form.durationHours ? Number(form.durationHours) : undefined,
      retrocessionPercentage: form.retrocessionPercentage ? Number(form.retrocessionPercentage) : 70,
      compensationAmount: undefined,
      secretaryType: form.secretaryType || undefined,
      averagePatientsPerDay: form.averagePatientsPerDay === '' || form.averagePatientsPerDay == null ? undefined : Number(form.averagePatientsPerDay),
      isMultidisciplinary: form.isMultidisciplinary,
      equipmentAvailable: cleanArray(form.equipmentAvailable),
      acceptedMissionTypes: cleanArray(form.acceptedMissionTypes),
      minimumCompensation: form.minimumCompensation === '' || form.minimumCompensation == null ? undefined : Number(form.minimumCompensation),
      preferredDurations: cleanArray(form.preferredDurations),
      acceptedPatientTypes: cleanArray(form.acceptedPatientTypes),
      knownSoftware: cleanArray(form.knownSoftware),
      tags: String(form.tagsText || '').split(',').map((x: string) => x.trim()).filter(Boolean),
      publishNow,
    };
  }, [form, selectedEstablishment]);

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
        ? await api.patchSilent<Mission>(`/missions/${draftMissionIdRef.current}`, { ...payload, establishmentId: undefined, publishNow: undefined })
        : await api.postSilent<Mission>('/missions', payload);

      draftMissionIdRef.current = mission.id;
      setDraftMissionId(mission.id);
      setDraftStatus('saved');

      clearApiCache(`/billing/establishments/${selectedEstablishment.id}/status`);
      clearApiCache('/establishment/dashboard');
      clearApiCache(`/missions/mine?establishmentId=${selectedEstablishment.id}`);
    } catch {
      draftDirtyRef.current = true;
      setDraftStatus('error');
    } finally {
      autosaveInFlightRef.current = false;
    }
  }, [billingStatus?.canCreateMission, buildMissionPayload, selectedEstablishment]);

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

    const invalidStep = firstInvalidWizardStep(form);
    if (invalidStep != null) {
      setStep(invalidStep);
      setError(validateWizardStep(invalidStep, form));
      return;
    }

    setSaving(true);
    setError(null);
    hasSubmittedRef.current = true;
    await waitForAutosave();

    const publishNow = form.publishNow === true;
    const payload = buildMissionPayload(publishNow);
    delete payload.tagsText;

    try {
      if (draftMissionIdRef.current) {
        const updatedMission = await api.patch<Mission>(
          `/missions/${draftMissionIdRef.current}`,
          { ...payload, establishmentId: undefined, publishNow: undefined },
        );
        if (publishNow) {
          const publishedMission = await api.post<Mission>(`/missions/${draftMissionIdRef.current}/publish`);
          setCreatedMission(publishedMission);
        } else {
          setCreatedMission(updatedMission);
        }
      } else {
        const mission = await api.post<Mission>('/missions', payload);
        setCreatedMission(mission);
      }
      window.sessionStorage.removeItem('medilink_establishment_intent');
    } catch (e) {
      setError(errorMessage(e));
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
    setForceNewMission(false);
    setForceShowPaymentGate(false);
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
    } catch (e) {
      setError(errorMessage(e));
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
          {createdMission.status === 'PUBLISHED' ? (
            <>
              <p>Copiez ce lien pour le partager avec un candidat ou dans un message.</p>
              <MissionShareActions missionId={createdMission.id} showUrl showPublicLink={false} />
            </>
          ) : (
            <p>Le brouillon reste privé. Vous pourrez le reprendre et le publier depuis la liste de vos missions.</p>
          )}
          <div className="actions" style={{ marginTop: 12 }}>
            <LinkButton href="/establishment/missions">Voir mes missions</LinkButton>
            <Button type="button" variant="light" onClick={resetWizard}>Créer une autre mission</Button>
          </div>
        </Card>
      </>
    );
  }

  if (billingLoading || draftsLoading || !billingStatus) return <LoadingCard label="Vérification de votre accès publication..." />;


  if (!showWizard) {
    return (
      <PublicationAccessGate
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
        onCreateNew={() => setForceNewMission(true)}
        drafts={drafts}
        onDeleted={(draftId) => {
          setExistingDrafts((current) => current.filter((draft) => draft.id !== draftId));
          setBillingTrigger((t) => t + 1);
        }}
      />
    );
  }

  return (
    <div className="new-mission-page">
      <PageHeader
        title="Créer une mission"
        description={selectedEstablishment ? `Établissement : ${selectedEstablishment.name}` : 'Choisissez un établissement pour rattacher la mission.'}
      />
      <div className="wizard-layout">
        {billingNotice ? (
          <Alert type={billingReturnStatus === 'cancelled' ? 'info' : 'success'}>{billingNotice}</Alert>
        ) : null}
        {landingIntentNotice ? <Alert type="info">{landingIntentNotice}</Alert> : null}
        {billingStatus.hasActiveSubscription ? (
          <Alert type="success">Abonnement actif : vous pouvez créer et publier vos annonces sans paiement unitaire.</Alert>
        ) : creditAlertVisible ? (
          <div
            style={{
              opacity: creditAlertFading ? 0 : 1,
              maxHeight: creditAlertFading ? 0 : '120px',
              overflow: 'hidden',
              transition: 'all 500ms cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <Alert type="success">
              {billingStatus.availableCredits} crédit{billingStatus.availableCredits > 1 ? 's' : ''} de publication disponible{billingStatus.availableCredits > 1 ? 's' : ''}. Un crédit sera consommé quand la mission sera confirmée avec le candidat.
            </Alert>
          </div>
        ) : null}
        <Card className="wizard-panel">
          <div className="wizard-progress">
            <div className="toolbar">
              <div aria-live="polite" aria-atomic="true">
                <Badge tone="neutral">Étape {step + 1}/{steps.length}</Badge>
                <strong className="wizard-current-step">{steps[step].title}</strong>
                <span className="small">{steps[step].helper}</span>
              </div>
              <div className="wizard-progress-meta" role="status" aria-live="polite">
                <span className="small">{progress}% complété</span>
                {draftStatus === 'saving' ? <span className="small">Sauvegarde...</span> : null}
                {draftStatus === 'saved' ? <span className="small">Brouillon sauvegardé</span> : null}
                {draftStatus === 'error' ? <span className="small">Brouillon non sauvegardé</span> : null}
              </div>
            </div>
            <div
              className="progress"
              role="progressbar"
              aria-label="Progression de la création"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progress}
            >
              <span style={{ width: `${progress}%` }} />
            </div>
          </div>

          <form className="form wizard-form" onSubmit={submit}>
            {error ? <div role="alert"><Alert type="error">{error}</Alert></div> : null}
            <Field label="Établissement rattaché">
              <Select
                required
                value={selectedEstablishmentId}
                onChange={(e) => {
                  const next = establishments.find((item) => item.id === e.target.value);
                  draftDirtyRef.current = true;
                  setSelectedEstablishmentId(e.target.value);
    setForm((current: WizardForm) => ({
                    ...current,
                    city: next?.city || current.city || '',
                    location: next?.address || current.location || '',
                    sector: next?.sector || '',
                    patientType: next?.patientType || '',
                    softwareUsed: next?.softwareUsed || '',
                    hasSecretary: next?.hasSecretary,
                    secretaryType: next?.secretaryType || '',
                    averagePatientsPerDay: next?.averagePatientsPerDay != null ? String(next.averagePatientsPerDay) : '',
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
            <StepContent step={step} form={form} set={set} headingRef={stepHeadingRef} />
            {currentStepValidationError ? (
              <p className="small" id="mission-step-validation" aria-live="polite">
                À compléter pour continuer : {currentStepValidationError}
              </p>
            ) : null}
            <div className="wizard-actions">
              <Button type="button" variant="light" disabled={step === 0 || saving} onClick={previous}>Retour</Button>
              <Button
                disabled={saving || Boolean(currentStepValidationError) || !selectedEstablishmentId}
                aria-describedby={currentStepValidationError ? 'mission-step-validation' : undefined}
              >
                {isLastStep
                  ? saving
                    ? 'Enregistrement...'
                    : form.publishNow
                      ? 'Créer et publier'
                      : 'Enregistrer le brouillon'
                  : 'Continuer'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

function PublicationAccessGate({
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
  onCreateNew,
  drafts,
  onDeleted,
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
  onCreateNew: () => void;
  drafts: Array<{ id: string; title: string; specialty: string; startDate: string }>;
  onDeleted: (draftId: string) => void;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(draftId: string) {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer définitivement ce brouillon ? Cette action libèrera votre crédit de publication.")) {
      return;
    }

    setDeletingId(draftId);
    setDeleteError(null);
    try {
      await api.delete(`/missions/${draftId}`);
      clearApiCache('/establishment/dashboard');
      onDeleted(draftId);
    } catch (err) {
      setDeleteError(errorMessage(err) || "Impossible de supprimer le brouillon.");
    } finally {
      setDeletingId(null);
    }
  }

  const subscriptionAmount = formatCents(billingStatus.prices.monthlySubscription.amount, billingStatus.prices.monthlySubscription.currency);
  const creditAmount = formatCents(billingStatus.prices.publicationCredit.amount, billingStatus.prices.publicationCredit.currency);

  const freeCredits = billingStatus.hasActiveSubscription ? 0 : Math.max(0, billingStatus.availableCredits - drafts.length);

  return (
    <div className="new-mission-page">
      <PageHeader
        title="Publier une annonce"
        description="Choisissez votre mode d'accès ou gérez vos brouillons avant de remplir le formulaire."
      />

      {billingReturnStatus === 'credit-success' ? (
        <CreditPurchaseBanner billingStatus={billingStatus} compact />
      ) : billingNotice ? (
        <Alert type="info">{billingNotice}</Alert>
      ) : null}
      {error || deleteError ? <Alert type="error">{error || deleteError}</Alert> : null}
      {!billingStatus.stripeConfigured ? (
        <Alert type="error">Stripe n'est pas encore configuré sur le serveur. Ajoutez les clés Render avant d'activer les paiements.</Alert>
      ) : null}

      {/* 1. Bandeau de Crédit Disponible */}
      {!billingStatus.hasActiveSubscription && freeCredits > 0 ? (
        <div style={{ marginBottom: 24, border: '1px solid var(--success, #10b981)', borderRadius: 10, overflow: 'hidden' }}>
          <Card className="card-highlight">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <Badge tone="success">Crédit disponible</Badge>
                <h2 style={{ marginTop: 8, fontSize: 18 }}>Vous disposez de {freeCredits} crédit{freeCredits > 1 ? 's' : ''} de publication libre{freeCredits > 1 ? 's' : ''}</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--muted)' }}>
                  Vous pouvez créer une toute nouvelle mission immédiatement en utilisant l'un de vos crédits.
                </p>
              </div>
              <Button type="button" onClick={onCreateNew}>
                Créer une nouvelle mission
              </Button>
            </div>
          </Card>
        </div>
      ) : billingStatus.hasActiveSubscription ? (
        <div style={{ marginBottom: 24, border: '1px solid var(--success, #10b981)', borderRadius: 10, overflow: 'hidden' }}>
          <Card className="card-highlight">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <Badge tone="success">Abonnement actif</Badge>
                <h2 style={{ marginTop: 8, fontSize: 18 }}>Création de missions illimitée</h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--muted)' }}>
                  Votre abonnement vous permet de publier autant d'annonces que vous le souhaitez sans frais supplémentaires.
                </p>
              </div>
              <Button type="button" onClick={onCreateNew}>
                Créer une nouvelle mission
              </Button>
            </div>
          </Card>
        </div>
      ) : null}

      {/* 2. Liste des brouillons existants */}
      {drafts.length > 0 ? (
        <div style={{ marginBottom: 24 }}>
          <Card className="card-highlight publication-access-card">
            <div className="toolbar" style={{ marginBottom: 12 }}>
              <div>
                <h2>Brouillon{drafts.length > 1 ? 's' : ''} en cours trouvé{drafts.length > 1 ? 's' : ''}</h2>
                <p>
                  Vous pouvez reprendre l'un de vos brouillons existants ou le supprimer pour récupérer le crédit associé.
                </p>
              </div>
              <Badge tone="warning">Action requise</Badge>
            </div>

            <div style={{ display: 'grid', gap: 12, marginTop: 16 }}>
              {drafts.map((draft) => (
                <div
                  key={draft.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 20px',
                    background: 'rgba(20, 39, 74, 0.02)',
                    border: '1px solid var(--line)',
                    borderRadius: 10,
                  }}
                >
                  <div>
                    <strong style={{ fontSize: 16, color: 'var(--heading)' }}>{draft.title || 'Mission sans titre'}</strong>
                    <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
                      <span>Spécialité : {draft.specialty || 'Non précisée'}</span>
                      {draft.startDate ? (
                        <>
                          <span style={{ margin: '0 8px' }}>•</span>
                          <span>Début le {formatDate(draft.startDate)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Button
                      type="button"
                      disabled={deletingId !== null}
                      onClick={() => {
                        window.location.href = `/establishment/missions/new?draftId=${draft.id}`;
                      }}
                    >
                      Reprendre
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      disabled={deletingId !== null}
                      onClick={() => void handleDelete(draft.id)}
                    >
                      {deletingId === draft.id ? 'Suppression...' : 'Supprimer le brouillon'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      ) : null}

      {/* Profil de facturation */}
      <div style={{ marginBottom: 24 }}>
        <Card className="card-highlight publication-access-card">
          <div className="toolbar">
            <div>
              <h2>Votre annonce reste acquise</h2>
              <p>Si vous payez une publication unique, le crédit rejoint vos crédits de publication et reste disponible tant qu'il n'a pas été réservé à une mission.</p>
            </div>
            <Badge tone="neutral">Facturation</Badge>
          </div>
        </Card>
      </div>

      {/* 3. Tarifs et abonnement (Stripe) */}
      <div className="publication-plan-grid">
        <Card className="publication-plan-card">
          <div>
            <Badge tone="success">Recommandé</Badge>
            <h2>Abonnement établissement</h2>
            <p>Pour publier plusieurs annonces sans repasser par un paiement unitaire.</p>
          </div>
          <div className="publication-price">
            <strong>{subscriptionAmount}</strong>
            <span>/ mois</span>
          </div>
          <ul className="publication-plan-list">
            <li>Publications incluses tant que l'abonnement est actif</li>
            <li>Gestion de l'abonnement et des factures via Stripe</li>
            <li>Création en brouillon ou publication immédiate</li>
          </ul>
          <Button type="button" disabled={!billingStatus.stripeConfigured || Boolean(busy)} onClick={onSubscribe}>
            {busy === 'subscription' ? 'Redirection...' : "S'abonner"}
          </Button>
        </Card>

        <Card className="publication-plan-card">
          <div>
            <Badge tone="neutral">À l'unité</Badge>
            <h2>Crédit de publication</h2>
            <p>Pour publier une annonce unique, avec un crédit débité seulement après la confirmation de la mission avec le candidat.</p>
          </div>
          <div className="publication-price">
            <strong>{creditAmount}</strong>
            <span>une fois</span>
          </div>
          <ul className="publication-plan-list">
            <li>Valable pour une annonce</li>
            <li>Réservé à la publication, débité à la confirmation de la mission avec le candidat</li>
            <li>Permet aussi de préparer un brouillon</li>
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
        <LinkButton href="/establishment/onboarding" variant="light">Voir mon établissement</LinkButton>
        <LinkButton href="/establishment/missions/new" variant="secondary">Créer une mission</LinkButton>
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

function StepContent({
  step,
  form,
  set,
  headingRef,
}: {
  step: number;
  form: WizardForm;
  set: <K extends keyof WizardForm>(name: K, value: WizardForm[K]) => void;
  headingRef: RefObject<HTMLHeadingElement>;
}) {
  const headingProps = {
    id: 'mission-step-heading',
    ref: headingRef,
    tabIndex: -1,
  };

  if (step === 0) {
    return (
      <section className="wizard-step-content" aria-labelledby="mission-step-heading">
        <div>
          <h2 {...headingProps}>Définissez l'essentiel de la mission</h2>
          <p>Le format, le profil recherché et un intitulé clair suffisent pour poser le besoin.</p>
        </div>
        <ChoiceSection title="Type de mission">
          <ChoiceGrid
            value={form.missionType}
            options={missionTypeOptions}
            onChange={(value) => set('missionType', value as MissionType)}
          />
        </ChoiceSection>
        <ChoiceSection title="Types de profils recherchés">
          <MultiChoiceGrid
            values={safeArray(form.requiredLevels)}
            options={requiredLevelOptions}
            onChange={(values) => {
              set('requiredLevels', values as RequiredLevel[]);
              set('requiredLevel', values[0] as RequiredLevel);
            }}
          />
        </ChoiceSection>
        <Field label="Titre de la mission">
          <Input
            required
            value={form.title || ''}
            onChange={(e) => set('title', e.target.value)}
            placeholder="Remplacement courte durée - journée"
          />
        </Field>
        <SingleChoiceField
          required
          label="Spécialité"
          value={form.specialty || ''}
          options={specialtyOptions}
          onChange={(value) => set('specialty', value)}
        />
      </section>
    );
  }

  if (step === 1) {
    return (
      <section className="wizard-step-content" aria-labelledby="mission-step-heading">
        <div>
          <h2 {...headingProps}>Présentez le contexte de travail</h2>
          <p>Commencez par l'activité. Les précisions d'organisation restent disponibles sans alourdir l'écran.</p>
        </div>
        <Field label="Description">
          <Textarea
            value={form.description || ''}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Contexte, équipe sur place, attentes principales..."
          />
        </Field>
        <SingleChoiceField
          label="Cadre d'exercice"
          value={form.practiceSetting || ''}
          options={practiceSettingOptions}
          onChange={(value) => set('practiceSetting', value)}
        />
        <MultiChoiceTextField
          label="Département / service / type de cabinet"
          value={form.departmentInfo || ''}
          options={establishmentDepartmentOptions}
          onChange={(value) => set('departmentInfo', value)}
        />
        <MultiChoiceTextField
          label="Logiciel utilisé"
          value={form.softwareUsed || ''}
          options={softwareOptions}
          onChange={(value) => set('softwareUsed', value)}
        />
        <MultiChoiceField
          label="Actes attendus"
          values={safeArray(form.requiredActs)}
          options={missionActOptions}
          onChange={(values) => set('requiredActs', values)}
        />

        <ProgressiveDisclosure title="Organisation et patientèle">
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
          <SingleChoiceField
            label="Type de secrétariat"
            value={form.secretaryType || ''}
            options={secretaryTypeOptions}
            onChange={(value) => set('secretaryType', value)}
          />
          <MultiChoiceTextField
            label="Type de patientèle"
            value={form.patientType || ''}
            options={patientTypeOptions}
            onChange={(value) => set('patientType', value)}
          />
          <div className="form-row">
            <Field label="Patients par jour en moyenne">
              <NumberStepper
                min={0}
                step={1}
                value={form.averagePatientsPerDay ?? ''}
                onChange={(value) => set('averagePatientsPerDay', value)}
                placeholder="Ex : 25"
              />
            </Field>
            <Field label="Cabinet pluridisciplinaire">
              <Select
                value={form.isMultidisciplinary === true ? 'true' : form.isMultidisciplinary === false ? 'false' : ''}
                onChange={(e) => set('isMultidisciplinary', e.target.value === '' ? undefined : e.target.value === 'true')}
              >
                <option value="">Non précisé</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </Select>
            </Field>
          </div>
        </ProgressiveDisclosure>

        <ProgressiveDisclosure title="Équipe et équipement">
          <MultiChoiceField
            label="Matériel disponible"
            values={safeArray(form.equipmentAvailable)}
            options={equipmentOptions}
            onChange={(values) => set('equipmentAvailable', values)}
          />
          <Field label="Équipe sur place">
            <Textarea
              value={form.teamInfo || ''}
              onChange={(e) => set('teamInfo', e.target.value)}
              placeholder="Médecin senior joignable, IDE de nuit, secrétariat présent..."
            />
          </Field>
          <Field label="Compléments sur le matériel">
            <Textarea
              value={form.equipmentInfo || ''}
              onChange={(e) => set('equipmentInfo', e.target.value)}
              placeholder="Échographe, radio, box dédiés, aide opératoire..."
            />
          </Field>
        </ProgressiveDisclosure>
      </section>
    );
  }

  if (step === 2) {
    return (
      <section className="wizard-step-content" aria-labelledby="mission-step-heading">
        <div>
          <h2 {...headingProps}>Situez la mission</h2>
          <p>La ville est publique. L'adresse et les conditions d'accueil peuvent être précisées selon le besoin.</p>
        </div>
        <SingleChoiceField
          required
          label="Ville"
          value={form.city || ''}
          options={cityOptions}
          onChange={(value) => set('city', value)}
        />
        <SingleChoiceField
          label="Secteur conventionné"
          value={form.sector || ''}
          options={sectorOptions}
          onChange={(value) => set('sector', value)}
        />
        <Field label="Lieu précis">
          <Input
            value={form.location || ''}
            onChange={(e) => set('location', e.target.value)}
            placeholder="Service, adresse ou site"
          />
        </Field>
        <ProgressiveDisclosure title="Accueil, hébergement et accès">
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
          <Field label="Informations pratiques d'accès">
            <Textarea
              value={form.practicalInfo || ''}
              onChange={(e) => set('practicalInfo', e.target.value)}
              placeholder="Accès badge, entrée de nuit, transports, contact à l'arrivée..."
            />
          </Field>
        </ProgressiveDisclosure>
      </section>
    );
  }

  if (step === 3) {
    const minimumDate = tomorrowDateInput();
    const minimumEndDate = form.startDate && form.startDate > minimumDate ? form.startDate : minimumDate;
    return (
      <section className="wizard-step-content" aria-labelledby="mission-step-heading">
        <div>
          <h2 {...headingProps}>Cadrez le planning et la rémunération</h2>
          <p>Des dates cohérentes et des conditions lisibles évitent les échanges inutiles avant candidature.</p>
        </div>
        <div className="form-row">
          <Field label="Date de début">
            <Input
              type="date"
              required
              min={minimumDate}
              value={form.startDate || ''}
              onChange={(e) => {
                const nextStartDate = e.target.value;
                set('startDate', nextStartDate);
                if (form.endDate && form.endDate < nextStartDate) set('endDate', '');
              }}
            />
          </Field>
          <Field label="Date de fin">
            <Input
              type="date"
              min={minimumEndDate}
              value={form.endDate || ''}
              onChange={(e) => set('endDate', e.target.value)}
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Heure de début">
            <Input type="time" value={form.startTime || ''} onChange={(e) => set('startTime', e.target.value)} />
          </Field>
          <Field label="Heure de fin">
            <Input type="time" value={form.endTime || ''} onChange={(e) => set('endTime', e.target.value)} />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Durée estimée en heures">
            <NumberStepper
              min={1}
              max={72}
              step={1}
              value={form.durationHours || ''}
              onChange={(value) => set('durationHours', value)}
            />
          </Field>
          <SingleChoiceField
            label="Format de durée"
            value={safeArray(form.preferredDurations)[0] || ''}
            options={durationOptions}
            onChange={(value) => set('preferredDurations', value ? [value] : [])}
          />
        </div>
        <div className="form-row">
          <Field label="Pourcentage de rétrocession">
            <NumberStepper
              min={1}
              max={100}
              step={1}
              value={form.retrocessionPercentage || ''}
              onChange={(value) => set('retrocessionPercentage', value)}
              suffix="%"
            />
          </Field>
          <Field label="Rémunération minimale indicative">
            <NumberStepper
              min={0}
              max={100}
              step={1}
              value={form.minimumCompensation ?? ''}
              onChange={(value) => set('minimumCompensation', value)}
              placeholder="Ex : 70"
              suffix="%"
            />
          </Field>
        </div>
      </section>
    );
  }

  if (step === 4) {
    return (
      <section className="wizard-step-content" aria-labelledby="mission-step-heading">
        <div>
          <h2 {...headingProps}>Choisissez la visibilité</h2>
          <p>Les tags restent facultatifs. Le statut choisi ici détermine réellement si la mission est publiée ou privée.</p>
        </div>
        <Field label="Tags, séparés par des virgules">
          <Input
            value={form.tagsText || ''}
            onChange={(e) => set('tagsText', e.target.value)}
            placeholder="urgent, nuit, week-end"
          />
        </Field>
        <MultiChoiceField
          label="Types de missions associés"
          values={safeArray(form.acceptedMissionTypes)}
          options={acceptedMissionTypeOptions}
          onChange={(values) => set('acceptedMissionTypes', values)}
        />
        <div className="publish-choice" role="group" aria-label="Statut après enregistrement">
          <button
            type="button"
            className={form.publishNow ? 'active' : ''}
            aria-pressed={form.publishNow === true}
            onClick={() => set('publishNow', true)}
          >
            <strong>Publier maintenant</strong>
            <span>La mission sera visible et partageable dès la validation.</span>
          </button>
          <button
            type="button"
            className={!form.publishNow ? 'active' : ''}
            aria-pressed={form.publishNow === false}
            onClick={() => set('publishNow', false)}
          >
            <strong>Garder en brouillon</strong>
            <span>La mission restera privée et aucun appel de publication ne sera effectué.</span>
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="wizard-step-content" aria-labelledby="mission-step-heading">
      <div>
        <h2 {...headingProps}>Vérifiez avant d'enregistrer</h2>
        <p>
          {form.publishNow
            ? 'La mission sera publiée immédiatement après cette validation.'
            : 'La mission restera en brouillon privé jusqu’à une publication volontaire.'}
        </p>
      </div>
      <MissionDraftSummary form={form} compact />
    </section>
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

function ProgressiveDisclosure({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="choice-section">
      <summary className="choice-section-title">{title} (facultatif)</summary>
      <div className="wizard-step-content" style={{ paddingTop: 12 }}>
        {children}
      </div>
    </details>
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
          aria-pressed={value === option.value}
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
  value?: boolean | null;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="boolean-choice">
      <span>{label}</span>
      <div className="segmented-control">
        <button
          type="button"
          className={value === true ? 'active' : ''}
          aria-pressed={value === true}
          onClick={() => onChange(true)}
        >
          Oui
        </button>
        <button
          type="button"
          className={value === false ? 'active' : ''}
          aria-pressed={value === false}
          onClick={() => onChange(false)}
        >
          Non
        </button>
      </div>
    </div>
  );
}

function MissionDraftSummary({ form, compact = false }: { form: WizardForm; compact?: boolean }) {
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
        <div><span>Cadre</span><strong>{form.practiceSetting || '-'}</strong></div>
        <div><span>Ville</span><strong>{form.city || '-'}</strong></div>
        <div><span>Secteur conventionné</span><strong>{sectorLabel(form.sector)}</strong></div>
        <div><span>Patientèle</span><strong>{form.patientType || '-'}</strong></div>
        <div><span>Logiciel</span><strong>{form.softwareUsed || '-'}</strong></div>
        <div><span>Secrétaire</span><strong>{form.hasSecretary === undefined || form.hasSecretary === null ? '-' : form.hasSecretary ? 'Oui' : 'Non'}</strong></div>
        <div><span>Service</span><strong>{form.departmentInfo || '-'}</strong></div>
        <div><span>Actes attendus</span><strong>{safeArray(form.requiredActs).join(', ') || '-'}</strong></div>
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


