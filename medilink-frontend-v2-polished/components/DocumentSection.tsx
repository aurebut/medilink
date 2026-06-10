'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api, isMockStorageUrl, openDocumentPreviewWindow, showDocumentInPreview } from '@/lib/api';
import type { Document, DocumentType } from '@/lib/types';
import { documentTypeLabel, statusLabel } from '@/lib/labels';
import { formatDateTime } from '@/lib/format';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Badge, Button, Card, LoadingInline, ProgressBar } from './ui';

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

const requiredDocumentTypes: DocumentType[] = ['CV', 'DIPLOMA', 'IDENTITY_DOCUMENT', 'INSURANCE'];
const recommendedDocumentTypes: DocumentType[] = ['ATTESTATION', 'CONVENTION'];
const checklistDocumentTypes: DocumentType[] = [...requiredDocumentTypes, ...recommendedDocumentTypes];

function statusTone(status: string) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED' || status === 'EXPIRED') return 'danger';
  if (status === 'PENDING_VERIFICATION' || status === 'UPLOAD_PENDING') return 'warning';
  return 'neutral';
}

function getDocumentRank(status: string) {
  if (status === 'APPROVED') return 5;
  if (status === 'PENDING_VERIFICATION') return 4;
  if (status === 'UPLOAD_PENDING') return 3;
  if (status === 'REJECTED' || status === 'EXPIRED') return 2;
  return 1;
}

function getCurrentDocument(documents: Document[], type: DocumentType) {
  return documents
    .filter((doc) => doc.documentType === type)
    .sort((a, b) => {
      const rankDiff = getDocumentRank(b.verificationStatus) - getDocumentRank(a.verificationStatus);
      if (rankDiff !== 0) return rankDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })[0];
}

function checklistCopy(type: DocumentType, doc?: Document) {
  if (!doc) {
    return type === 'CV'
      ? 'Document prioritaire pour rendre vos candidatures lisibles.'
      : 'A ajouter pour renforcer votre dossier.';
  }
  if (doc.verificationStatus === 'APPROVED') return 'Valide et consultable par les etablissements apres candidature.';
  if (doc.verificationStatus === 'PENDING_VERIFICATION') return 'Envoye, en attente de validation Medilink.';
  if (doc.verificationStatus === 'UPLOAD_PENDING') return 'Upload a finaliser.';
  if (doc.verificationStatus === 'REJECTED') {
    return doc.rejectionReason ? `Refuse : ${doc.rejectionReason}` : 'Refuse, vous pouvez envoyer une nouvelle version.';
  }
  if (doc.verificationStatus === 'EXPIRED') return 'Expire, une version recente est necessaire.';
  return 'Document ajoute au dossier.';
}

function checklistStatusLabel(doc?: Document) {
  return doc ? statusLabel(doc.verificationStatus) : 'Manquant';
}

function checklistStatusTone(doc?: Document) {
  return doc ? statusTone(doc.verificationStatus) : 'neutral';
}

