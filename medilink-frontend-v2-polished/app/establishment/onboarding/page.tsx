'use client';

import { FormEvent, useState } from 'react';
import { api } from '@/lib/api';
import type { Establishment, EstablishmentType } from '@/lib/types';
import { establishmentTypeLabel, establishmentTypeOptions, statusLabel } from '@/lib/labels';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Alert, Badge, Button, Card, Field, Input, LoadingCard, PageHeader, Select, Textarea } from '@/components/ui';

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
      await api.post<Establishment>('/establishments', form);
      setMessage('Établissement créé.');
      await reload();
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

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader title="Établissement" description="Crée ou consulte ton établissement recruteur." />
      <div className="grid-2">
        <Card>
          <h2>Mes établissements</h2>
          {message ? <Alert type="success">{message}</Alert> : null}
          {error ? <Alert type="error">{error}</Alert> : null}
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
                <Badge tone={establishment.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}>
                  {statusLabel(establishment.verificationStatus)}
                </Badge>
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
          <h2>Créer un établissement</h2>
          <form className="form" onSubmit={submit}>
            <Field label="Nom"><Input required value={form.name || ''} onChange={(e) => set('name', e.target.value)} /></Field>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => set('type', e.target.value as EstablishmentType)}>
                {establishmentTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
            </Field>
            <div className="form-row">
              <Field label="Ville"><Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></Field>
              <Field label="Pays"><Input value={form.country || ''} onChange={(e) => set('country', e.target.value)} /></Field>
            </div>
            <Field label="Adresse"><Input value={form.address || ''} onChange={(e) => set('address', e.target.value)} /></Field>
            <div className="form-row">
              <Field label="Email"><Input type="email" value={form.email || ''} onChange={(e) => set('email', e.target.value)} /></Field>
              <Field label="Téléphone"><Input value={form.phone || ''} onChange={(e) => set('phone', e.target.value)} /></Field>
            </div>
            <Field label="Site web"><Input value={form.website || ''} onChange={(e) => set('website', e.target.value)} placeholder="https://..." /></Field>
            <Field label="Description"><Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
            <Button disabled={saving}>{saving ? 'Création...' : 'Créer'}</Button>
          </form>
        </Card>
      </div>
    </>
  );
}
