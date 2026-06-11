'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { missionTypeLabel, statusLabel } from '@/lib/labels';
import type { Mission } from '@/lib/types';
import { Alert, Badge, Button, Field, Input, LoadingCard, PageHeader, Select } from '@/components/ui';

type MatchTier = {
  label: string;
  minimumScore: number;
};

type MatchCandidate = {
  candidateUserId: string;
  email: string;
  displayName: string;
  score: number;
  tier: string;
  reasons: string[];
  breakdown: Record<string, number>;
  alreadyNotified: boolean;
};

type MatchPreview = {
  mission: {
    id: string;
    title: string;
    city: string;
    specialty: string;
    missionType: string;
    startDate: string;
    establishmentName: string;
  };
  thresholds: MatchTier[];
  total: number;
  items: MatchCandidate[];
};

type DispatchResult = {
  sent: number;
  selectedTier: string | null;
  minimumScore: number;
  failed?: Array<{ candidateUserId: string; error: string }>;
  items: MatchCandidate[];
};

const tierLabels: Record<string, string> = {
  excellent: 'Excellent',
  strong: 'Fort',
  good: 'Bon',
  exploratory: 'Exploratoire',
  below_threshold: 'Sous seuil',
};

function tierTone(tier: string) {
  if (tier === 'excellent') return 'success';
  if (tier === 'strong' || tier === 'good') return 'warning';
  return 'neutral';
}

function scoreTone(score: number) {
  if (score >= 85) return 'success';
  if (score >= 65) return 'warning';
  return 'neutral';
}

