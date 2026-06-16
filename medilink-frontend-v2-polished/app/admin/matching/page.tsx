'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { medicalStatusLabel, missionTypeLabel, statusLabel } from '@/lib/labels';
import type { MedicalStatus, Mission } from '@/lib/types';
import { Alert, Badge, Button, Field, Input, LoadingCard, PageHeader, Select } from '@/components/ui';

type MatchTier = {
  label: string;
  minimumScore: number;
};

type MatchCandidate = {
  candidateUserId: string;
  email: string;
  displayName: string;
  profile: {
    firstName?: string | null;
    lastName?: string | null;
    city?: string | null;
    medicalStatus?: MedicalStatus | null;
    specialty?: string | null;
    verifiedSpecialty?: string | null;
    completionScore: number;
  };
  eligible: boolean;
  score: number;
  tier: string;
  reasons: string[];
  exclusionReasons: string[];
  risks: string[];
  missingData: string[];
  confidence: number;
  breakdown: Record<string, number>;
  alreadyNotified: boolean;
};

type MatchingConfig = {
  version: number;
  weights: Record<string, number>;
  thresholds: Record<string, number>;
  exclusions: Record<string, boolean | number>;
  dispatch: Record<string, number | boolean>;
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
  excludedTotal: number;
  items: MatchCandidate[];
  excluded: MatchCandidate[];
  config: MatchingConfig;
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
  excluded: 'Exclu',
};

const breakdownLabels: Record<string, string> = {
  requiredLevel: 'Niveau requis',
  specialty: 'Spécialité',
  location: 'Localisation',
  missionType: 'Type de mission',
  timeSlot: 'Créneau',
  duration: 'Durée',
  practiceSetting: "Cadre d'exercice",
  software: 'Logiciel',
  patientType: 'Patientèle',
  acts: 'Actes',
  workConditions: 'Conditions',
  accommodation: 'Logement',
  compensation: 'Remuneration',
  workload: 'Charge patient',
  payment: 'Paiement',
  profileQuality: 'Qualite du profil',
};

const editableWeightKeys = [
  ['requiredLevel', 'Niveau'],
  ['specialtyExact', 'Specialite exacte'],
  ['specialtyPartial', 'Specialite proche'],
  ['locationPreferredCity', 'Ville preferee'],
  ['locationSameCity', 'Meme ville'],
  ['locationFlexibleMobility', 'Mobilite'],
  ['missionType', 'Type mission'],
  ['timeSlot', 'Creneau'],
  ['compensationMet', 'Remuneration OK'],
  ['profileVerified', 'Profil verifie'],
];

const editableThresholdKeys = [
  ['excellent', 'Excellent'],
  ['strong', 'Fort'],
  ['good', 'Bon'],
  ['exploratory', 'Exploratoire'],
];

const editableExclusionKeys = [
  ['requireCompatibleLevel', 'Niveau compatible obligatoire'],
  ['excludeRejectedMissionType', 'Type refuse excluant'],
  ['excludeImpossibleLocation', 'Localisation impossible excluante'],
  ['excludeRejectedTimeSlot', 'Creneau refuse excluant'],
  ['excludeMissingAccommodation', 'Logement obligatoire excluant'],
  ['excludeRejectedActs', 'Actes refuses excluants'],
];

function tierTone(tier: string) {
  if (tier === 'excellent') return 'success';
  if (tier === 'strong' || tier === 'good') return 'warning';
  if (tier === 'excluded') return 'danger';
  return 'neutral';
}

function scoreTone(score: number) {
  if (score >= 85) return 'success';
  if (score >= 65) return 'warning';
  return 'neutral';
}

function decisionLabel(candidate: MatchCandidate) {
  if (!candidate.eligible) return 'Exclu du matching';
  if (candidate.alreadyNotified) return 'Déjà notifié';
  if (candidate.score >= 85) return 'Priorité forte';
  if (candidate.score >= 65) return 'Bon candidat';
  if (candidate.score >= 55) return 'À tester';
  return 'Sous seuil';
}

function decisionTone(candidate: MatchCandidate) {
  if (!candidate.eligible) return 'danger';
  if (candidate.alreadyNotified) return 'success';
  return scoreTone(candidate.score);
}

function candidateSpecialty(candidate: MatchCandidate) {
  return candidate.profile.verifiedSpecialty || candidate.profile.specialty || 'Spécialité non renseignée';
}

