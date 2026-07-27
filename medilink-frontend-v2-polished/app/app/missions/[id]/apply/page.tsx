'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import type { Application, Conversation, Document, Mission, Profile } from '@/lib/types';
import { formatCompensation, formatDate } from '@/lib/format';
import { missionTypeLabel, requiredLevelLabels } from '@/lib/labels';
import { getCandidateMissionPath } from '@/lib/mission-links';
import { useAutoRefresh } from '@/lib/use-auto-refresh';
import { Alert, Badge, Button, Card, Field, LinkButton, LoadingCard, PageHeader, Textarea } from '@/components/ui';

type ApplyResult = {
  application: Application;
  conversation: Conversation;
};

const MINIMUM_PROFILE_COMPLETION = 40;

type ApplicationReadiness = {
  eligible: boolean;
  profileIssue: string | null;
  documentIssue: string | null;
  profileSuggestions: string[];
  approvedDocumentCount: number;
};

function evaluateApplicationReadiness(
  profile: Profile,
  documents: Document[],
): ApplicationReadiness {
  const activeDocuments = documents.filter(
    (document) =>
      document.verificationStatus !== 'DELETED' &&
      document.documentType !== 'AVATAR' &&
      document.documentType !== 'MESSAGE_ATTACHMENT',
  );
  const cv = activeDocuments
    .filter((document) => document.documentType === 'CV')
    .sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt))[0];
  const approvedDocumentCount = activeDocuments.filter(
    (document) => document.verificationStatus === 'APPROVED',
  ).length;
  const profileSuggestions = [
    !profile.firstName || !profile.lastName ? 'identité' : null,
    !profile.city ? 'ville' : null,
    !profile.medicalStatus ? 'statut médical' : null,
    !profile.bio ? 'présentation' : null,
    !profile.acceptedMissionTypes?.length ? 'types de missions recherchés' : null,
  ].filter((value): value is string => Boolean(value));

  const profileIssue = profile.completionScore < MINIMUM_PROFILE_COMPLETION
    ? `Votre profil est complété à ${profile.completionScore} %. Le minimum requis est de ${MINIMUM_PROFILE_COMPLETION} %.`
    : null;

  let documentIssue: string | null = null;
  if (!cv) {
    documentIssue = 'Ajoutez un CV pour constituer votre dossier de candidature.';
  } else if (cv.verificationStatus === 'PENDING_VERIFICATION') {
    documentIssue = "Votre CV est en cours de vérification. Vous pourrez postuler dès qu'il sera validé.";
  } else if (cv.verificationStatus === 'UPLOAD_PENDING') {
    documentIssue = "L'envoi de votre CV n'est pas terminé.";
  } else if (cv.verificationStatus === 'REJECTED') {
    documentIssue = cv.rejectionReason
      ? `Votre CV a été refusé : ${cv.rejectionReason}`
      : 'Votre CV a été refusé. Remplacez-le pour poursuivre.';
  } else if (cv.verificationStatus === 'EXPIRED') {
    documentIssue = 'Votre CV a expiré. Ajoutez une version à jour.';
  }

  return {
    eligible: !profileIssue && !documentIssue && cv?.verificationStatus === 'APPROVED',
    profileIssue,
    documentIssue,
    profileSuggestions,
    approvedDocumentCount,
  };
}

