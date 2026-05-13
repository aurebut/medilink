'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Notification } from '@/lib/types';
import { formatDateTime } from '@/lib/format';
import { Alert, Badge, Button, EmptyState, LoadingCard, PageHeader } from '@/components/ui';

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function load() { try { setItems(await api.get<Notification[]>('/notifications')); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function read(id: string) { try { await api.patch(`/notifications/${id}/read`, {}); await load(); } catch (e: any) { setError(e.message); } }
  if (loading) return <LoadingCard />;
  return <><PageHeader title="Notifications" description="Alertes internes du compte." />{error ? <Alert type="error">{error}</Alert> : null}{items.length === 0 ? <EmptyState title="Aucune notification" /> : <div className="grid">{items.map((n) => <div key={n.id} className="card"><div className="actions"><Badge tone={n.readAt ? 'neutral' : 'warning'}>{n.readAt ? 'Lue' : 'Non lue'}</Badge><span className="small">{formatDateTime(n.createdAt)}</span></div><h3>{n.title}</h3><p>{n.body}</p>{!n.readAt ? <Button variant="light" onClick={() => read(n.id)}>Marquer comme lue</Button> : null}</div>)}</div>}</>;
}
