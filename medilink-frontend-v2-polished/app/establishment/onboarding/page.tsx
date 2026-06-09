'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Establishment, EstablishmentBillingStatus, EstablishmentType } from '@/lib/types';
import { formatDate } from '@/lib/format';
import { establishmentTypeLabel, establishmentTypeOptions, statusLabel } from '@/lib/labels';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { MultiChoiceField, MultiChoiceTextField, SingleChoiceField } from '@/components/FormChoiceFields';
import { Alert, Badge, Button, Card, Field, Input, LinkButton, LoadingCard, PageHeader, ProgressBar, Select, Textarea } from '@/components/ui';
import {
  acceptedMissionTypeOptions,
  cityOptions,
  countryOptions,
  durationOptions,
  equipmentOptions,
  mobilityOptions,
  patientTypeOptions,
  refusedScheduleOptions,
  sectorOptions,
  secretaryTypeOptions,
  softwareOptions,
} from '@/lib/profile-options';

type EstablishmentInfoTab = 'establishments' | 'create' | 'billing';

const infoTabs: Array<{ id: EstablishmentInfoTab; label: string }> = [
  { id: 'establishments', label: 'Mes établissements' },
  { id: 'create', label: 'Créer' },
  { id: 'billing', label: 'Achat et abonnement' },
];

function sectorLabel(value?: string | null) {
  return sectorOptions.find((option) => option.value === value)?.label || value || 'Secteur non renseigné';
}

function booleanLabel(value?: boolean | null) {
  if (value === true) return 'Secrétaire présent';
  if (value === false) return 'Pas de secrétaire';
  return 'Secrétariat non renseigné';
}