export default function AdminMatchingPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState('');
  const [preview, setPreview] = useState<MatchPreview | null>(null);
  const [targetCount, setTargetCount] = useState(5);
  const [minimumScore, setMinimumScore] = useState(55);
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const publishedMissions = useMemo(
    () => missions.filter((mission) => mission.status === 'PUBLISHED'),
    [missions],
  );

  async function loadMissions() {
    try {
      setError(null);
      const items = await api.get<Mission[]>('/admin/missions');
      setMissions(items);
      const firstPublished = items.find((mission) => mission.status === 'PUBLISHED');
      setSelectedMissionId((current) => current || firstPublished?.id || '');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const loadPreview = useCallback(async (missionId?: string) => {
    const id = missionId || selectedMissionId;
    if (!id) return;
    try {
      setError(null);
      setSuccess(null);
      setPreviewLoading(true);
      setPreview(await api.reload<MatchPreview>(`/admin/matching/missions/${id}/preview?limit=100`));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setPreviewLoading(false);
    }
  }, [selectedMissionId]);

  async function dispatchMatches() {
    if (!selectedMissionId || !preview) return;
    if (!confirm(`Envoyer une vague de ${targetCount} recommandation(s) avec un seuil minimum de ${minimumScore}/100 ?`)) return;

    try {
      setError(null);
      setSuccess(null);
      setDispatching(true);
      const result = await api.post<DispatchResult>(`/admin/matching/missions/${selectedMissionId}/dispatch`, {
        targetCount,
        minimumScore,
      });
      setSuccess(`${result.sent} recommandation(s) envoyee(s).${result.failed?.length ? ` ${result.failed.length} echec(s).` : ''}`);
      await loadPreview(selectedMissionId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDispatching(false);
    }
  }

  useEffect(() => { void loadMissions(); }, []);

  useEffect(() => {
    setPreview(null);
    if (selectedMissionId) void loadPreview(selectedMissionId);
  }, [selectedMissionId, loadPreview]);

  if (loading) return <LoadingCard label="Chargement du matching..." />;

  const selectedMission = missions.find((mission) => mission.id === selectedMissionId);
  const pendingCandidates = preview?.items.filter((candidate) => !candidate.alreadyNotified) || [];
  const topCandidate = preview?.items[0];

  return (
    <>
      <PageHeader
        title="Matching intelligent"
        description="Pilote les recommandations mission-candidat, les seuils de pertinence et les vagues d'envoi."
        actions={<Button variant="light" onClick={() => void loadMissions()}>Rafraichir</Button>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}
      {success ? <Alert type="success">{success}</Alert> : null}

      <section className="card">
        <div className="toolbar">
          <div>
            <h2>Mission a pousser</h2>
            <p className="small">{publishedMissions.length} mission(s) publiee(s) eligible(s) au matching.</p>
          </div>
          <Badge tone={selectedMission?.status === 'PUBLISHED' ? 'success' : 'warning'}>
            {selectedMission ? statusLabel(selectedMission.status) : 'Aucune mission'}
          </Badge>
        </div>

        <div className="form-grid">
          <Field label="Mission publiee">
            <Select
              value={selectedMissionId}
              onChange={(event) => setSelectedMissionId(event.target.value)}
            >
              <option value="">Selectionner une mission</option>
              {publishedMissions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.title} - {mission.city} - {formatDateTime(mission.startDate)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre a envoyer">
            <Input
              type="number"
              min={1}
              max={50}
              value={targetCount}
              onChange={(event) => setTargetCount(Number(event.target.value))}
            />
          </Field>
          <Field label="Seuil minimum">
            <Input
              type="number"
              min={1}
              max={100}
              value={minimumScore}
              onChange={(event) => setMinimumScore(Number(event.target.value))}
            />
          </Field>
        </div>

        {selectedMission ? (
          <div className="grid" style={{ marginTop: 16 }}>
            <div>
              <span className="small">Etablissement</span>
              <strong>{selectedMission.establishment?.name || 'Etablissement'}</strong>
            </div>
            <div>
              <span className="small">Type</span>
              <strong>{missionTypeLabel(selectedMission.missionType)}</strong>
            </div>
            <div>
              <span className="small">Specialite</span>
              <strong>{selectedMission.specialty}</strong>
            </div>
            <div>
              <span className="small">Ville</span>
              <strong>{selectedMission.city}</strong>
            </div>
          </div>
        ) : null}

        <div className="actions" style={{ marginTop: 16 }}>
          <Button
            variant="secondary"
            disabled={!selectedMissionId || previewLoading}
            onClick={() => void loadPreview()}
          >
            {previewLoading ? 'Analyse...' : 'Previsualiser'}
          </Button>
          <Button
            variant="success"
            disabled={!preview || pendingCandidates.length === 0 || dispatching}
            onClick={() => void dispatchMatches()}
          >
            {dispatching ? 'Envoi...' : 'Envoyer la vague'}
          </Button>
        </div>
      </section>

      {previewLoading ? <LoadingCard label="Analyse des candidats..." /> : null}

      {preview ? (
        <>
          <div className="stats-grid">
            <div className="card stat-card">
              <div className="stat">
                <span>Candidats pertinents</span>
                <strong>{preview.total}</strong>
                <div className="small">{pendingCandidates.length} jamais notifie(s)</div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat">
                <span>Meilleur score</span>
                <strong>{topCandidate ? `${topCandidate.score}/100` : '-'}</strong>
                <div className="small">{topCandidate?.displayName || 'Aucun candidat'}</div>
              </div>
            </div>
            <div className="card stat-card">
              <div className="stat">
                <span>Paliers actifs</span>
                <strong>{preview.thresholds.length}</strong>
                <div className="small">{preview.thresholds.map((tier) => `${tier.minimumScore}+`).join(' / ')}</div>
              </div>
            </div>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidat</th>
                  <th>Score</th>
                  <th>Palier</th>
                  <th>Raisons</th>
                  <th>Breakdown</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {preview.items.map((candidate) => (
                  <tr key={candidate.candidateUserId}>
                    <td>
                      <strong>{candidate.displayName}</strong>
                      <div className="small">{candidate.email}</div>
                    </td>
                    <td><Badge tone={scoreTone(candidate.score) as any}>{candidate.score}/100</Badge></td>
                    <td><Badge tone={tierTone(candidate.tier) as any}>{tierLabels[candidate.tier] || candidate.tier}</Badge></td>
                    <td>
                      <div className="small">
                        {candidate.reasons.slice(0, 4).join(' | ') || 'Aucune raison forte'}
                      </div>
                    </td>
                    <td>
                      <div className="small">
                        {Object.entries(candidate.breakdown)
                          .sort(([, left], [, right]) => right - left)
                          .slice(0, 4)
                          .map(([key, value]) => `${key} +${value}`)
                          .join(' | ')}
                      </div>
                    </td>
                    <td>
                      <Badge tone={candidate.alreadyNotified ? 'success' : 'neutral'}>
                        {candidate.alreadyNotified ? 'Deja notifie' : 'Pret'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {preview.items.length === 0 ? (
                  <tr>
                    <td colSpan={6}>Aucun candidat au-dessus du seuil de matching actuel.</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </>
  );
}
