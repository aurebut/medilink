'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, isMockStorageUrl, openDocumentPreviewWindow, showDocumentInPreview } from '@/lib/api';
import type { Document, DocumentVerificationStatus } from '@/lib/types';
import { documentTypeLabel, statusLabel } from '@/lib/labels';
import { formatDateTime } from '@/lib/format';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Badge, Button, LoadingCard, PageHeader, Select, type BadgeTone } from '@/components/ui';
import { errorMessage } from '@/lib/user-facing';

function tone(status: string): BadgeTone {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'PENDING_VERIFICATION') return 'warning';
  return 'neutral';
}

export default function AdminDocumentsPage() {
  const [status, setStatus] = useState<DocumentVerificationStatus | ''>('PENDING_VERIFICATION');
  const [docs, setDocs] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (options: { silent?: boolean; reload?: boolean } = {}) => {
    if (!options.silent) setLoading(true);
    setError(null);
    try {
      const query = status ? `?status=${status}` : '';
      const data = options.reload
        ? await api.reload<Document[]>(`/admin/documents${query}`)
        : await api.get<Document[]>(`/admin/documents${query}`);
      setDocs(data);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      if (!options.silent) setLoading(false);
    }
  }, [status]);

  useEffect(() => { void load(); }, [load]);
  useAutoRefresh(() => load({ silent: true, reload: true }), { enabled: !loading });

  async function approve(id: string) {
    try {
      await api.post(`/admin/documents/${id}/approve`, {});
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function reject(id: string) {
    const reason = prompt('Motif de refus ?');
    if (!reason) return;

    try {
      await api.post(`/admin/documents/${id}/reject`, { reason });
      await load();
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  async function view(id: string) {
    const previewWindow = openDocumentPreviewWindow();

    try {
      const res = await api.get<{ provider: string; downloadUrl: string }>(`/documents/${id}/download-url`);
      if (isMockStorageUrl(res.downloadUrl)) {
        previewWindow?.close();
        alert('Storage mock : aucun fichier réel à ouvrir.');
        return;
      }
      showDocumentInPreview(res.downloadUrl, previewWindow);
    } catch (e) {
      previewWindow?.close();
      setError(errorMessage(e));
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader
        title="Documents"
        description="Validation ou refus des documents utilisateurs. Le filtre À vérifier masque automatiquement les documents déjà validés."
        actions={(
          <Select value={status} onChange={(e) => setStatus(e.currentTarget.value as DocumentVerificationStatus | '')}>
            <option value="">Tous</option>
            <option value="PENDING_VERIFICATION">À vérifier</option>
            <option value="APPROVED">Validés</option>
            <option value="REJECTED">Refusés</option>
          </Select>
        )}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="table-wrap admin-table-wrap">
        <table>
          <caption className="sr-only">Liste des documents à vérifier</caption>
          <thead>
            <tr>
              <th scope="col">Propriétaire</th>
              <th scope="col">Document</th>
              <th scope="col">Statut</th>
              <th scope="col">Date</th>
              <th scope="col">Actions</th>
            </tr>
          </thead>
          <tbody>
            {docs.map((d) => (
              <tr key={d.id}>
                <td data-label="Propriétaire">
                  <strong>{d.owner?.email}</strong>
                  <div className="small">{d.owner?.profile?.firstName} {d.owner?.profile?.lastName}</div>
                </td>
                <td data-label="Document">
                  <strong>{documentTypeLabel(d.documentType)}</strong>
                  <div className="small">{d.fileName}</div>
                  {d.rejectionReason ? <div className="small">Motif : {d.rejectionReason}</div> : null}
                </td>
                <td data-label="Statut"><Badge tone={tone(d.verificationStatus)}>{statusLabel(d.verificationStatus)}</Badge></td>
                <td data-label="Date">{formatDateTime(d.createdAt)}</td>
                <td className="actions" data-label="Actions">
                  <Button variant="light" onClick={() => view(d.id)}>Voir</Button>
                  <Button variant="success" disabled={d.verificationStatus === 'APPROVED'} onClick={() => approve(d.id)}>Valider</Button>
                  <Button variant="danger" disabled={d.verificationStatus === 'REJECTED'} onClick={() => reject(d.id)}>Refuser</Button>
                </td>
              </tr>
            ))}
            {docs.length === 0 ? (
              <tr>
                <td colSpan={5} data-label="">Aucun document.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
