'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Notification } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { Alert, Badge, Button, EmptyState, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

function getNotificationLink(notification: Notification) {
  if (!notification.data) return null;
  const data = notification.data as Record<string, any>;
  if (data.conversationId) {
    return `/establishment/messages?id=${data.conversationId}`;
  }
  if (data.missionId) {
    return '/establishment/applications';
  }
  return null;
}

function getNotificationLinkLabel(notification: Notification) {
  if (!notification.data) return '';
  const data = notification.data as Record<string, any>;
  if (data.conversationId) {
    return 'Voir la conversation';
  }
  if (data.missionId) {
    return 'Voir les candidatures';
  }
  return '';
}

export default function RecruiterNotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      setItems(await api.get<Notification[]>('/notifications'));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  if (loading) return <LoadingCard label="Chargement des notifications..." />;

  async function read(id: string) {
    try {
      await api.patch(`/notifications/${id}/read`, {});
      await load();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <>
      <PageHeader title="Notifications" description="Alertes de recrutement et messages reçus." />
      {error ? <Alert type="error">{error}</Alert> : null}
      {items.length === 0 ? (
        <EmptyState title="Aucune notification" description="Les notifications liées aux candidatures et messages apparaîtront ici." />
      ) : (
        <div className="grid">
          {items.map((n) => (
            <div key={n.id} className="card">
              <div className="actions">
                <Badge tone={n.readAt ? 'neutral' : 'warning'}>{n.readAt ? 'Lue' : 'Non lue'}</Badge>
                <span className="small">{formatDateTime(n.createdAt)}</span>
              </div>
              <h3>{n.title}</h3>
              <p>{n.body}</p>
              <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                {getNotificationLink(n) ? (
                  <LinkButton href={getNotificationLink(n)!} variant="secondary">
                    {getNotificationLinkLabel(n)}
                  </LinkButton>
                ) : null}
                {!n.readAt ? <Button variant="light" onClick={() => read(n.id)}>Marquer comme lue</Button> : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
