'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import type { Establishment, EstablishmentType } from '@/lib/types';
import { establishmentTypeOptions } from '@/lib/labels';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { EstablishmentPhotoManager } from '@/components/EstablishmentPhotoManager';
import { MultiChoiceField, MultiChoiceTextField, SingleChoiceField } from '@/components/FormChoiceFields';
import { Alert, Button, Card, Field, Input, LinkButton, LoadingCard, PageHeader, Select, Textarea } from '@/components/ui';
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

export default function EditEstablishmentPage() {
  const { id } = useParams<{ id: string }>();
  const { establishments, loading, reload } = useEstablishments();
  const [form, setForm] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const establishment = establishments.find((e) => e.id === id);

  useEffect(() => {
    if (establishment && !form) {
      setForm({
        name: establishment.name || '',
        type: establishment.type || 'HOSPITAL',
        city: establishment.city || '',
        country: establishment.country || 'France',
        sector: establishment.sector || '',
        patientType: establishment.patientType || '',
        softwareUsed: establishment.softwareUsed || '',
        hasSecretary: establishment.hasSecretary,
        secretaryType: establishment.secretaryType || '',
        averagePatientsPerDay: establishment.averagePatientsPerDay ?? '',
        isMultidisciplinary: establishment.isMultidisciplinary,
        equipmentAvailable: establishment.equipmentAvailable || [],
        mobilityOptions: establishment.mobilityOptions || [],
        acceptedMissionTypes: establishment.acceptedMissionTypes || [],
        preferredDurations: establishment.preferredDurations || [],
        refusedSchedules: establishment.refusedSchedules || [],
        acceptedPatientTypes: establishment.acceptedPatientTypes || [],
        knownSoftware: establishment.knownSoftware || [],
        minimumCompensation: establishment.minimumCompensation ?? '',
        address: establishment.address || '',
        email: establishment.email || '',
        phone: establishment.phone || '',
        website: establishment.website || '',
        description: establishment.description || '',
      });
    }
  }, [establishment, form]);

  function set(name: string, value: unknown) {
    setForm((p: any) => ({ ...p, [name]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await api.patch<Establishment>(`/establishments/${id}`, {
        ...form,
        mobilityOptions: cleanArray(form.mobilityOptions),
        acceptedMissionTypes: cleanArray(form.acceptedMissionTypes),
        minimumCompensation: form.minimumCompensation === '' || form.minimumCompensation == null ? null : Number(form.minimumCompensation),
        averagePatientsPerDay: form.averagePatientsPerDay === '' || form.averagePatientsPerDay == null ? null : Number(form.averagePatientsPerDay),
        equipmentAvailable: cleanArray(form.equipmentAvailable),
        preferredDurations: cleanArray(form.preferredDurations),
        refusedSchedules: cleanArray(form.refusedSchedules),
        acceptedPatientTypes: cleanArray(form.acceptedPatientTypes),
        knownSoftware: cleanArray(form.knownSoftware),
      });
      setMessage('Établissement modifié avec succès.');
      await reload();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingCard label="Chargement de l'établissement..." />;

  if (!establishment) {
    return (
      <>
        <PageHeader
          title="Modifier l'établissement"
          description="L'établissement demandé n'existe pas ou ne vous appartient pas."
        />
        <Card>
          <p>Établissement introuvable.</p>
          <LinkButton href="/establishment/onboarding">Retour</LinkButton>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Modifier l'établissement"
        description={`Mettez à jour les informations et les photos pour l'établissement : ${establishment.name}`}
        actions={<LinkButton href="/establishment/onboarding" variant="light">Retour</LinkButton>}
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <Card>
          <h2>Photos de l'établissement</h2>
          <p className="text-secondary" style={{ marginBottom: 24 }}>
            Ces photos seront visibles par les candidats lors de la consultation de vos missions. La photo marquée "Principale" sera affichée en premier.
          </p>

          <EstablishmentPhotoManager
            establishmentId={establishment.id}
            photos={establishment.photos}
            onChanged={reload}
          />
        </Card>

        <Card>
          <h2>Informations générales</h2>
          {message ? <Alert type="success">{message}</Alert> : null}
          {error ? <Alert type="error">{error}</Alert> : null}
          {form ? (
            <form className="form" onSubmit={submit}>
              <Field label="Nom">
                <Input required value={form.name || ''} onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label="Type">
                <Select value={form.type} onChange={(e) => set('type', e.target.value as EstablishmentType)}>
                  {establishmentTypeOptions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
              <div className="form-row">
                <SingleChoiceField
                  label="Ville"
                  value={form.city || ''}
                  options={cityOptions}
                  onChange={(value) => set('city', value)}
                />
                <SingleChoiceField
                  label="Pays"
                  value={form.country || ''}
                  options={countryOptions}
                  onChange={(value) => set('country', value)}
                />
              </div>
              <SingleChoiceField
                label="Secteur"
                value={form.sector || ''}
                options={sectorOptions}
                onChange={(value) => set('sector', value)}
              />
              <MultiChoiceTextField
                label="Type de patientèle"
                value={form.patientType || ''}
                options={patientTypeOptions}
                onChange={(value) => set('patientType', value)}
              />
              <MultiChoiceTextField
                label="Logiciel utilisé"
                value={form.softwareUsed || ''}
                options={softwareOptions}
                onChange={(value) => set('softwareUsed', value)}
              />
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
              <SingleChoiceField
                label="Type de secrétariat"
                value={form.secretaryType || ''}
                options={secretaryTypeOptions}
                onChange={(value) => set('secretaryType', value)}
              />
              <div className="form-row">
                <Field label="Patients par jour en moyenne">
                  <Input
                    type="number"
                    min={0}
                    value={form.averagePatientsPerDay ?? ''}
                    onChange={(e) => set('averagePatientsPerDay', e.target.value)}
                    placeholder="Ex : 25"
                  />
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
              <MultiChoiceField
                label="Matériel disponible"
                values={safeArray(form.equipmentAvailable)}
                options={equipmentOptions}
                onChange={(values) => set('equipmentAvailable', values)}
              />
              <div className="profile-preferences-section">
                <h3>Critères habituels de mission</h3>
                <MultiChoiceField
                  label="Mobilité utile"
                  values={safeArray(form.mobilityOptions)}
                  options={mobilityOptions}
                  onChange={(values) => set('mobilityOptions', values)}
                />
                <MultiChoiceField
                  label="Types de missions proposées"
                  values={safeArray(form.acceptedMissionTypes)}
                  options={acceptedMissionTypeOptions}
                  onChange={(values) => set('acceptedMissionTypes', values)}
                />
                <MultiChoiceField
                  label="Durées habituelles"
                  values={safeArray(form.preferredDurations)}
                  options={durationOptions}
                  onChange={(values) => set('preferredDurations', values)}
                />
                <MultiChoiceField
                  label="Horaires rarement proposés"
                  values={safeArray(form.refusedSchedules)}
                  options={refusedScheduleOptions}
                  onChange={(values) => set('refusedSchedules', values)}
                />
                <MultiChoiceField
                  label="Patientèles reçues"
                  values={safeArray(form.acceptedPatientTypes)}
                  options={patientTypeOptions}
                  onChange={(values) => set('acceptedPatientTypes', values)}
                />
                <MultiChoiceField
                  label="Logiciels utilisés"
                  values={safeArray(form.knownSoftware)}
                  options={softwareOptions}
                  onChange={(values) => set('knownSoftware', values)}
                />
                <Field label="Rémunération minimale habituelle (EUR)">
                  <Input
                    type="number"
                    min={0}
                    value={form.minimumCompensation ?? ''}
                    onChange={(e) => set('minimumCompensation', e.target.value)}
                    placeholder="Ex : 600"
                  />
                </Field>
              </div>
              <Field label="Adresse">
                <Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} />
              </Field>
              <div className="form-row">
                <Field label="Email">
                  <Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} />
                </Field>
                <Field label="Telephone">
                  <Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} />
                </Field>
              </div>
              <Field label="Site web">
                <Input value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://..." />
              </Field>
              <Field label="Description du cabinet">
                <Textarea
                  value={form.description || ''}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Organisation du cabinet, ambiance, spécialités présentes..."
                />
              </Field>
              <Button disabled={saving}>{saving ? 'Enregistrement...' : 'Enregistrer les modifications'}</Button>
            </form>
          ) : (
            <p>Initialisation du formulaire...</p>
          )}
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
