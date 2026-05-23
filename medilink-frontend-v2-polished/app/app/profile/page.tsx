'use client';

import { FormEvent, useEffect, useState } from 'react';
import { api, isMockStorageUrl } from '@/lib/api';
import type { MedicalStatus, Profile } from '@/lib/types';
import { medicalStatusOptions } from '@/lib/labels';
import { Alert, Button, Card, Field, Input, LoadingCard, PageHeader, ProgressBar, Select, Textarea } from '@/components/ui';
import { DocumentSection } from '@/components/DocumentSection';

type UploadResponse = {
  documentId: string;
  storageKey: string;
  provider: 'mock' | 'local' | 's3';
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresInSeconds: number;
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<any>({});
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarInputKey, setAvatarInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Profile>('/me/profile')
      .then((p) => {
        setProfile(p);
        setForm({ ...p, actsPerformedText: (p.actsPerformed || []).join(', ') });
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !profile) return <LoadingCard />;

  function set(name: string, value: unknown) {
    setForm((prev: any) => ({ ...prev, [name]: value }));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    const payload = {
      firstName: form.firstName || undefined,
      lastName: form.lastName || undefined,
      city: form.city || undefined,
      country: form.country || undefined,
      medicalStatus: form.medicalStatus || undefined,
      specialty: form.specialty || undefined,
      orientation: form.orientation || undefined,
      hospitalOrFaculty: form.hospitalOrFaculty || undefined,
      bio: form.bio || undefined,
      experienceYears: form.experienceYears === '' || form.experienceYears == null ? undefined : Number(form.experienceYears),
      actsPerformed: String(form.actsPerformedText || '').split(',').map((x) => x.trim()).filter(Boolean),
      availabilityNotes: form.availabilityNotes || undefined,
    };

    try {
      const updated = await api.patch<Profile>('/me/profile', payload);
      setProfile(updated);
      setMessage('Profil mis à jour.');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function uploadAvatar() {
    if (!avatarFile) return;

    setUploadingAvatar(true);
    setMessage(null);
    setError(null);

    try {
      const upload = await api.post<UploadResponse>('/documents/upload-url', {
        documentType: 'AVATAR',
        fileName: avatarFile.name,
        mimeType: avatarFile.type || 'application/octet-stream',
        sizeBytes: avatarFile.size,
      });

      if (!isMockStorageUrl(upload.uploadUrl)) {
        const put = await fetch(upload.uploadUrl, {
          method: upload.method,
          headers: upload.headers,
          body: avatarFile,
        });

        if (!put.ok) throw new Error('Upload de la photo impossible.');
      }

      await api.post(`/documents/${upload.documentId}/confirm-upload`, {});
      const updated = await api.get<Profile>('/me/profile');
      setProfile(updated);
      setForm({ ...updated, actsPerformedText: (updated.actsPerformed || []).join(', ') });
      setAvatarFile(null);
      setAvatarInputKey((key) => key + 1);
      setMessage('Photo de profil mise à jour.');
    } catch (e: any) {
      setError(e.message || 'Erreur upload photo.');
    } finally {
      setUploadingAvatar(false);
    }
  }

  const initials = `${form.firstName || ''} ${form.lastName || ''}`
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'ML';

  return (
    <>
      <PageHeader
        title="Mon profil"
        description="Identité, informations professionnelles, disponibilités et documents vérifiables."
      />

      <div className="grid-main">
        <Card className="card-highlight">
          <div className="profile-photo-panel">
            <div className="profile-photo-preview">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Photo de profil" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div className="profile-photo-controls">
              <h2>Photo de profil</h2>
              <p className="small">JPG, PNG ou WebP, 3 Mo maximum.</p>
              <Field label="Image">
                <input
                  key={avatarInputKey}
                  className="input"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                />
              </Field>
              <Button type="button" disabled={!avatarFile || uploadingAvatar} onClick={uploadAvatar}>
                {uploadingAvatar ? 'Upload...' : 'Mettre à jour la photo'}
              </Button>
            </div>
          </div>
          <div className="divider" />
          <h2>Complétion</h2>
          <div className="stat">
            <strong>{profile.completionScore}%</strong>
            <ProgressBar value={profile.completionScore} />
            <span>Plus votre profil est complet, plus vos candidatures sont lisibles pour les établissements.</span>
          </div>
          <div className="divider" />
          <p className="small">À renseigner en priorité : ville, statut médical, spécialité, disponibilités et CV.</p>
        </Card>

        <Card>
          <h2>Informations candidat</h2>
          <form className="form" onSubmit={submit}>
            {message ? <Alert type="success">{message}</Alert> : null}
            {error ? <Alert type="error">{error}</Alert> : null}

            <div className="form-row">
              <Field label="Prénom"><Input value={form.firstName || ''} onChange={(e) => set('firstName', e.target.value)} /></Field>
              <Field label="Nom"><Input value={form.lastName || ''} onChange={(e) => set('lastName', e.target.value)} /></Field>
            </div>

            <div className="form-row">
              <Field label="Ville"><Input value={form.city || ''} onChange={(e) => set('city', e.target.value)} /></Field>
              <Field label="Pays"><Input value={form.country || 'France'} onChange={(e) => set('country', e.target.value)} /></Field>
            </div>

            <div className="form-row">
              <Field label="Statut médical">
                <Select value={form.medicalStatus || ''} onChange={(e) => set('medicalStatus', e.target.value as MedicalStatus)}>
                  <option value="">Sélectionner</option>
                  {medicalStatusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </Field>
              <Field label="Spécialité"><Input value={form.specialty || ''} onChange={(e) => set('specialty', e.target.value)} /></Field>
            </div>

            <div className="form-row">
              <Field label="Secteur"><Input value={form.orientation || ''} onChange={(e) => set('orientation', e.target.value)} /></Field>
              <Field label="Hôpital / faculté"><Input value={form.hospitalOrFaculty || ''} onChange={(e) => set('hospitalOrFaculty', e.target.value)} /></Field>
            </div>

            <div className="form-row">
              <Field label="Années d’expérience"><Input type="number" min={0} max={80} value={form.experienceYears ?? ''} onChange={(e) => set('experienceYears', e.target.value)} /></Field>
              <Field label="Actes réalisés, séparés par virgule"><Input value={form.actsPerformedText || ''} onChange={(e) => set('actsPerformedText', e.target.value)} /></Field>
            </div>

            <Field label="Disponibilités"><Textarea value={form.availabilityNotes || ''} onChange={(e) => set('availabilityNotes', e.target.value)} placeholder="Ex : nuits, week-ends, gardes ponctuelles..." /></Field>
            <Field label="Bio"><Textarea value={form.bio || ''} onChange={(e) => set('bio', e.target.value)} placeholder="Quelques lignes pour présenter votre profil." /></Field>
            <Button disabled={saving}>{saving ? 'Sauvegarde...' : 'Enregistrer le profil'}</Button>
          </form>
        </Card>
      </div>

      <div style={{ marginTop: 16 }}><DocumentSection /></div>
    </>
  );
}
