'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Application, Conversation, Mission } from '@/lib/types';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabels } from '@/lib/labels';
import { Alert, Badge, Button, Card, Field, LinkButton, LoadingCard, PageHeader, Textarea } from '@/components/ui';

type ApplyResult = {
  application: Application;
  conversation: Conversation;
};

export default function ApplyMissionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [coverMessage, setCoverMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ApplyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Mission>(`/missions/${id}`)
      .then(setMission)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const result = await api.post<ApplyResult>(`/missions/${id}/apply`, {
        coverMessage: coverMessage.trim() || undefined,
      });
      setSuccess(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingCard />;
  if (!mission && error) return <Alert type="error">{error}</Alert>;
  if (!mission) return null;

  if (success) {
    return (
      <>
        <PageHeader
          title="Candidature envoyée"
          description="Votre candidature a bien été transmise à l'établissement. Une conversation a été créée pour la suite."
        />
        <Card className="card-highlight">
          <h2>{mission.title}</h2>
          <p>{mission.establishment?.name || 'Établissement'} - {mission.city}</p>
          <div className="actions">
            <LinkButton href="/app/applications">Voir mes candidatures</LinkButton>
            <LinkButton variant="light" href="/app/messages">Ouvrir la messagerie</LinkButton>
            <Button type="button" variant="light" onClick={() => router.push('/app/search')}>Retour aux missions</Button>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Postuler à la mission"
        description="Relisez les informations, ajoutez un message de candidature si besoin, puis envoyez votre dossier."
        actions={<LinkButton variant="light" href={`/missions/${mission.id}`}>Retour au détail</LinkButton>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}

      <div className="grid-main apply-layout">
        <Card>
          <h2>Message de candidature</h2>
          <p>Ce message sera visible par l'établissement avec votre profil et vos documents validés.</p>
          <form className="form" onSubmit={submit}>
            <Field label="Message facultatif">
              <Textarea
                value={coverMessage}
                onChange={(e) => setCoverMessage(e.target.value)}
                maxLength={2000}
                placeholder="Bonjour, je suis disponible pour cette mission..."
              />
            </Field>
            <div className="toolbar">
              <span className="small">{coverMessage.length}/2000 caractères</span>
              <div className="actions">
                <LinkButton variant="light" href="/app/search">Annuler</LinkButton>
                <Button disabled={submitting}>{submitting ? 'Envoi...' : 'Envoyer ma candidature'}</Button>
              </div>
            </div>
          </form>
        </Card>

        <Card className="card-highlight">
          <h2>Récapitulatif mission</h2>
          <div className="tag-list">
            <Badge>{missionTypeLabel(mission.missionType)}</Badge>
            <Badge tone="neutral">{requiredLevelLabels(mission.requiredLevels, mission.requiredLevel)}</Badge>
          </div>
          <div className="info-list">
            <div><span>Mission</span><strong>{mission.title}</strong></div>
            <div><span>Établissement</span><strong>{mission.establishment?.name || 'Établissement'}</strong></div>
            <div><span>Ville</span><strong>{mission.city}</strong></div>
            <div><span>Date</span><strong>{formatDate(mission.startDate)}</strong></div>
            <div><span>Horaire</span><strong>{mission.startTime || '-'} {mission.endTime ? `- ${mission.endTime}` : ''}</strong></div>
            <div><span>Rémunération</span><strong>{formatCompensation(mission)}</strong></div>
          </div>
        </Card>
      </div>
    </>
  );
}
