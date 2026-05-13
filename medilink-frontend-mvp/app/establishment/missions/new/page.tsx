'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Mission, MissionType, RequiredLevel } from '@/lib/types';
import { missionTypeOptions, requiredLevelOptions } from '@/lib/labels';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { Alert, Button, Card, Field, Input, LoadingCard, PageHeader, Select, Textarea } from '@/components/ui';

export default function NewMissionPage() {
  const router = useRouter();
  const { primary, loading } = useEstablishments();
  const [form, setForm] = useState<any>({ missionType: 'GARDE', requiredLevel: 'INTERN', compensationCurrency: 'EUR', publishNow: true });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  function set(name: string, value: unknown) { setForm((p: any) => ({ ...p, [name]: value })); }
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!primary) return; setSaving(true); setError(null);
    const payload = { ...form, establishmentId: primary.id, durationHours: form.durationHours ? Number(form.durationHours) : undefined, compensationAmount: form.compensationAmount ? Number(form.compensationAmount) : undefined, tags: String(form.tagsText || '').split(',').map((x) => x.trim()).filter(Boolean) };
    delete payload.tagsText;
    try { const mission = await api.post<Mission>('/missions', payload); alert(`Mission créée : ${mission.title}`); router.push('/establishment/missions'); }
    catch (e: any) { setError(e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <LoadingCard />;
  if (!primary) return <><PageHeader title="Créer une mission" /><Card><p>Crée d’abord ton établissement.</p></Card></>;
  return <><PageHeader title="Créer une mission" description={`Établissement : ${primary.name}`} />
    <Card><form className="form" onSubmit={submit}>
      {error ? <Alert type="error">{error}</Alert> : null}
      <Field label="Titre"><Input required value={form.title || ''} onChange={(e) => set('title', e.target.value)} /></Field>
      <Field label="Description"><Textarea value={form.description || ''} onChange={(e) => set('description', e.target.value)} /></Field>
      <div className="form-row"><Field label="Type"><Select value={form.missionType} onChange={(e) => set('missionType', e.target.value as MissionType)}>{missionTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field><Field label="Niveau requis"><Select value={form.requiredLevel} onChange={(e) => set('requiredLevel', e.target.value as RequiredLevel)}>{requiredLevelOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</Select></Field></div>
      <div className="form-row"><Field label="Spécialité"><Input required value={form.specialty || ''} onChange={(e) => set('specialty', e.target.value)} /></Field><Field label="Ville"><Input required value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></Field></div>
      <Field label="Lieu précis"><Input value={form.location || ''} onChange={(e) => set('location', e.target.value)} /></Field>
      <div className="form-row"><Field label="Date début"><Input type="date" required value={form.startDate || ''} onChange={(e) => set('startDate', e.target.value)} /></Field><Field label="Date fin"><Input type="date" value={form.endDate || ''} onChange={(e) => set('endDate', e.target.value)} /></Field></div>
      <div className="form-row"><Field label="Heure début"><Input value={form.startTime || ''} placeholder="08:00" onChange={(e) => set('startTime', e.target.value)} /></Field><Field label="Heure fin"><Input value={form.endTime || ''} placeholder="20:00" onChange={(e) => set('endTime', e.target.value)} /></Field></div>
      <div className="form-row"><Field label="Durée heures"><Input type="number" min={1} max={72} value={form.durationHours || ''} onChange={(e) => set('durationHours', e.target.value)} /></Field><Field label="Rémunération"><Input type="number" min={0} value={form.compensationAmount || ''} onChange={(e) => set('compensationAmount', e.target.value)} /></Field></div>
      <Field label="Tags, séparés par virgule"><Input value={form.tagsText || ''} onChange={(e) => set('tagsText', e.target.value)} placeholder="urgent, nuit, week-end" /></Field>
      <label className="actions"><input type="checkbox" checked={Boolean(form.publishNow)} onChange={(e) => set('publishNow', e.target.checked)} /> Publier immédiatement</label>
      <Button disabled={saving}>{saving ? 'Création...' : 'Créer la mission'}</Button>
    </form></Card>
  </>;
}