export default function EstablishmentOnboardingPage() {
  const { establishments, loading, reload } = useEstablishments();
  const [form, setForm] = useState<any>({ type: 'HOSPITAL', country: 'France' });
  const [activeTab, setActiveTab] = useState<EstablishmentInfoTab>('establishments');
  const [billingByEstablishment, setBillingByEstablishment] = useState<Record<string, EstablishmentBillingStatus>>({});
  const [billingLoadingIds, setBillingLoadingIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [billingBusyId, setBillingBusyId] = useState<string | null>(null);

  function set(name: string, value: unknown) {
    setForm((p: any) => ({ ...p, [name]: value }));
  }

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const queryTab = new URLSearchParams(window.location.search).get('tab');
    if (queryTab === 'create' || queryTab === 'billing') setActiveTab(queryTab);
  }, []);

  useEffect(() => {
    let cancelled = false;

    establishments.forEach((establishment) => {
      setBillingLoadingIds((current) => ({ ...current, [establishment.id]: true }));
      api.get<EstablishmentBillingStatus>(`/billing/establishments/${establishment.id}/status`)
        .then((status) => {
          if (cancelled) return;
          setBillingByEstablishment((current) => ({ ...current, [establishment.id]: status }));
        })
        .catch(() => undefined)
        .finally(() => {
          if (!cancelled) setBillingLoadingIds((current) => ({ ...current, [establishment.id]: false }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [establishments]);

  function selectTab(tab: EstablishmentInfoTab) {
    setActiveTab(tab);
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (tab === 'establishments') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.post<Establishment>('/establishments', {
        ...form,
        mobilityOptions: cleanArray(form.mobilityOptions),
        acceptedMissionTypes: cleanArray(form.acceptedMissionTypes),
        minimumCompensation: form.minimumCompensation === '' || form.minimumCompensation == null ? undefined : Number(form.minimumCompensation),
        averagePatientsPerDay: form.averagePatientsPerDay === '' || form.averagePatientsPerDay == null ? undefined : Number(form.averagePatientsPerDay),
        equipmentAvailable: cleanArray(form.equipmentAvailable),
        preferredDurations: cleanArray(form.preferredDurations),
        refusedSchedules: cleanArray(form.refusedSchedules),
        acceptedPatientTypes: cleanArray(form.acceptedPatientTypes),
        knownSoftware: cleanArray(form.knownSoftware),
      });
      setMessage('Établissement créé.');
      await reload();
      setActiveTab('establishments');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(establishment: Establishment) {
    if (!confirm(`Supprimer définitivement l'établissement "${establishment.name}" ? Les missions, candidatures et conversations liées seront aussi supprimées.`)) {
      return;
    }

    setDeletingId(establishment.id);
    setError(null);
    setMessage(null);

    try {
      await api.delete(`/establishments/${establishment.id}`);
      setMessage('Établissement supprimé.');
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function startBillingCheckout(kind: 'subscription' | 'credit', establishmentId: string) {
    setBillingBusyId(`${kind}:${establishmentId}`);
    setError(null);
    setMessage(null);
    try {
      const endpoint = kind === 'subscription'
        ? '/billing/checkout/subscription'
        : '/billing/checkout/publication-credit';
      const response = await api.post<{ url: string }>(endpoint, { establishmentId });
      window.location.href = response.url;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBillingBusyId(null);
    }
  }

  async function openBillingPortal(establishmentId: string) {
    setBillingBusyId(`portal:${establishmentId}`);
    setError(null);
    setMessage(null);
    try {
      const response = await api.post<{ url: string }>('/billing/portal', { establishmentId });
      window.location.href = response.url;
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBillingBusyId(null);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader title="Établissement" description="Créez ou consultez votre établissement recruteur." />
      <div className="candidate-page-tabs billing-tabs" role="tablist" aria-label="Sections établissement" style={{ marginBottom: 18 }}>
        {infoTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={activeTab === tab.id ? 'active' : ''}
            onClick={() => selectTab(tab.id)}
            role="tab"
            aria-selected={activeTab === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {message ? <Alert type="success">{message}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}

      {activeTab === 'establishments' ? (
        <Card>
          <h2>Mes établissements</h2>
          {establishments.length === 0 ? <p>Aucun établissement.</p> : null}
          {establishments.map((establishment) => (
            <div key={establishment.id} className="toolbar" style={{ marginTop: 12 }}>
              <div>
                <strong>{establishment.name}</strong>
                <br />
                <span className="small">
                  {establishmentTypeLabel(establishment.type)} - {establishment.city || 'Ville non renseignée'}
                </span>
                <br />
                <span className="small">
                  {sectorLabel(establishment.sector)}
                  {establishment.patientType ? ` - ${establishment.patientType}` : ''}
                  {establishment.softwareUsed ? ` - ${establishment.softwareUsed}` : ''}
                  {` - ${booleanLabel(establishment.hasSecretary)}`}
                </span>
                <br />
                <Badge tone={establishment.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}>
                  {statusLabel(establishment.verificationStatus)}
                </Badge>
                <div className="stat" style={{ marginTop: 12 }}>
                  <span>Complétion du profil</span>
                  <strong>{establishment.completionScore}%</strong>
                  <ProgressBar value={establishment.completionScore} />
                </div>
                <EstablishmentCreditSummary
                  status={billingByEstablishment[establishment.id]}
                  loading={billingLoadingIds[establishment.id]}
                />
                <div className="divider" />
                <div style={{ marginTop: 8 }}>
                  <LinkButton href={`/establishment/edit/${establishment.id}`} variant="secondary">
                    Modifier l'établissement ({establishment.photos?.length || 0})
                  </LinkButton>
                </div>
              </div>
              <Button
                type="button"
                variant="danger"
                disabled={deletingId === establishment.id}
                onClick={() => void remove(establishment)}
              >
                {deletingId === establishment.id ? 'Suppression...' : 'Supprimer'}
              </Button>
            </div>
          ))}
        </Card>
      ) : null}

      {activeTab === 'create' ? (
        <Card>
          <h2>Créer un établissement</h2>
          <form className="form" onSubmit={submit}>
            <Field label="Nom"><Input required value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => set('type', e.target.value as EstablishmentType)}>
                {establishmentTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <div className="form-row">
              <SingleChoiceField label="Ville" value={form.city || ''} options={cityOptions} onChange={(value) => set('city', value)} />
              <SingleChoiceField label="Pays" value={form.country || ''} options={countryOptions} onChange={(value) => set('country', value)} />
            </div>
            <SingleChoiceField label="Secteur" value={form.sector || ''} options={sectorOptions} onChange={(value) => set('sector', value)} />
            <MultiChoiceTextField label="Type de patientèle" value={form.patientType || ''} options={patientTypeOptions} onChange={(value) => set('patientType', value)} />
            <MultiChoiceTextField label="Logiciel utilisé" value={form.softwareUsed || ''} options={softwareOptions} onChange={(value) => set('softwareUsed', value)} />
            <Field label="Présence de secrétaire">
              <Select
                value={form.hasSecretary === true ? 'true' : form.hasSecretary === false ? 'false' : ''}
                onChange={(e) => set('hasSecretary', e.target.value === '' ? undefined : e.target.value === 'true')}
              >
                <option value="">Non renseigné</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </Select>
            </Field>
            <SingleChoiceField label="Type de secrétariat" value={form.secretaryType || ''} options={secretaryTypeOptions} onChange={(value) => set('secretaryType', value)} />
            <div className="form-row">
              <Field label="Patients par jour en moyenne">
                <Input type="number" min={0} value={form.averagePatientsPerDay ?? ''} onChange={(e) => set('averagePatientsPerDay', e.target.value)} placeholder="Ex : 25" />
              </Field>
              <Field label="Cabinet pluridisciplinaire">
                <Select
                  value={form.isMultidisciplinary === true ? 'true' : form.isMultidisciplinary === false ? 'false' : ''}
                  onChange={(e) => set('isMultidisciplinary', e.target.value === '' ? undefined : e.target.value === 'true')}
                >
                  <option value="">Non renseigné</option>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </Select>
              </Field>
            </div>
            <MultiChoiceField label="Matériel disponible" values={safeArray(form.equipmentAvailable)} options={equipmentOptions} onChange={(values) => set('equipmentAvailable', values)} />
            <div className="profile-preferences-section">
              <h3>Critères habituels de mission</h3>
              <MultiChoiceField label="Mobilité utile" values={safeArray(form.mobilityOptions)} options={mobilityOptions} onChange={(values) => set('mobilityOptions', values)} />
              <MultiChoiceField label="Types de missions proposées" values={safeArray(form.acceptedMissionTypes)} options={acceptedMissionTypeOptions} onChange={(values) => set('acceptedMissionTypes', values)} />
              <MultiChoiceField label="Durées habituelles" values={safeArray(form.preferredDurations)} options={durationOptions} onChange={(values) => set('preferredDurations', values)} />
              <MultiChoiceField label="Horaires rarement proposés" values={safeArray(form.refusedSchedules)} options={refusedScheduleOptions} onChange={(values) => set('refusedSchedules', values)} />
              <MultiChoiceField label="Patientèles reçues" values={safeArray(form.acceptedPatientTypes)} options={patientTypeOptions} onChange={(values) => set('acceptedPatientTypes', values)} />
              <MultiChoiceField label="Logiciels utilisés" values={safeArray(form.knownSoftware)} options={softwareOptions} onChange={(values) => set('knownSoftware', values)} />
              <Field label="Rémunération minimale habituelle (EUR)">
                <Input type="number" min={0} value={form.minimumCompensation ?? ''} onChange={(e) => set('minimumCompensation', e.target.value)} placeholder="Ex : 600" />
              </Field>
            </div>
            <Field label="Adresse"><Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
            <div className="form-row">
              <Field label="Email"><Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Telephone"><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
            </div>
            <Field label="Site web"><Input value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://..." /></Field>
            <Field label="Description du cabinet"><Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Organisation du cabinet, ambiance, spécialités présentes..." /></Field>
            <Button disabled={saving}>{saving ? 'Création...' : 'Créer'}</Button>
          </form>
        </Card>
      ) : null}

      {activeTab === 'billing' ? (
        <EstablishmentBillingTab
          establishments={establishments}
          billingByEstablishment={billingByEstablishment}
          billingLoadingIds={billingLoadingIds}
          busyId={billingBusyId}
          onSubscribe={(establishmentId) => void startBillingCheckout('subscription', establishmentId)}
          onBuyCredit={(establishmentId) => void startBillingCheckout('credit', establishmentId)}
          onOpenPortal={(establishmentId) => void openBillingPortal(establishmentId)}
        />
      ) : null}
    </>
  );
}

function EstablishmentBillingTab({
  establishments,
  billingByEstablishment,
  billingLoadingIds,
  busyId,
  onSubscribe,
  onBuyCredit,
  onOpenPortal,
}: {
  establishments: Establishment[];
  billingByEstablishment: Record<string, EstablishmentBillingStatus>;
  billingLoadingIds: Record<string, boolean>;
  busyId: string | null;
  onSubscribe: (establishmentId: string) => void;
  onBuyCredit: (establishmentId: string) => void;
  onOpenPortal: (establishmentId: string) => void;
}) {
  if (establishments.length === 0) {
    return (
      <Card>
        <h2>Achat et abonnement</h2>
        <p>Créez d'abord un établissement pour activer les achats de crédits et les abonnements.</p>
      </Card>
    );
  }

  return (
    <div className="grid">
      {establishments.map((establishment) => {
        const status = billingByEstablishment[establishment.id];
        const loading = billingLoadingIds[establishment.id];

        return (
          <Card key={establishment.id} className="dashboard-panel">
            <div className="toolbar compact">
              <div>
                <h2>{establishment.name}</h2>
                <p className="small">{establishment.city || 'Ville non renseignée'} - {establishmentTypeLabel(establishment.type)}</p>
              </div>
              {status?.hasActiveSubscription ? <Badge tone="success">Abonnement actif</Badge> : <Badge tone="warning">Accès publication</Badge>}
            </div>

            {loading && !status ? (
              <LoadingCard label="Chargement de l'abonnement..." />
            ) : status ? (
              <BillingStatusPanel
                status={status}
                subscribing={busyId === `subscription:${establishment.id}`}
                buyingCredit={busyId === `credit:${establishment.id}`}
                openingPortal={busyId === `portal:${establishment.id}`}
                onSubscribe={() => onSubscribe(establishment.id)}
                onBuyCredit={() => onBuyCredit(establishment.id)}
                onOpenPortal={() => onOpenPortal(establishment.id)}
              />
            ) : (
              <Alert type="error">Impossible de charger les informations d'achat.</Alert>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function BillingStatusPanel({
  status,
  subscribing,
  buyingCredit,
  openingPortal,
  onSubscribe,
  onBuyCredit,
  onOpenPortal,
}: {
  status: EstablishmentBillingStatus;
  subscribing: boolean;
  buyingCredit: boolean;
  openingPortal: boolean;
  onSubscribe: () => void;
  onBuyCredit: () => void;
  onOpenPortal: () => void;
}) {
  const subscription = status.subscription;
  const isSubscribed = status.hasActiveSubscription;
  const subscriptionLabel = isSubscribed ? 'Actif' : 'Inactif';
  const periodEnd = subscription?.currentPeriodEnd ? formatDate(subscription.currentPeriodEnd) : null;
  const isCancelled = subscription?.cancelAtPeriodEnd;

  const monthlySubPrice = formatCents(status.prices.monthlySubscription.amount, status.prices.monthlySubscription.currency);
  const singleCreditPrice = formatCents(status.prices.publicationCredit.amount, status.prices.publicationCredit.currency);

  return (
    <div className="premium-billing-panel">
      {/* 1. Status overview hero */}
      <div className="premium-billing-hero">
        <div className="hero-status-glow"></div>
        <div className="hero-content">
          <span className="hero-pretitle">Aperçu du compte</span>
          <div className="hero-title-row">
            <h2>Mode de publication</h2>
            {isSubscribed ? (
              <span className="premium-badge badge-success">Abonnement Actif</span>
            ) : status.availableCredits > 0 ? (
              <span className="premium-badge badge-info">{status.availableCredits} Crédit{status.availableCredits > 1 ? 's' : ''} disponible{status.availableCredits > 1 ? 's' : ''}</span>
            ) : (
              <span className="premium-badge badge-warning">Aucun crédit actif</span>
            )}
          </div>
          <p className="hero-desc">
            {isSubscribed 
              ? "Vous bénéficiez de publications de missions illimitées. Votre facturation est gérée automatiquement via Stripe."
              : "Vous publiez vos missions à l'unité. Les crédits achetés sont débités uniquement lorsqu'un candidat accepte votre mission."
            }
          </p>
        </div>
      </div>

      {/* 2. Visual KPI Metrics */}
      <div className="premium-kpi-grid">
        <div className="premium-kpi-card highlight-kpi">
          <div className="kpi-icon">🎫</div>
          <div className="kpi-info">
            <span>Crédits Disponibles</span>
            <strong>{status.availableCredits}</strong>
            <small>Prêts pour publication</small>
          </div>
        </div>

        <div className="premium-kpi-card">
          <div className="kpi-icon">⏳</div>
          <div className="kpi-info">
            <span>Crédits Réservés</span>
            <strong>{status.reservedCredits}</strong>
            <small>Sur annonces en ligne</small>
          </div>
        </div>

        <div className="premium-kpi-card">
          <div className="kpi-icon">✅</div>
          <div className="kpi-info">
            <span>Crédits Utilisés</span>
            <strong>{status.consumedCredits}</strong>
            <small>Missions validées</small>
          </div>
        </div>

        <div className={`premium-kpi-card status-card ${isSubscribed ? 'subscribed' : 'unsubscribed'}`}>
          <div className="kpi-icon">💳</div>
          <div className="kpi-info">
            <span>Formule Abonnement</span>
            <strong>{subscriptionLabel}</strong>
            {isSubscribed && periodEnd ? (
              <small>
                {isCancelled ? 'Ferme le ' : 'Renouvellement : '}
                {periodEnd}
              </small>
            ) : (
              <small>Publications unitaires</small>
            )}
          </div>
        </div>
      </div>

      {!status.stripeConfigured ? (
        <Alert type="error">Stripe n'est pas encore configuré sur le serveur.</Alert>
      ) : null}

      {/* 3. Side-by-side Pricing Plan Cards */}
      <div className="premium-pricing-section">
        <h3>Nos Formules d'Accès</h3>
        <div className="premium-plans-grid">
          
          {/* Card 1: Subscription */}
          <div className={`premium-plan-card ${isSubscribed ? 'active-plan' : ''}`}>
            {isSubscribed && <div className="plan-ribbon">Formule Actuelle</div>}
            <div className="plan-header">
              <span className="plan-badge">Abonnement</span>
              <h4>Accès Illimité</h4>
              <p>Idéal pour recruter régulièrement sans limites.</p>
            </div>
            <div className="plan-price">
              <strong>{monthlySubPrice}</strong>
              <span>/ mois</span>
            </div>
            <ul className="plan-features">
              <li>
                <span className="feature-check">✓</span>
                Publications de missions illimitées
              </li>
              <li>
                <span className="feature-check">✓</span>
                Gestion automatique des brouillons
              </li>
              <li>
                <span className="feature-check">✓</span>
                Aucun paiement unitaire par mission
              </li>
              <li>
                <span className="feature-check">✓</span>
                Résiliation en un clic via Stripe
              </li>
            </ul>
            <div className="plan-action">
              {isSubscribed ? (
                <Button type="button" disabled={!status.stripeConfigured || openingPortal} onClick={onOpenPortal}>
                  {openingPortal ? 'Ouverture...' : 'Gérer mon abonnement'}
                </Button>
              ) : (
                <Button type="button" disabled={!status.stripeConfigured || subscribing} onClick={onSubscribe}>
                  {subscribing ? 'Redirection...' : "S'abonner"}
                </Button>
              )}
            </div>
          </div>

          {/* Card 2: Single Credit */}
          <div className={`premium-plan-card ${!isSubscribed && status.availableCredits > 0 ? 'active-plan' : ''}`}>
            <div className="plan-header">
              <span className="plan-badge badge-neutral">À l'unité</span>
              <h4>Crédit Mission</h4>
              <p>Idéal pour les recrutements ponctuels ou d'urgence.</p>
            </div>
            <div className="plan-price">
              <strong>{singleCreditPrice}</strong>
              <span>/ mission</span>
            </div>
            <ul className="plan-features">
              <li>
                <span className="feature-check">✓</span>
                Achat d'un crédit de publication unique
              </li>
              <li>
                <span className="feature-check">✓</span>
                Débité uniquement à l'acceptation candidat
              </li>
              <li>
                <span className="feature-check">✓</span>
                Crédit valable sans limite de durée
              </li>
              <li>
                <span className="feature-check">✓</span>
                Brouillons gratuits et illimités
              </li>
            </ul>
            <div className="plan-action">
              <Button type="button" variant="secondary" disabled={!status.stripeConfigured || buyingCredit} onClick={onBuyCredit}>
                {buyingCredit ? 'Redirection...' : 'Acheter un crédit'}
              </Button>
            </div>
          </div>

        </div>
      </div>

      {/* 4. Bottom Main Actions */}
      <div className="premium-billing-actions">
        <Button type="button" variant="light" disabled={!status.stripeConfigured || openingPortal} onClick={onOpenPortal}>
          {openingPortal ? 'Ouverture...' : 'Gérer / résilier'}
        </Button>
      </div>
    </div>
  );
}

function EstablishmentCreditSummary({
  status,
  loading,
}: {
  status?: EstablishmentBillingStatus;
  loading?: boolean;
}) {
  if (loading && !status) {
    return (
      <div className="establishment-credit-card is-loading">
        <span>Accès publication</span>
        <strong>Verification...</strong>
      </div>
    );
  }

  if (!status) return null;

  const available = status.availableCredits;
  const reserved = status.reservedCredits;
  const consumed = status.consumedCredits;
  const tone = status.hasActiveSubscription || available > 0 ? 'is-ready' : reserved > 0 ? 'is-reserved' : 'is-empty';

  return (
    <div className={`establishment-credit-card ${tone}`}>
      <div>
        <span>Credits mission</span>
        <strong>
          {status.hasActiveSubscription
            ? 'Abonnement actif'
            : available > 0
              ? `${available} disponible${available > 1 ? 's' : ''}`
              : reserved > 0
                ? `${reserved} reserve${reserved > 1 ? 's' : ''}`
                : 'Aucun credit'}
        </strong>
        <p>
          {status.hasActiveSubscription
            ? 'Les annonces peuvent etre publiees sans paiement unitaire.'
            : available > 0
              ? "Débit uniquement quand un candidat accepte une mission."
              : reserved > 0
                ? "Réservé à une annonce publiée, débité à l'acceptation candidat."
                : 'Ajoutez un credit pour publier une annonce unique.'}
        </p>
      </div>
      <div className="establishment-credit-counts">
        <div><span>Disponibles</span><strong>{available}</strong></div>
        <div><span>Reserves</span><strong>{reserved}</strong></div>
        <div><span>Utilises</span><strong>{consumed}</strong></div>
      </div>
      <div className="actions">
        <LinkButton href="/establishment/missions/new" variant={available > 0 || status.hasActiveSubscription ? 'secondary' : 'light'}>
          {available > 0 || status.hasActiveSubscription ? 'Creer une mission' : 'Acheter un credit'}
        </LinkButton>
      </div>
    </div>
  );
}

function formatCents(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function cleanArray(value: unknown): string[] {
  return safeArray(value).map((item) => item.trim()).filter(Boolean);
}