function sortedBreakdown(candidate?: MatchCandidate | null) {
  return Object.entries(candidate?.breakdown || {}).sort(([, left], [, right]) => right - left);
}

export default function AdminMatchingPage() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState('');
  const [selectedCandidateId, setSelectedCandidateId] = useState('');
  const [preview, setPreview] = useState<MatchPreview | null>(null);
  const [config, setConfig] = useState<MatchingConfig | null>(null);
  const [configSaving, setConfigSaving] = useState(false);
  const [targetCount, setTargetCount] = useState(5);
  const [minimumScore, setMinimumScore] = useState(55);
  const [displayMinimumScore, setDisplayMinimumScore] = useState(0);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'eligible' | 'excluded' | 'all'>('eligible');
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [dispatching, setDispatching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const publishedMissions = useMemo(
    () => missions.filter((mission) => mission.status === 'PUBLISHED'),
    [missions],
  );

  const allCandidates = useMemo(
    () => preview ? [...preview.items, ...preview.excluded] : [],
    [preview],
  );

  const visibleCandidates = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return allCandidates.filter((candidate) => {
      if (viewMode === 'eligible' && !candidate.eligible) return false;
      if (viewMode === 'excluded' && candidate.eligible) return false;
      if (candidate.eligible && candidate.score < displayMinimumScore) return false;
      if (!normalizedSearch) return true;

      const haystack = [
        candidate.displayName,
        candidate.email,
        candidate.profile.city,
        candidate.profile.specialty,
        candidate.profile.verifiedSpecialty,
        medicalStatusLabel(candidate.profile.medicalStatus),
        ...candidate.reasons,
        ...candidate.exclusionReasons,
      ].filter(Boolean).join(' ').toLowerCase();

      return haystack.includes(normalizedSearch);
    });
  }, [allCandidates, displayMinimumScore, search, viewMode]);

  const selectedCandidate = useMemo(
    () => allCandidates.find((candidate) => candidate.candidateUserId === selectedCandidateId) || visibleCandidates[0] || null,
    [allCandidates, selectedCandidateId, visibleCandidates],
  );

  const pendingCandidates = preview?.items.filter((candidate) => !candidate.alreadyNotified) || [];
  const notifiedCandidates = preview?.items.filter((candidate) => candidate.alreadyNotified) || [];
  const topCandidate = preview?.items[0] || null;
  const averageScore = preview?.items.length
    ? Math.round(preview.items.reduce((total, candidate) => total + candidate.score, 0) / preview.items.length)
    : 0;

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

  async function loadConfig() {
    try {
      const nextConfig = await api.get<MatchingConfig>('/admin/matching/config');
      setConfig(nextConfig);
      setMinimumScore(Number(nextConfig.dispatch.minimumScore) || Number(nextConfig.thresholds.exploratory) || 55);
      setTargetCount(Number(nextConfig.dispatch.targetCount) || 5);
    } catch (e: any) {
      setError(e.message);
    }
  }

  function updateWeight(key: string, value: string) {
    const numberValue = Number(value);
    setConfig((current) => current ? {
      ...current,
      weights: { ...current.weights, [key]: Number.isFinite(numberValue) ? numberValue : 0 },
    } : current);
  }

  function updateThreshold(key: string, value: string) {
    const numberValue = Number(value);
    setConfig((current) => current ? {
      ...current,
      thresholds: { ...current.thresholds, [key]: Number.isFinite(numberValue) ? numberValue : 0 },
    } : current);
  }

  function updateExclusion(key: string, value: boolean) {
    setConfig((current) => current ? {
      ...current,
      exclusions: { ...current.exclusions, [key]: value },
    } : current);
  }

  async function saveConfig() {
    if (!config) return;
    try {
      setConfigSaving(true);
      setError(null);
      setSuccess(null);
      const nextConfig = await api.post<MatchingConfig>('/admin/matching/config', {
        weights: config.weights,
        thresholds: config.thresholds,
        exclusions: config.exclusions,
        dispatch: {
          ...config.dispatch,
          targetCount,
          minimumScore,
        },
      });
      setConfig(nextConfig);
      setSuccess('Configuration du matching enregistree.');
      if (selectedMissionId) await loadPreview(selectedMissionId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setConfigSaving(false);
    }
  }

  const loadPreview = useCallback(async (missionId?: string) => {
    const id = missionId || selectedMissionId;
    if (!id) return;
    try {
      setError(null);
      setSuccess(null);
      setPreviewLoading(true);
      const nextPreview = await api.reload<MatchPreview>(`/admin/matching/missions/${id}/preview?limit=100`);
      setPreview(nextPreview);
      setSelectedCandidateId(nextPreview.items[0]?.candidateUserId || nextPreview.excluded[0]?.candidateUserId || '');
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
      setSuccess(`${result.sent} recommandation(s) envoyée(s).${result.failed?.length ? ` ${result.failed.length} échec(s).` : ''}`);
      await loadPreview(selectedMissionId);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setDispatching(false);
    }
  }

  useEffect(() => {
    void loadMissions();
    void loadConfig();
  }, []);

  useEffect(() => {
    setPreview(null);
    setSelectedCandidateId('');
    if (selectedMissionId) void loadPreview(selectedMissionId);
  }, [selectedMissionId, loadPreview]);

  if (loading) return <LoadingCard label="Chargement du matching..." />;

  const selectedMission = missions.find((mission) => mission.id === selectedMissionId);

  return (
    <div className="admin-matching-page">
      <PageHeader
        title="Matching intelligent"
        description="Analyse les profils candidats, explique les décisions de scoring et pilote les vagues de recommandations."
        actions={<Button variant="light" onClick={() => void loadMissions()}>Rafraîchir</Button>}
      />

      {error ? <Alert type="error">{error}</Alert> : null}
      {success ? <Alert type="success">{success}</Alert> : null}

      {config ? (
        <section className="card matching-command matching-engine-panel">
          <div className="matching-command-main">
            <div className="matching-command-copy">
              <span className="section-kicker">Pilotage du moteur</span>
              <h2>Parametres de scoring</h2>
              <p>Controle les poids, seuils et exclusions utilises pour classer les candidats.</p>
            </div>
            <Badge tone="neutral">Version {config.version}</Badge>
          </div>

          <div className="matching-engine-layout">
            <div className="matching-tuning-panel">
              <div className="matching-panel-head">
                <strong>Seuils de decision</strong>
                <span>Paliers utilises pour classer les profils.</span>
              </div>
              <div className="matching-compact-grid">
                {editableThresholdKeys.map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={config.thresholds[key] ?? 0}
                      onChange={(event) => updateThreshold(key, event.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </div>

            <div className="matching-tuning-panel">
              <div className="matching-panel-head">
                <strong>Vague par defaut</strong>
                <span>Valeurs pre-remplies avant l'envoi.</span>
              </div>
              <div className="matching-compact-grid">
                <Field label="Candidats">
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={targetCount}
                    onChange={(event) => setTargetCount(Number(event.target.value))}
                  />
                </Field>
                <Field label="Score minimum">
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={minimumScore}
                    onChange={(event) => setMinimumScore(Number(event.target.value))}
                  />
                </Field>
              </div>
            </div>

            <div className="matching-tuning-panel matching-tuning-panel--wide">
              <div className="matching-panel-head">
                <strong>Ponderations principales</strong>
                <span>Points attribues aux signaux les plus importants.</span>
              </div>
              <div className="matching-weights-grid">
                {editableWeightKeys.map(([key, label]) => (
                  <Field key={key} label={label}>
                    <Input
                      type="number"
                      min={0}
                      max={30}
                      value={config.weights[key] ?? 0}
                      onChange={(event) => updateWeight(key, event.target.value)}
                    />
                  </Field>
                ))}
              </div>
            </div>

            <div className="matching-tuning-panel matching-tuning-panel--wide">
              <div className="matching-panel-head">
                <strong>Exclusions automatiques</strong>
                <span>Contraintes qui sortent un profil du matching.</span>
              </div>
              <div className="matching-switch-grid">
                {editableExclusionKeys.map(([key, label]) => (
                  <label key={key} className="checkbox-line">
                    <input
                      type="checkbox"
                      checked={config.exclusions[key] !== false}
                      onChange={(event) => updateExclusion(key, event.target.checked)}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="actions matching-actions-bar">
            <Button variant="secondary" disabled={configSaving} onClick={() => void loadConfig()}>
              Recharger
            </Button>
            <Button disabled={configSaving} onClick={() => void saveConfig()}>
              {configSaving ? 'Enregistrement...' : 'Enregistrer les parametres'}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="card matching-command">
        <div className="matching-command-main">
          <div className="matching-command-copy">
            <span className="section-kicker">Mission analysée</span>
            <h2>{selectedMission?.title || 'Sélectionner une mission'}</h2>
            <p>{publishedMissions.length} mission(s) publiée(s) peuvent être poussées aux candidats.</p>
          </div>
          <Badge tone={selectedMission?.status === 'PUBLISHED' ? 'success' : 'warning'}>
            {selectedMission ? statusLabel(selectedMission.status) : 'Aucune mission'}
          </Badge>
        </div>

        <div className="matching-control-grid">
          <Field label="Mission publiée">
            <Select value={selectedMissionId} onChange={(event) => setSelectedMissionId(event.target.value)}>
              <option value="">Sélectionner une mission</option>
              {publishedMissions.map((mission) => (
                <option key={mission.id} value={mission.id}>
                  {mission.title} - {mission.city} - {formatDateTime(mission.startDate)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Nombre à envoyer">
            <Input
              type="number"
              min={1}
              max={50}
              value={targetCount}
              onChange={(event) => setTargetCount(Number(event.target.value))}
            />
          </Field>
          <Field label="Seuil d'envoi">
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
          <div className="matching-mission-strip">
            <div><span>Établissement</span><strong>{selectedMission.establishment?.name || 'Établissement'}</strong></div>
            <div><span>Type</span><strong>{missionTypeLabel(selectedMission.missionType)}</strong></div>
            <div><span>Spécialité</span><strong>{selectedMission.specialty}</strong></div>
            <div><span>Ville</span><strong>{selectedMission.city}</strong></div>
          </div>
        ) : null}

        <div className="actions">
          <Button variant="secondary" disabled={!selectedMissionId || previewLoading} onClick={() => void loadPreview()}>
            {previewLoading ? 'Analyse...' : 'Prévisualiser'}
          </Button>
          <Button variant="success" disabled={!preview || pendingCandidates.length === 0 || dispatching} onClick={() => void dispatchMatches()}>
            {dispatching ? 'Envoi...' : 'Envoyer la vague'}
          </Button>
        </div>
      </section>

      {previewLoading ? <LoadingCard label="Analyse des candidats..." /> : null}

      {preview ? (
        <>
          <div className="matching-stats">
            <section className="card matching-stat">
              <span>Candidats pertinents</span>
              <strong>{preview.total}</strong>
              <small>{pendingCandidates.length} jamais notifié(s)</small>
            </section>
            <section className="card matching-stat">
              <span>Meilleur score</span>
              <strong>{topCandidate ? `${topCandidate.score}/100` : '-'}</strong>
              <small>{topCandidate?.displayName || 'Aucun candidat'}</small>
            </section>
            <section className="card matching-stat">
              <span>Score moyen</span>
              <strong>{averageScore ? `${averageScore}/100` : '-'}</strong>
              <small>{notifiedCandidates.length} déjà notifié(s)</small>
            </section>
            <section className="card matching-stat">
              <span>Exclus</span>
              <strong>{preview.excludedTotal}</strong>
              <small>Incompatibilités claires</small>
            </section>
          </div>

          <section className="matching-thresholds" aria-label="Paliers de matching">
            {preview.thresholds.map((tier) => (
              <div key={tier.label}>
                <span>{tierLabels[tier.label] || tier.label}</span>
                <strong>{tier.minimumScore}+</strong>
              </div>
            ))}
          </section>

          <section className="card matching-workspace">
            <div className="matching-workspace-head">
              <div>
                <span className="section-kicker">Décisions candidat</span>
                <h2>Lecture détaillée du matching</h2>
              </div>
              <div className="matching-filter-tabs" role="tablist" aria-label="Filtrer les candidats">
                <button className={viewMode === 'eligible' ? 'active' : ''} type="button" onClick={() => setViewMode('eligible')}>Retenus</button>
                <button className={viewMode === 'excluded' ? 'active' : ''} type="button" onClick={() => setViewMode('excluded')}>Exclus</button>
                <button className={viewMode === 'all' ? 'active' : ''} type="button" onClick={() => setViewMode('all')}>Tous</button>
              </div>
            </div>

            <div className="matching-filter-row">
              <Field label="Recherche candidat ou raison">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nom, email, ville, raison..." />
              </Field>
              <Field label="Score minimum affiché">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={displayMinimumScore}
                  onChange={(event) => setDisplayMinimumScore(Number(event.target.value))}
                />
              </Field>
            </div>

            <div className="matching-decision-layout">
              <div className="matching-candidate-list" aria-label="Candidats matchés">
                {visibleCandidates.map((candidate) => (
                  <button
                    key={candidate.candidateUserId}
                    type="button"
                    className={`matching-candidate-row ${selectedCandidate?.candidateUserId === candidate.candidateUserId ? 'active' : ''}`}
                    onClick={() => setSelectedCandidateId(candidate.candidateUserId)}
                  >
                    <span className="candidate-rank-score">
                      <strong>{candidate.eligible ? candidate.score : 0}</strong>
                      <small>/100</small>
                    </span>
                    <span className="candidate-row-main">
                      <strong>{candidate.displayName}</strong>
                      <small>{candidateSpecialty(candidate)} · {candidate.profile.city || 'Ville non renseignée'}</small>
                    </span>
                    <span className="candidate-row-meta">
                      <Badge tone={decisionTone(candidate) as any}>{decisionLabel(candidate)}</Badge>
                      <small>{medicalStatusLabel(candidate.profile.medicalStatus)}</small>
                    </span>
                  </button>
                ))}
                {visibleCandidates.length === 0 ? (
                  <div className="matching-empty">Aucun candidat ne correspond aux filtres actifs.</div>
                ) : null}
              </div>

              <aside className="matching-detail-panel">
                {selectedCandidate ? (
                  <>
                    <div className="matching-detail-head">
                      <div>
                        <span className="section-kicker">Détail de décision</span>
                        <h3>{selectedCandidate.displayName}</h3>
                        <p>{selectedCandidate.email}</p>
                      </div>
                      <Badge tone={decisionTone(selectedCandidate) as any}>{decisionLabel(selectedCandidate)}</Badge>
                    </div>

                    <div className="matching-profile-grid">
                      <div><span>Score</span><strong>{selectedCandidate.eligible ? `${selectedCandidate.score}/100` : '0/100'}</strong></div>
                      <div><span>Confiance</span><strong>{selectedCandidate.confidence ?? 0}%</strong></div>
                      <div><span>Palier</span><strong>{tierLabels[selectedCandidate.tier] || selectedCandidate.tier}</strong></div>
                      <div><span>Niveau</span><strong>{medicalStatusLabel(selectedCandidate.profile.medicalStatus)}</strong></div>
                      <div><span>Profil complété</span><strong>{selectedCandidate.profile.completionScore}%</strong></div>
                      <div><span>Spécialité</span><strong>{candidateSpecialty(selectedCandidate)}</strong></div>
                      <div><span>Ville</span><strong>{selectedCandidate.profile.city || '-'}</strong></div>
                    </div>

                    {selectedCandidate.eligible ? (
                      <>
                        <div className="matching-detail-section">
                          <h4>Pourquoi ce score</h4>
                          <div className="matching-reason-list">
                            {selectedCandidate.reasons.length ? selectedCandidate.reasons.map((reason) => (
                              <span key={reason}>{reason}</span>
                            )) : <em>Aucune raison forte renseignée.</em>}
                          </div>
                        </div>

                        <div className="matching-detail-section">
                          <h4>Points de vigilance</h4>
                          <div className="matching-exclusion-list">
                            {selectedCandidate.risks?.length ? selectedCandidate.risks.map((risk) => <span key={risk}>{risk}</span>) : <em>Aucun risque fort detecte.</em>}
                          </div>
                        </div>

                        <div className="matching-detail-section">
                          <h4>Donnees manquantes</h4>
                          <div className="matching-exclusion-list">
                            {selectedCandidate.missingData?.length ? selectedCandidate.missingData.map((item) => <span key={item}>{item}</span>) : <em>Profil suffisamment renseigne.</em>}
                          </div>
                        </div>

                        <div className="matching-detail-section">
                          <h4>Score detaille</h4>
                          <div className="matching-breakdown-list">
                            {sortedBreakdown(selectedCandidate).map(([key, value]) => (
                              <div key={key} className="matching-breakdown-item">
                                <div>
                                  <span>{breakdownLabels[key] || key}</span>
                                  <strong>+{value}</strong>
                                </div>
                                <div className="matching-score-bar"><span style={{ width: `${Math.min(100, (value / 24) * 100)}%` }} /></div>
                              </div>
                            ))}
                            {sortedBreakdown(selectedCandidate).length === 0 ? <em>Aucun point attribué.</em> : null}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="matching-detail-section">
                        <h4>Raisons d'exclusion</h4>
                        <div className="matching-exclusion-list">
                          {selectedCandidate.exclusionReasons.map((reason) => <span key={reason}>{reason}</span>)}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="matching-empty">Sélectionnez un candidat pour consulter la décision.</div>
                )}
              </aside>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
