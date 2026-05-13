'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Establishment } from '@/lib/types';
import { establishmentTypeLabel, statusLabel } from '@/lib/labels';
import { Alert, Badge, Button, LoadingCard, PageHeader } from '@/components/ui';

export default function AdminEstablishmentsPage() {
  const [items, setItems] = useState<Establishment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  async function load() { try { setItems(await api.get<Establishment[]>('/admin/establishments')); } catch (e: any) { setError(e.message); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  async function verify(id: string) { try { await api.post(`/admin/establishments/${id}/verify`, {}); await load(); } catch (e: any) { setError(e.message); } }
  if (loading) return <LoadingCard />;
  return <><PageHeader title="Établissements" description="Validation des établissements recruteurs." />{error ? <Alert type="error">{error}</Alert> : null}<div className="table-wrap"><table><thead><tr><th>Nom</th><th>Type</th><th>Ville</th><th>Statut</th><th>Membres</th><th>Action</th></tr></thead><tbody>{items.map((e) => <tr key={e.id}><td><strong>{e.name}</strong><div className="small">{e.email}</div></td><td>{establishmentTypeLabel(e.type)}</td><td>{e.city || '—'}</td><td><Badge tone={e.verificationStatus === 'VERIFIED' ? 'success' : 'warning'}>{statusLabel(e.verificationStatus)}</Badge></td><td>{e.members?.length || 0}</td><td><Button variant="success" disabled={e.verificationStatus === 'VERIFIED'} onClick={() => verify(e.id)}>Vérifier</Button></td></tr>)}</tbody></table></div></>;
}
