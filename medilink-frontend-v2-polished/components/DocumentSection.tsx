'use client';

import { useEffect, useState } from 'react';
import { api, isMockStorageUrl, openDocumentPreviewWindow, showDocumentInPreview } from '@/lib/api';
import type { Document, DocumentType } from '@/lib/types';
import { documentTypeOptions, documentTypeLabel, statusLabel } from '@/lib/labels';
import { formatDateTime } from '@/lib/format';
import { Alert, Badge, Button, Card, Field, LoadingInline, Select } from './ui';

type UploadResponse = {
  documentId: string;
  storageKey: string;
  provider: 'mock' | 'local' | 's3';
  uploadUrl: string;
  method: 'PUT';
  headers: Record<string, string>;
  expiresInSeconds: number;
};

type DownloadResponse = { provider: 'mock' | 'local' | 's3'; downloadUrl: string; expiresInSeconds: number };

function statusTone(status: string) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED' || status === 'EXPIRED') return 'danger';
  if (status === 'PENDING_VERIFICATION' || status === 'UPLOAD_PENDING') return 'warning';
  return 'neutral';
}

export function DocumentSection() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [documentType, setDocumentType] = useState<DocumentType>('CV');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    try {
      setDocuments(await api.get<Document[]>('/me/documents'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function upload() {
    if (!file) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const upload = await api.post<UploadResponse>('/documents/upload-url', {
        documentType,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });

      if (!isMockStorageUrl(upload.uploadUrl)) {
        const put = await fetch(upload.uploadUrl, {
          method: upload.method,
          headers: upload.headers,
          body: file,
        });
        if (!put.ok) throw new Error('Upload fichier impossible vers le stockage.');
      }

      await api.post(`/documents/${upload.documentId}/confirm-upload`, {});
      setFile(null);
      setMessage('Document envoyé. Il passe en vérification si nécessaire.');
      await load();
    } catch (e: any) {
      setError(e.message || 'Erreur upload.');
    } finally {
      setSubmitting(false);
    }
  }

  async function openDocument(documentId: string) {
    const previewWindow = openDocumentPreviewWindow();

    try {
      const result = await api.get<DownloadResponse>(`/documents/${documentId}/download-url`);
      if (isMockStorageUrl(result.downloadUrl)) {
        previewWindow?.close();
        alert('Storage en mode mock : aucun fichier réel à ouvrir. En production, une URL temporaire serait ouverte.');
        return;
      }
      showDocumentInPreview(result.downloadUrl, previewWindow);
    } catch (e: any) {
      previewWindow?.close();
      setError(e.message);
    }
  }

  async function remove(documentId: string) {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await api.delete(`/documents/${documentId}`);
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <Card>
      <h2>Documents</h2>
      <p>Ajoutez votre CV, vos attestations et justificatifs. Les documents sont privés et passent par le backend.</p>
      <div className="form">
        {message ? <Alert type="success">{message}</Alert> : null}
        {error ? <Alert type="error">{error}</Alert> : null}
        <div className="form-row">
          <Field label="Type de document">
            <Select value={documentType} onChange={(e) => setDocumentType(e.target.value as DocumentType)}>
              {documentTypeOptions.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </Select>
          </Field>
          <Field label="Fichier PDF ou image">
            <input className="input" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </Field>
        </div>
        <div className="actions"><Button onClick={upload} disabled={!file || submitting}>{submitting ? 'Upload...' : 'Envoyer le document'}</Button></div>
      </div>
      <div className="divider" />
      {loading ? <LoadingInline label="Chargement des documents..." /> : documents.filter((doc) => doc.documentType !== 'AVATAR').length === 0 ? <p className="muted">Aucun document pour le moment.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Type</th><th>Fichier</th><th>Statut</th><th>Ajouté</th><th>Actions</th></tr></thead>
            <tbody>
              {documents.filter((doc) => doc.documentType !== 'AVATAR').map((doc) => <tr key={doc.id}>
                <td>{documentTypeLabel(doc.documentType)}</td>
                <td><strong>{doc.fileName}</strong>{doc.rejectionReason ? <div className="small">Motif : {doc.rejectionReason}</div> : null}</td>
                <td><Badge tone={statusTone(doc.verificationStatus) as any}>{statusLabel(doc.verificationStatus)}</Badge></td>
                <td>{formatDateTime(doc.createdAt)}</td>
                <td className="actions"><Button variant="light" onClick={() => openDocument(doc.id)}>Voir</Button><Button variant="danger" onClick={() => remove(doc.id)}>Supprimer</Button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
