'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Application, ApplicationStatus } from '@/lib/types';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { formatDateTime } from '@/lib/format';
import { statusLabel } from '@/lib/labels';
import { MissionDeleteButton } from '@/components/MissionDeleteButton';
import { Alert, Badge, Button, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

function tone(status: string) {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'VIEWED') return 'warning';
  return 'neutral';
}

export default function EstablishmentApplicationsPage() {
  const { primary, loading } = useEstablishments();
  const [items, setItems] = useState<Application[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load() {
    if (!primary) return;

    try {
      setError(null);
      const data = await api.get<Application[]>(`/establishment/applications?establishmentId=${primary.id}`);
      setItems(data);
    } catch (e: any) {
      setError(e.message);
    }
  }

  useEffect(() => { void load(); }, [primary]);

  async function update(id: string, status: ApplicationStatus) {
    try {
      setError(null);
      setUpdatingId(id);
      await api.patch(`/applications/${id}/status`, { status });
      await load();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setUpdatingId(null);
    }
  }

  if (loading) return <LoadingCard />;

  return (
    <>
      <PageHeader
        title="Candidatures reçues"
        description="Consultez les profils candidats, échangez avec eux et prenez une décision claire."
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      {!primary ? (
        <Card>
          <p>Créez d’abord un établissement.</p>
        </Card>
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Candidat</th>
                <th>Mission</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => {
                const isFinal = a.status === 'ACCEPTED' || a.status === 'REJECTED' || a.status === 'WITHDRAWN';
                const isUpdating = updatingId === a.id;

                return (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.candidate?.profile?.firstName} {a.candidate?.profile?.lastName}</strong>
                      <div className="small">{a.candidate?.email}</div>
                    </td>
                    <td>
                      {a.mission?.title}
                      <div className="small">{a.mission?.city}</div>
                    </td>
                    <td><Badge tone={tone(a.status) as any}>{statusLabel(a.status)}</Badge></td>
                    <td>{formatDateTime(a.createdAt)}</td>
                    <td className="actions">
                      <LinkButton variant="light" href={`/establishment/candidates/${a.id}`}>
                        Voir profil
                      </LinkButton>

                      {a.mission ? (
                        <MissionDeleteButton
                          mission={a.mission}
                          onDeleted={() => setItems((current) => current.filter((item) => item.missionId !== a.missionId))}
                        />
                      ) : null}

                      {isFinal ? (
                        <span className="small">Décision enregistrée</span>
                      ) : (
                        <>
                          <Button variant="success" disabled={isUpdating} onClick={() => void update(a.id, 'ACCEPTED')}>
                            {isUpdating ? '...' : 'Accepter'}
                          </Button>
                          <Button variant="danger" disabled={isUpdating} onClick={() => void update(a.id, 'REJECTED')}>
                            {isUpdating ? '...' : 'Refuser'}
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5}>Aucune candidature.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