export default function ApplyMissionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [mission, setMission] = useState<Mission | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [existingApplication, setExistingApplication] = useState<Application | null>(null);
  const [coverMessage, setCoverMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ApplyResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  async function loadMission(options: { reload?: boolean } = {}) {
    setMission(options.reload
      ? await api.reload<Mission>(`/missions/${id}`)
      : await api.get<Mission>(`/missions/${id}`));
  }

  const loadApplicationContext = useCallback(async (options: { reload?: boolean } = {}) => {
    const read = options.reload ? api.reload : api.get;
    const [nextMission, nextProfile, nextDocuments, applications] = await Promise.all([
      read<Mission>(`/missions/${id}`),
      read<Profile>('/me/profile'),
      read<Document[]>('/me/documents'),
      read<Application[]>('/me/applications'),
    ]);

    setMission(nextMission);
    setProfile(nextProfile);
    setDocuments(nextDocuments);
    setExistingApplication(
      applications.find((application) => application.missionId === id) || null,
    );

    return {
      profile: nextProfile,
      documents: nextDocuments,
      existingApplication: applications.find((application) => application.missionId === id) || null,
    };
  }, [id]);

  useEffect(() => {
    loadApplicationContext()
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [loadApplicationContext]);

  useAutoRefresh(() => loadMission({ reload: true }), { enabled: !loading && !success && !submitting });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const latestContext = await loadApplicationContext({ reload: true });
      const latestReadiness = evaluateApplicationReadiness(
        latestContext.profile,
        latestContext.documents,
      );
      if (latestContext.existingApplication) {
        setError('Vous avez déjà postulé à cette mission.');
        return;
      }
      if (!latestReadiness.eligible) {
        setError('Votre dossier a changé. Vérifiez les éléments demandés avant de postuler.');
        return;
      }

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
  if (!profile) {
    return (
      <div role="alert">
        <Alert type="error">{error || 'Impossible de vérifier votre dossier de candidature.'}</Alert>
      </div>
    );
  }

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
            <LinkButton href="/app/search?tab=applications">Voir mes candidatures</LinkButton>
            <LinkButton variant="light" href="/app/messages">Ouvrir la messagerie</LinkButton>
            <Button type="button" variant="light" onClick={() => router.push('/app/search')}>Retour aux missions</Button>
          </div>
        </Card>
      </>
    );
  }

  const readiness = evaluateApplicationReadiness(profile, documents);

  if (existingApplication) {
    return (
      <>
        <PageHeader
          title="Candidature déjà envoyée"
          description="Votre dossier a déjà été transmis pour cette mission. Retrouvez son statut dans votre suivi."
          actions={<LinkButton variant="light" href={getCandidateMissionPath(mission.id)}>Voir la mission</LinkButton>}
        />
        <div className="grid-main apply-layout">
          <Card className="card-highlight">
            <h2>Votre candidature est en cours</h2>
            <p>Vous ne pouvez envoyer qu'une candidature par mission.</p>
            <div className="actions">
              <LinkButton href="/app/search?tab=applications">Suivre ma candidature</LinkButton>
              <LinkButton variant="light" href="/app/messages">Voir mes messages</LinkButton>
            </div>
          </Card>
          <MissionSummaryCard mission={mission} />
        </div>
      </>
    );
  }

  if (!readiness.eligible) {
    return (
      <>
        <PageHeader
          title="Préparez votre dossier"
          description="Vérifiez votre profil et votre CV avant de rédiger le message de candidature."
          actions={<LinkButton variant="light" href={getCandidateMissionPath(mission.id)}>Voir la mission</LinkButton>}
        />
        {error ? <div role="alert"><Alert type="error">{error}</Alert></div> : null}
        <div className="grid-main apply-layout">
          <Card className="card-highlight">
            <div className="toolbar">
              <div>
                <h2>Dossier à compléter</h2>
                <p>Le formulaire d'envoi sera disponible dès que ces prérequis seront remplis.</p>
              </div>
              <Badge tone="warning">Action requise</Badge>
            </div>
            <div className="info-list">
              <div>
                <span>Profil candidat</span>
                <strong>{readiness.profileIssue || `Prêt · ${profile.completionScore} %`}</strong>
              </div>
              <div>
                <span>CV</span>
                <strong>{readiness.documentIssue || 'Validé'}</strong>
              </div>
              <div>
                <span>Documents déjà validés</span>
                <strong>{readiness.approvedDocumentCount}</strong>
              </div>
            </div>
            {readiness.profileSuggestions.length ? (
              <p className="small">
                À renseigner en priorité : {readiness.profileSuggestions.join(', ')}.
              </p>
            ) : null}
            <div className="actions">
              {readiness.profileIssue ? (
                <LinkButton href="/app/profile">Compléter mon profil</LinkButton>
              ) : null}
              {readiness.documentIssue ? (
                <LinkButton href="/app/profile" variant={readiness.profileIssue ? 'secondary' : 'primary'}>
                  Ajouter ou suivre mon CV
                </LinkButton>
              ) : null}
              <LinkButton variant="light" href="/app/search">Choisir une autre mission</LinkButton>
            </div>
          </Card>
          <MissionSummaryCard mission={mission} />
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Postuler à la mission"
        description="Relisez les informations, ajoutez un message de candidature si besoin, puis envoyez votre dossier."
        actions={<LinkButton variant="light" href={getCandidateMissionPath(mission.id)}>Voir détails de la mission</LinkButton>}
      />

      {error ? <div role="alert"><Alert type="error">{error}</Alert></div> : null}

      <Card className="card-highlight">
        <div className="toolbar">
          <div>
            <h2>Dossier prêt à être transmis</h2>
            <p>Votre profil atteint {profile.completionScore} % et votre CV est validé.</p>
          </div>
          <Badge tone="success">Éligible</Badge>
        </div>
      </Card>

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
                aria-describedby="cover-message-counter"
                placeholder="Bonjour, je suis disponible pour cette mission..."
              />
            </Field>
            <div className="toolbar">
              <span className="small" id="cover-message-counter" aria-live="polite">
                {coverMessage.length}/2000 caractères
              </span>
              <div className="actions">
                <LinkButton variant="light" href="/app/search">Annuler</LinkButton>
                <Button disabled={submitting || !readiness.eligible}>
                  {submitting ? 'Vérification et envoi...' : 'Envoyer ma candidature'}
                </Button>
              </div>
            </div>
          </form>
        </Card>

        <MissionSummaryCard mission={mission} />
      </div>
    </>
  );
}

function MissionSummaryCard({ mission }: { mission: Mission }) {
  return (
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
  );
}
