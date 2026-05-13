'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import type { Mission } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabel } from '@/lib/labels';
import { Alert, Badge, Button, Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

export default function MissionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { api.get<Mission>(`/missions/${id}`).then(setMission).catch((e) => setError(e.message)).finally(() => setLoading(false)); }, [id]);
  if (loading) return <LoadingCard />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!mission) return null;

  async function apply() {
    const coverMessage = prompt('Message de candidature facultatif') || undefined;
    try { await api.post(`/missions/${mission!.id}/apply`, { coverMessage }); alert('Candidature envoyée.'); router.push('/app/applications'); }
    catch (e: any) { setError(e.message); }
  }

  return <>
    <PageHeader title={mission.title} description={`${mission.establishment?.name || 'Établissement'} · ${mission.city}`} actions={<Button onClick={apply}>Postuler</Button>} />
    {error ? <Alert type="error">{error}</Alert> : null}
    <div className="grid-2">
      <Card><h2>Détails</h2><p>{mission.description || 'Aucune description.'}</p><div className="tag-list"><Badge>{missionTypeLabel(mission.missionType)}</Badge><Badge>{requiredLevelLabel(mission.requiredLevel)}</Badge>{mission.tags?.map((tag) => <Badge key={tag.id} tone="neutral">#{tag.tag}</Badge>)}</div></Card>
      <Card><h2>Informations pratiques</h2><p><strong>Date :</strong> {formatDate(mission.startDate)}</p><p><strong>Horaire :</strong> {mission.startTime || '—'} {mission.endTime ? `- ${mission.endTime}` : ''}</p><p><strong>Durée :</strong> {mission.durationHours || '—'} h</p><p><strong>Rémunération :</strong> {formatMoney(mission.compensationAmount, mission.compensationCurrency)}</p><p><strong>Localisation :</strong> {mission.location || mission.city}</p></Card>
    </div>
    <div style={{ marginTop: 16 }}><LinkButton variant="light" href="/app/search">Retour à la recherche</LinkButton></div>
  </>;
}
