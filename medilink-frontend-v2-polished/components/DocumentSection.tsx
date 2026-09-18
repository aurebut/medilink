'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, FileText, Trash2 } from 'lucide-react';
import { api, isMockStorageUrl, openDocumentPreviewWindow, showDocumentInPreview } from '@/lib/api';
import type { Document, DocumentType } from '@/lib/types';
import { documentTypeLabel, statusLabel } from '@/lib/labels';
import { formatDateTime } from '@/lib/format';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Badge, Button, Card, LoadingInline, ProgressBar, type BadgeTone } from './ui';
import { errorMessage } from '@/lib/user-facing';

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

function statusTone(status: string): BadgeTone {
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
      : 'À ajouter pour renforcer votre dossier.';
  }
  if (doc.verificationStatus === 'APPROVED') return 'Validé et consultable par les établissements après candidature.';
  if (doc.verificationStatus === 'PENDING_VERIFICATION') return 'Envoyé, en attente de validation MédiLink.';
  if (doc.verificationStatus === 'UPLOAD_PENDING') return 'Téléversement à finaliser.';
  if (doc.verificationStatus === 'REJECTED') {
    return doc.rejectionReason ? `Refusé : ${doc.rejectionReason}` : 'Refusé, vous pouvez envoyer une nouvelle version.';
  }
  if (doc.verificationStatus === 'EXPIRED') return 'Expiré, une version récente est nécessaire.';
  return 'Document ajouté au dossier.';
}

function checklistStatusLabel(doc?: Document) {
  return doc ? statusLabel(doc.verificationStatus) : 'Manquant';
}

function checklistStatusTone(doc?: Document): BadgeTone {
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
    } catch (e) {
      setError(errorMessage(e));
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
        if (!put.ok) throw new Error('Téléversement du fichier impossible vers le stockage.');
      }

      await api.post(`/documents/${uploadResponse.documentId}/confirm-upload`, {});
      setFile(null);
      setFileInputKey((key) => key + 1);
      setMessage('Document envoyé. Il passe en vérification si nécessaire.');
      await load();
    } catch (e) {
      setError(errorMessage(e) || 'Erreur lors du téléversement.');
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
        alert('Stockage en mode mock : aucun fichier réel à ouvrir. En production, une URL temporaire serait ouverte.');
        return;
      }
      showDocumentInPreview(result.downloadUrl, previewWindow);
    } catch (e) {
      previewWindow?.close();
      setError(errorMessage(e));
    }
  }

  async function remove(documentId: string) {
    if (!confirm('Supprimer ce document ?')) return;
    try {
      await api.delete(`/documents/${documentId}`);
      await load();
    } catch (e) {
      setError(errorMessage(e));
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
          <span className="documents-eyebrow">Votre dossier professionnel</span>
          <h2>Vos documents</h2>
          <p>Vos pièces restent privées. Un établissement peut les consulter après votre candidature à l’une de ses missions.</p>
        </div>
        <div className="documents-score">
          <strong>{completionScore}<small>%</small></strong>
          <span>du dossier essentiel validé</span>
        </div>
      </div>

      <div className="documents-summary">
        <div className="documents-summary-main">
          <ProgressBar value={completionScore} />
          <span className="small">{approvedRequiredCount}/{requiredDocumentTypes.length} documents essentiels validés</span>
        </div>
        <div className="documents-summary-stats">
          <Badge tone={missingRequiredCount ? 'warning' : 'success'}>
            {missingRequiredCount} {missingRequiredCount === 1 ? 'manquant' : 'manquants'}
          </Badge>
          <Badge tone={pendingCount ? 'warning' : 'neutral'}>{pendingCount} en vérification</Badge>
          <Badge tone={rejectedCount ? 'danger' : 'neutral'}>{rejectedCount} à corriger</Badge>
        </div>
      </div>

      {loading ? <LoadingInline label="Chargement des documents..." /> : (
        <>
          <div className="document-checklist">
            {checklist.map(({ type, required, document }) => (
              <div className={`document-checklist-item ${document?.verificationStatus === 'APPROVED' ? 'is-approved' : ''}`} key={type}>
                <div className="document-folio-icon" aria-hidden="true"><FileText size={23} strokeWidth={1.35} /></div>
                <div className="document-record-main">
                  <div className="document-checklist-head">
                    <strong>{documentTypeLabel(type)}</strong>
                    <span>{required ? 'Essentiel' : 'Recommandé'}</span>
                  </div>
                  {document ? (
                    <div className="document-file-meta">
                      <strong>{document.fileName}</strong>
                      <span>Ajouté le {formatDateTime(document.createdAt)}</span>
                    </div>
                  ) : null}
                  {document?.verificationStatus !== 'APPROVED' ? <p className="document-record-note">{checklistCopy(type, document)}</p> : null}
                </div>
                <div className="document-record-status">
                  <Badge tone={checklistStatusTone(document)}>{checklistStatusLabel(document)}</Badge>
                </div>
                <div className="document-record-actions">
                  {document ? <Button variant="light" className="document-open-action" aria-label={`Voir ${documentTypeLabel(type)}`} onClick={() => openDocument(document.id)}>Voir <ArrowUpRight size={15} aria-hidden="true" /></Button> : null}
                  <Button variant={document ? 'light' : 'primary'} className={document ? 'document-text-action' : ''} aria-label={`${document ? 'Remplacer' : 'Ajouter'} ${documentTypeLabel(type)}`} onClick={() => chooseDocumentType(type)}>
                    {document ? 'Remplacer' : 'Ajouter'}
                  </Button>
                  {document ? <Button variant="light" className="document-delete-action" title={`Supprimer ${documentTypeLabel(type)}`} aria-label={`Supprimer ${documentTypeLabel(type)}`} onClick={() => remove(document.id)}><Trash2 size={16} aria-hidden="true" /></Button> : null}
                </div>
              </div>
            ))}
          </div>

          {visibleDocuments.length === 0 ? (
            <div className="document-empty-state">
              <h3>Votre dossier est prêt à être construit.</h3>
              <p>Commencez par votre CV : c'est le premier document regardé par les recruteurs lorsqu'ils consultent une candidature.</p>
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
          <span>Sélection : <strong>{file.name}</strong></span>
          <Button onClick={upload} disabled={submitting}>{submitting ? 'Envoi en cours...' : 'Envoyer'}</Button>
        </div>
      ) : null}

      <div className="divider" />

      {loading ? null : visibleDocuments.length === 0 ? null : (
        <>
          <details className="document-history">
          <summary>Historique des documents <span>{visibleDocuments.length} fichier{visibleDocuments.length > 1 ? 's' : ''}</span></summary>
          <div className="table-wrap">
            <table>
              <thead><tr><th>Type</th><th>Fichier</th><th>Statut</th><th>Ajouté</th><th>Actions</th></tr></thead>
              <tbody>
                {visibleDocuments.map((doc) => <tr key={doc.id}>
                  <td>{documentTypeLabel(doc.documentType)}</td>
                  <td><strong>{doc.fileName}</strong>{doc.rejectionReason ? <div className="small">Motif : {doc.rejectionReason}</div> : null}</td>
                  <td><Badge tone={statusTone(doc.verificationStatus)}>{statusLabel(doc.verificationStatus)}</Badge></td>
                  <td>{formatDateTime(doc.createdAt)}</td>
                  <td className="actions"><Button variant="light" onClick={() => openDocument(doc.id)}>Voir</Button><Button variant="danger" onClick={() => remove(doc.id)}>Supprimer</Button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          </details>
        </>
      )}
    </Card>
  );
}
