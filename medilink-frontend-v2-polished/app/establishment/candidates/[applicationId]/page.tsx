'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { api, isMockStorageUrl } from '@/lib/api';
import type { CandidateProfileForApplication, Document } from '@/lib/types';
import { documentTypeLabel, medicalStatusOptions, missionTypeLabel, requiredLevelLabels, statusLabel } from '@/lib/labels';
import { formatCompensation, formatDate, formatDateTime } from '@/lib/format';
import { Alert, Badge, Button, Card, LinkButton, LoadingCard, PageHeader, ProgressBar } from '@/components/ui';

function applicationTone(status: string) {
  if (status === 'ACCEPTED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'VIEWED') return 'warning';
  return 'neutral';
}

function docTone(status: string) {
  if (status === 'APPROVED') return 'success';
  if (status === 'REJECTED') return 'danger';
  if (status === 'PENDING_VERIFICATION') return 'warning';
  return 'neutral';
}

function medicalStatusLabel(value?: string | null) {
  return medicalStatusOptions.find((x) => x.value === value)?.label || value || '—';
}

export default function EstablishmentCandidateProfilePage() {
  const params = useParams<{ applicationId: string }>();
  const applicationId = params.applicationId;

  const [data, setData] = useState<CandidateProfileForApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!applicationId) return;

    api.get<CandidateProfileForApplication>(`/establishment/applications/${applicationId}/candidate-profile`)
      .then(setData)
      .catch((e: any) => setError(e.message))
      .finally(() => setLoading(false));
  }, [applicationId]);

  async function openDocument(document: Document) {
    try {
      const res = await api.get<{ provider: string; downloadUrl: string }>(`/documents/${document.id}/download-url`);

      if (isMockStorageUrl(res.downloadUrl)) {
        alert('Storage mock : aucun fichier réel à ouvrir en local.');
        return;
      }

      window.open(res.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (e: any) {
      setError(e.message);
    }
  }

  if (loading) return <LoadingCard label="Chargement du profil candidat..." />;
  if (error) return <Alert type="error">{error}</Alert>;
  if (!data) return <Alert type="error">Profil introuvable.</Alert>;

  const profile = data.candidate.profile;
  const documents = data.candidate.documents || [];
  const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim() || data.candidate.email;

  return (
    <>
      <PageHeader
        title={fullName}
        description="Profil candidat consultable dans le cadre d’une candidature reçue."
        actions={
          <>
            <LinkButton variant="light" href="/establishment/applications">Retour</LinkButton>
            {data.conversation ? (
              <LinkButton variant="primary" href="/establishment/messages">Ouvrir la conversation</LinkButton>
            ) : null}
          </>
        }
      />

      <div className="grid-main">
        <Card className="card-highlight">
          <div className="actions" style={{ justifyContent: 'space-between' }}>
            <Badge tone={applicationTone(data.application.status) as any}>
              Candidature {statusLabel(data.application.status)}
            </Badge>
            <span className="small">Reçue le {formatDateTime(data.application.createdAt)}</span>
          </div>

          <div className="divider" />

          <h2>{fullName}</h2>
          <p className="muted">{data.candidate.email}</p>

          <div className="form-row" style={{ marginTop: 18 }}>
            <div className="stat">
              <span>Statut médical</span>
              <strong>{medicalStatusLabel(profile?.medicalStatus)}</strong>
            </div>
            <div className="stat">
              <span>Spécialité</span>
              <strong>{profile?.specialty || '—'}</strong>
            </div>
          </div>

          <div className="form-row" style={{ marginTop: 18 }}>
            <div className="stat">
              <span>Ville</span>
              <strong>{profile?.city || '—'}</strong>
            </div>
            <div className="stat">
              <span>Téléphone</span>
              <strong>{data.candidate.phone || '—'}</strong>
            </div>
          </div>

          <div className="divider" />
          <span className="small">Complétion du profil</span>
          <ProgressBar value={profile?.completionScore || 0} />
          <p className="small">{profile?.completionScore || 0}% complété</p>
        </Card>

        <Card>
          <h2>Mission liée</h2>
          <p><strong>{data.mission.title}</strong></p>
          <p className="muted">{data.mission.establishment?.name} · {data.mission.city}</p>

          <div className="info-list">
            <div><span>Type</span><strong>{missionTypeLabel(data.mission.missionType)}</strong></div>
            <div><span>Niveau</span><strong>{requiredLevelLabels(data.mission.requiredLevels, data.mission.requiredLevel)}</strong></div>
            <div><span>Date</span><strong>{formatDate(data.mission.startDate)}</strong></div>
            <div><span>Horaire</span><strong>{data.mission.startTime || '—'} → {data.mission.endTime || '—'}</strong></div>
            <div><span>Rémunération</span><strong>{formatCompensation(data.mission)}</strong></div>
          </div>

          {data.application.coverMessage ? (
            <>
              <div className="divider" />
              <h3>Message de candidature</h3>
              <p>{data.application.coverMessage}</p>
            </>
          ) : null}
        </Card>
      </div>

      <div className="grid-main" style={{ marginTop: 16 }}>
        <Card>
          <h2>Informations professionnelles</h2>
          <div className="info-list">
            <div><span>Orientation</span><strong>{profile?.orientation || '—'}</strong></div>
            <div><span>Hôpital / faculté</span><strong>{profile?.hospitalOrFaculty || '—'}</strong></div>
            <div><span>Expérience</span><strong>{profile?.experienceYears != null ? `${profile.experienceYears} an(s)` : '—'}</strong></div>
            <div><span>Disponibilités</span><strong>{profile?.availabilityNotes || '—'}</strong></div>
          </div>

          {profile?.bio ? (
            <>
              <div className="divider" />
              <h3>Bio</h3>
              <p>{profile.bio}</p>
            </>
          ) : null}
        </Card>

        <Card>
          <h2>Compétences et actes</h2>

          {profile?.actsPerformed?.length ? (
            <div className="tag-list">
              {profile.actsPerformed.map((act) => <span key={act}>{act}</span>)}
            </div>
          ) : (
            <p className="muted">Aucun acte renseigné.</p>
          )}

          {profile?.userSkills?.length ? (
            <>
              <div className="divider" />
              <div className="tag-list">
                {profile.userSkills.map((item) => (
                  <span key={item.id}>{item.skill.name}{item.level ? ` · ${item.level}` : ''}</span>
                ))}
              </div>
            </>
          ) : null}
        </Card>
      </div>

      <div style={{ marginTop: 16 }}>
        <Card>
        <div className="actions" style={{ justifyContent: 'space-between' }}>
          <div>
            <h2>Documents validés</h2>
            <p className="muted">Documents consultables car le candidat a postulé à une mission de votre établissement.</p>
          </div>
          <Badge tone="success">{documents.length} document(s)</Badge>
        </div>

        <div className="table-wrap" style={{ marginTop: 14 }}>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Fichier</th>
                <th>Statut</th>
                <th>Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td>{documentTypeLabel(doc.documentType)}</td>
                  <td>{doc.fileName}</td>
                  <td><Badge tone={docTone(doc.verificationStatus) as any}>{statusLabel(doc.verificationStatus)}</Badge></td>
                  <td>{formatDateTime(doc.createdAt)}</td>
                  <td><Button variant="light" onClick={() => void openDocument(doc)}>Voir</Button></td>
                </tr>
              ))}
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={5}>Aucun document validé disponible.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
        </Card>
      </div>
    </>
  );
}
