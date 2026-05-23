'use client';

import { useState } from 'react';
import { api, isMockStorageUrl } from '@/lib/api';
import type { EstablishmentPhoto } from '@/lib/types';
import { Alert, Badge, Button, Field } from './ui';

type UploadResponse = {
  photoId: string;
  storageKey: string;
  provider: 'mock' | 'local' | 's3';
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresInSeconds: number;
};

export function EstablishmentPhotoManager({
  establishmentId,
  photos = [],
  onChanged,
}: {
  establishmentId: string;
  photos?: EstablishmentPhoto[];
  onChanged: () => Promise<void> | void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [inputKey, setInputKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload() {
    if (!file) return;
    setBusy(true);
    setError(null);

    try {
      const uploadResult = await api.post<UploadResponse>(`/establishments/${establishmentId}/photos/upload-url`, {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });

      if (!isMockStorageUrl(uploadResult.uploadUrl)) {
        const put = await fetch(uploadResult.uploadUrl, {
          method: uploadResult.method,
          headers: uploadResult.headers,
          body: file,
        });
        if (!put.ok) throw new Error("Upload de la photo impossible.");
      }

      await api.post(`/establishments/${establishmentId}/photos/${uploadResult.photoId}/confirm-upload`, {});
      setFile(null);
      setInputKey((key) => key + 1);
      await onChanged();
    } catch (e: any) {
      setError(e.message || 'Erreur upload photo.');
    } finally {
      setBusy(false);
    }
  }

  async function setPrimary(photoId: string) {
    setBusy(true);
    setError(null);
    try {
      await api.patch(`/establishments/${establishmentId}/photos/${photoId}/primary`, {});
      await onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(photoId: string) {
    if (!confirm('Supprimer cette photo ?')) return;
    setBusy(true);
    setError(null);
    try {
      await api.delete(`/establishments/${establishmentId}/photos/${photoId}`);
      await onChanged();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="establishment-photo-manager">
      {error ? <Alert type="error">{error}</Alert> : null}
      <div className="form-row">
        <Field label="Ajouter une photo">
          <input
            key={inputKey}
            className="input"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={(event) => setFile(event.target.files?.[0] || null)}
          />
        </Field>
        <div className="actions align-end">
          <Button type="button" disabled={!file || busy} onClick={upload}>
            {busy ? 'Upload...' : 'Ajouter'}
          </Button>
        </div>
      </div>

      {photos.length ? (
        <div className="establishment-photo-grid">
          {photos.map((photo) => (
            <div key={photo.id} className="establishment-photo-item">
              {photo.url ? <img src={photo.url} alt={photo.fileName} /> : null}
              <div className="establishment-photo-actions">
                {photo.isPrimary ? <Badge tone="success">Principale</Badge> : (
                  <Button type="button" variant="light" disabled={busy} onClick={() => setPrimary(photo.id)}>Principale</Button>
                )}
                <Button type="button" variant="danger" disabled={busy} onClick={() => remove(photo.id)}>Supprimer</Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="small">Aucune photo pour le moment.</p>
      )}
    </div>
  );
}
