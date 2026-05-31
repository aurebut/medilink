'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import type { Establishment, EstablishmentType } from '@/lib/types';
import { establishmentTypeLabel, establishmentTypeOptions, statusLabel } from '@/lib/labels';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { MultiChoiceField, SingleChoiceField } from '@/components/FormChoiceFields';
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

function sectorLabel(value?: string | null) {
  return sectorOptions.find((option) => option.value === value)?.label || value || 'Secteur non renseigne';
}

function booleanLabel(value?: boolean | null) {
  if (value === true) return 'Secretaire present';
  if (value === false) return 'Pas de secretaire';
  return 'Secretariat non renseigne';
}

export default function EstablishmentOnboardingPage() {
  const { establishments, loading, reload } = useEstablishments();
  const [form, setForm] = useState<any>({ type: 'HOSPITAL', country: 'France' });
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function set(name: string, value: unknown) {
    setForm((p: any) => ({ ...p, [name]: value }));
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
      setMessage('Etablissement cree.');
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(establishment: Establishment) {
    if (!confirm(`Supprimer definitivement l'etablissement "${establishment.name}" ? Les missions, candidatures et conversations liees seront aussi supprimees.`)) {
      return;
    }

    setDeletingId(establishment.id);
    setError(null);
    setMessage(null);

    try {
      await api.delete(`/establishments/${establishment.id}`);
      setMessage('Etablissement supprime.');
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader title="Etablissement" description="Creez ou consultez votre etablissement recruteur." />
      <div className="grid-2">
        <Card>
          <h2>Mes etablissements</h2>
          {message ? <Alert type="success">{message}</Alert> : null}
          {error ? <Alert type="error">{error}</Alert> : null}
          {establishments.length === 0 ? <p>Aucun etablissement.</p> : null}
          {establishments.map((establishment) => (
            <div key={establishment.id} className="toolbar" style={{ marginTop: 12 }}>
              <div>
                <strong>{establishment.name}</strong>
                <br />
                <span className="small">
                  {establishmentTypeLabel(establishment.type)} - {establishment.city || 'Ville non renseignee'}
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

        <Card>
          <h2>Creer un etablissement</h2>
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
            <SingleChoiceField label="Type de patientele" value={form.patientType || ''} options={patientTypeOptions} onChange={(value) => set('patientType', value)} />
            <SingleChoiceField label="Logiciel utilise" value={form.softwareUsed || ''} options={softwareOptions} onChange={(value) => set('softwareUsed', value)} />
            <Field label="Presence de secretaire">
              <Select
                value={form.hasSecretary === true ? 'true' : form.hasSecretary === false ? 'false' : ''}
                onChange={(e) => set('hasSecretary', e.target.value === '' ? undefined : e.target.value === 'true')}
              >
                <option value="">Non renseigne</option>
                <option value="true">Oui</option>
                <option value="false">Non</option>
              </Select>
            </Field>
            <SingleChoiceField label="Type de secretariat" value={form.secretaryType || ''} options={secretaryTypeOptions} onChange={(value) => set('secretaryType', value)} />
            <div className="form-row">
              <Field label="Patients par jour en moyenne">
                <Input type="number" min={0} value={form.averagePatientsPerDay ?? ''} onChange={(e) => set('averagePatientsPerDay', e.target.value)} placeholder="Ex : 25" />
              </Field>
              <Field label="Cabinet pluridisciplinaire">
                <Select
                  value={form.isMultidisciplinary === true ? 'true' : form.isMultidisciplinary === false ? 'false' : ''}
                  onChange={(e) => set('isMultidisciplinary', e.target.value === '' ? undefined : e.target.value === 'true')}
                >
                  <option value="">Non renseigne</option>
                  <option value="true">Oui</option>
                  <option value="false">Non</option>
                </Select>
              </Field>
            </div>
            <MultiChoiceField label="Materiel disponible" values={safeArray(form.equipmentAvailable)} options={equipmentOptions} onChange={(values) => set('equipmentAvailable', values)} />
            <div className="profile-preferences-section">
              <h3>Criteres habituels de mission</h3>
              <MultiChoiceField label="Mobilite utile" values={safeArray(form.mobilityOptions)} options={mobilityOptions} onChange={(values) => set('mobilityOptions', values)} />
              <MultiChoiceField label="Types de missions proposees" values={safeArray(form.acceptedMissionTypes)} options={acceptedMissionTypeOptions} onChange={(values) => set('acceptedMissionTypes', values)} />
              <MultiChoiceField label="Durees habituelles" values={safeArray(form.preferredDurations)} options={durationOptions} onChange={(values) => set('preferredDurations', values)} />
              <MultiChoiceField label="Horaires rarement proposes" values={safeArray(form.refusedSchedules)} options={refusedScheduleOptions} onChange={(values) => set('refusedSchedules', values)} />
              <MultiChoiceField label="Patienteles recues" values={safeArray(form.acceptedPatientTypes)} options={patientTypeOptions} onChange={(values) => set('acceptedPatientTypes', values)} />
              <MultiChoiceField label="Logiciels utilises" values={safeArray(form.knownSoftware)} options={softwareOptions} onChange={(values) => set('knownSoftware', values)} />
              <Field label="Remuneration minimale habituelle (EUR)">
                <Input type="number" min={0} value={form.minimumCompensation ?? ''} onChange={(e) => set('minimumCompensation', e.target.value)} placeholder="Ex : 600" />
              </Field>
            </div>
            <Field label="Adresse"><Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
            <div className="form-row">
              <Field label="Email"><Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Telephone"><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
            </div>
            <Field label="Site web"><Input value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://..." /></Field>
            <Field label="Description du cabinet"><Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} placeholder="Organisation du cabinet, ambiance, specialites presentes..." /></Field>
            <Button disabled={saving}>{saving ? 'Creation...' : 'Creer'}</Button>
          </form>
        </Card>
      </div>
    </>
  );
}

function safeArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function cleanArray(value: unknown): string[] {
  return safeArray(value).map((item) => item.trim()).filter(Boolean);
}