export function DocumentSection() {
  const cachedDocuments = api.getSync<Document[]>('/me/documents');
  const [documents, setDocuments] = useState<Document[]>(cachedDocuments || []);
  const [documentType, setDocumentType] = useState<DocumentType>('CV');
  const [file, setFile] = useState<File | null>(null);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [loading, setLoading] = useState(!cachedDocuments);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  async function load(options: { silent?: boolean; reload?: boolean } = {}) {
    if (!options.silent) setLoading(true);
    try {
      setDocuments(options.reload
        ? await api.reload<Document[]>('/me/documents')
        : await api.get<Document[]>('/me/documents'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      if (!options.silent) setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);
  useAutoRefresh(() => load({ silent: true, reload: true }), { enabled: !loading && !submitting });

  const visibleDocuments = useMemo(
    () => documents.filter((doc) => doc.documentType !== 'AVATAR' && doc.verificationStatus !== 'DELETED'),
    [documents],
  );

  const checklist = useMemo(
    () => checklistDocumentTypes.map((type) => ({
      type,
      required: requiredDocumentTypes.includes(type),
      document: getCurrentDocument(visibleDocuments, type),
    })),
    [visibleDocuments],
  );

  const approvedRequiredCount = checklist.filter((item) => item.required && item.document?.verificationStatus === 'APPROVED').length;
  const pendingCount = visibleDocuments.filter((doc) => doc.verificationStatus === 'PENDING_VERIFICATION' || doc.verificationStatus === 'UPLOAD_PENDING').length;
  const rejectedCount = visibleDocuments.filter((doc) => doc.verificationStatus === 'REJECTED' || doc.verificationStatus === 'EXPIRED').length;
  const missingRequiredCount = checklist.filter((item) => item.required && !item.document).length;
  const completionScore = Math.round((approvedRequiredCount / requiredDocumentTypes.length) * 100);

  async function upload() {
    if (!file) return;
    setSubmitting(true);
    setMessage(null);
    setError(null);
    try {
      const uploadResponse = await api.post<UploadResponse>('/documents/upload-url', {
        documentType,
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });

      if (!isMockStorageUrl(uploadResponse.uploadUrl)) {
        const put = await fetch(uploadResponse.uploadUrl, {
          method: uploadResponse.method,
          headers: uploadResponse.headers,
          body: file,
        });
        if (!put.ok) throw new Error('Upload fichier impossible vers le stockage.');
      }

      await api.post(`/documents/${uploadResponse.documentId}/confirm-upload`, {});
      setFile(null);
      setFileInputKey((key) => key + 1);
      setMessage('Document envoye. Il passe en verification si necessaire.');
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
        alert('Storage en mode mock : aucun fichier reel a ouvrir. En production, une URL temporaire serait ouverte.');
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

  function chooseDocumentType(type: DocumentType) {
    setDocumentType(type);
    fileInputRef.current?.click();
  }

  return (
    <Card className="documents-card">
      <div className="documents-hero">
        <div>
          <h2>Dossier documents</h2>
          <p>Centralisez les pieces utiles a vos candidatures. Elles restent privees et ne sont consultables par un etablissement que si vous candidatez a l'une de ses missions.</p>
        </div>
        <div className="documents-score">
          <strong>{completionScore}%</strong>
          <span>documents essentiels valides</span>
        </div>
      </div>

      <div className="documents-summary">
        <div className="documents-summary-main">
          <ProgressBar value={completionScore} />
          <span className="small">{approvedRequiredCount}/{requiredDocumentTypes.length} documents essentiels valides</span>
        </div>
        <div className="documents-summary-stats">
          <Badge tone={missingRequiredCount ? 'warning' : 'success'}>{missingRequiredCount} manquant(s)</Badge>
          <Badge tone={pendingCount ? 'warning' : 'neutral'}>{pendingCount} en verification</Badge>
          <Badge tone={rejectedCount ? 'danger' : 'neutral'}>{rejectedCount} a corriger</Badge>
        </div>
      </div>

      {loading ? <LoadingInline label="Chargement des documents..." /> : (
        <>
          <div className="document-checklist">
            {checklist.map(({ type, required, document }) => (
              <div className={`document-checklist-item ${document?.verificationStatus === 'APPROVED' ? 'is-approved' : ''}`} key={type}>
                <div className="document-checklist-head">
                  <div>
                    <span>{required ? 'Essentiel' : 'Recommande'}</span>
                    <strong>{documentTypeLabel(type)}</strong>
                  </div>
                  <Badge tone={checklistStatusTone(document) as any}>{checklistStatusLabel(document)}</Badge>
                </div>
                <p>{checklistCopy(type, document)}</p>
                {document ? (
                  <div className="document-file-meta">
                    <strong>{document.fileName}</strong>
                    <span>Ajoute le {formatDateTime(document.createdAt)}</span>
                  </div>
                ) : null}
                <div className="actions">
                  {document ? <Button variant="light" onClick={() => openDocument(document.id)}>Voir</Button> : null}
                  <Button variant={document ? 'secondary' : 'primary'} onClick={() => chooseDocumentType(type)}>
                    {document ? 'Remplacer' : 'Ajouter'}
                  </Button>
                  {document ? <Button variant="danger" onClick={() => remove(document.id)}>Supprimer</Button> : null}
                </div>
              </div>
            ))}
          </div>

          {visibleDocuments.length === 0 ? (
            <div className="document-empty-state">
              <h3>Votre dossier est pret a etre construit.</h3>
              <p>Commencez par votre CV : c'est le premier document regarde par les recruteurs lorsqu'ils consultent une candidature.</p>
            </div>
          ) : null}
        </>
      )}

      {message ? <Alert type="success">{message}</Alert> : null}
      {error ? <Alert type="error">{error}</Alert> : null}
      <input
        key={fileInputKey}
        ref={fileInputRef}
        className="document-hidden-input"
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      {file ? (
        <div className="document-selected-file">
          <span>Selection : <strong>{file.name}</strong></span>
          <Button onClick={upload} disabled={submitting}>{submitting ? 'Upload...' : 'Envoyer'}</Button>
        </div>
      ) : null}

      <div className="divider" />

      {loading ? null : visibleDocuments.length === 0 ? null : (
        <>
          <h3>Historique</h3>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Fichier</th><th>Statut</th><th>Ajoute</th><th>Actions</th></tr></thead>
              <tbody>
                {visibleDocuments.map((doc) => <tr key={doc.id}>
                  <td>{documentTypeLabel(doc.documentType)}</td>
                  <td><strong>{doc.fileName}</strong>{doc.rejectionReason ? <div className="small">Motif : {doc.rejectionReason}</div> : null}</td>
                  <td><Badge tone={statusTone(doc.verificationStatus) as any}>{statusLabel(doc.verificationStatus)}</Badge></td>
                  <td>{formatDateTime(doc.createdAt)}</td>
                  <td className="actions"><Button variant="light" onClick={() => openDocument(doc.id)}>Voir</Button><Button variant="danger" onClick={() => remove(doc.id)}>Supprimer</Button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </Card>
  );
}
