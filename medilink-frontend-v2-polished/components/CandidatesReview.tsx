'use client';

import { useId, useState } from 'react';
import { ArrowRight, CalendarDays, Check, ChevronDown, CircleHelp, MapPin, Minus, SlidersHorizontal } from 'lucide-react';
import { getApplicationCompatibility } from '@/lib/application-compatibility';
import { formatDate } from '@/lib/format';
import { medicalStatusLabel, statusLabel } from '@/lib/labels';
import type { Application, ApplicationStatus } from '@/lib/types';
import { ProfileAvatar } from './ProfileAvatar';
import { Button, LinkButton } from './ui';
import styles from './CandidatesReview.module.css';

function fullName(application: Application) {
  const profile = application.candidate?.profile;
  return [profile?.firstName, profile?.lastName].filter(Boolean).join(' ') || 'Profil du candidat';
}

export function CandidatesReview({ applications, updatingId, updateApplication }: {
  applications: Application[];
  updatingId: string | null;
  updateApplication: (id: string, status: ApplicationStatus) => Promise<void>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [missionId, setMissionId] = useState('');
  const filterId = useId();
  const missions = [...new Map(applications.filter(item => item.mission).map(item => [item.missionId, item.mission!])).values()];
  const activeMissionId = missions.some(mission => mission.id === missionId) ? missionId : '';
  const filtered = activeMissionId ? applications.filter(item => item.missionId === activeMissionId) : applications;
  const selected = filtered.find(item => item.id === selectedId) || filtered[0];

  return (
    <section className={`${styles.review} establishment-application-section-current`} aria-labelledby={`${filterId}-title`}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>Les candidatures reçues</span><h2 id={`${filterId}-title`}>Le bon profil.<em> Pour votre cabinet.</em></h2><p>Comparez les préférences, puis faites connaissance.</p></div>
        <label className={styles.filter} htmlFor={filterId}><span><SlidersHorizontal size={14} aria-hidden="true" /> Le remplacement</span><select id={filterId} value={activeMissionId} onChange={event => setMissionId(event.target.value)}><option value="">Toutes les missions</option>{missions.map(mission => <option key={mission.id} value={mission.id}>{mission.title}</option>)}</select></label>
      </header>
      {selected ? <div className={styles.workspace}>
        <div className={styles.shortlist}>
          <div className={styles.listHeading}><h3>À rencontrer</h3><span>{filtered.length}</span></div>
          <div className={styles.candidates} role="group" aria-label="Choisir une candidature">
            {filtered.map(application => {
              const profile = application.candidate?.profile;
              const compatibility = getApplicationCompatibility(application.mission, profile);
              return <button type="button" key={application.id} className={`${styles.candidate} ${selected.id === application.id ? styles.selected : ''}`} aria-pressed={selected.id === application.id} onClick={() => setSelectedId(application.id)}>
                <span className={styles.candidateIdentity}><ProfileAvatar src={profile?.avatarUrl} name={fullName(application)} className={styles.smallAvatar} decorative /><span><strong>{fullName(application)}</strong><small>{profile?.specialty || 'Spécialité à préciser'}</small></span><ArrowRight size={16} aria-hidden="true" /></span>
                <span className={styles.candidateMeta}>{profile?.city || 'Ville à préciser'}{profile?.experienceYears != null ? ` · ${profile.experienceYears} ans d’expérience` : ''}</span>
                <span className={styles.candidateMatch}><span className={styles.dot} />{compatibility.matchedCount} {compatibility.matchedCount > 1 ? 'critères concordants' : 'critère concordant'}<span>{statusLabel(application.status)}</span></span>
              </button>;
            })}
          </div>
          <p className={styles.listNote}>Les préférences vous éclairent.<br />L’échange fait la différence.</p>
        </div>
        <CandidateDetail key={selected.id} application={selected} updating={updatingId !== null} updateApplication={updateApplication} />
      </div> : <div className={styles.empty}><h3>Aucune candidature pour le moment</h3><p>Les profils des médecins qui candidatent à vos missions apparaîtront ici.</p></div>}
    </section>
  );
}

function CandidateDetail({ application, updating, updateApplication }: {
  application: Application;
  updating: boolean;
  updateApplication: (id: string, status: ApplicationStatus) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const profile = application.candidate?.profile;
  const mission = application.mission;
  const compatibility = getApplicationCompatibility(mission, profile);
  const name = fullName(application);
  return <article className={styles.detail} aria-label={`Candidature de ${name}`}>
    <div className={styles.detailTop}><span className={styles.eyebrow}>Votre prochain échange</span><span className={styles.received}>Reçue le {formatDate(application.createdAt)}</span></div>
    <header className={styles.profile}>
      <ProfileAvatar src={profile?.avatarUrl} name={name} className={styles.avatar} decorative />
      <div><h3>{name}</h3><p>{profile?.specialty || medicalStatusLabel(profile?.medicalStatus, profile)}{profile?.experienceYears != null ? ` · ${profile.experienceYears} ans d’expérience` : ''}</p><span><MapPin size={13} aria-hidden="true" />{profile?.city || 'Ville à préciser'}<i />{medicalStatusLabel(profile?.medicalStatus, profile)}</span></div>
    </header>
    <div className={styles.mission}><CalendarDays size={17} aria-hidden="true" /><div><strong>{mission?.title || 'Remplacement à préciser'}</strong><span>{mission?.startDate ? formatDate(mission.startDate) : 'Dates à confirmer'}{mission?.endDate ? ` — ${formatDate(mission.endDate)}` : ''}{mission?.city ? ` · ${mission.city}` : ''}</span></div></div>
    {profile?.bio ? <p className={styles.bio}>{profile.bio}</p> : null}
    <section className={styles.compatibility} aria-label="Compatibilité avec la mission">
      <div className={styles.compatibilityTop}><div><span className={styles.eyebrow}>La compatibilité, expliquée</span><h4><strong>{compatibility.matchedCount}</strong> {compatibility.matchedCount === 1 ? 'critère concordant' : 'critères concordants'}</h4><p>{compatibility.coverageLabel}</p></div><span className={styles.matchMark} aria-hidden="true">{compatibility.matchedCount ? <Check size={25} /> : <CircleHelp size={25} />}</span></div>
      <div className={styles.highlights}>{compatibility.criteria.filter(item => item.status === 'match').slice(0, 3).map(item => <span key={item.id}><Check size={12} aria-hidden="true" />{item.label}</span>)}{compatibility.matchedCount === 0 ? <span>Échangez pour préciser les conditions</span> : null}</div>
      <button type="button" className={styles.why} onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-controls={detailsId}>{expanded ? 'Masquer les critères' : 'Voir pourquoi'}<ChevronDown size={16} aria-hidden="true" className={expanded ? styles.rotated : ''} /></button>
      <div className={styles.criteria} id={detailsId} hidden={!expanded}>
        {compatibility.criteria.map(criterion => <div key={criterion.id} className={styles.criterion} data-status={criterion.status}>
          <div className={styles.criterionTitle}><strong>{criterion.label}</strong><span>{criterion.status === 'match' ? <Check size={14} aria-hidden="true" /> : criterion.status === 'mismatch' ? <Minus size={14} aria-hidden="true" /> : <CircleHelp size={14} aria-hidden="true" />}{criterion.status === 'match' ? 'Concordant' : criterion.status === 'mismatch' ? 'Écart' : 'À confirmer'}</span></div>
          <dl><div><dt>Mission</dt><dd>{criterion.missionValue}</dd></div><div><dt>Profil</dt><dd>{criterion.profileValue}</dd></div></dl><p>{criterion.detail}</p>
        </div>)}
        <p className={styles.method}>Comparaison des informations renseignées, sans validation des disponibilités ni décision automatique.</p>
      </div>
    </section>
    {application.coverMessage ? <blockquote className={styles.message}><span>Son message</span><p>{application.coverMessage}</p></blockquote> : null}
    <footer className={styles.actions}><LinkButton href={`/establishment/candidates/${application.id}`}>Découvrir le profil <ArrowRight size={14} aria-hidden="true" /></LinkButton><div><Button variant="light" disabled={updating} onClick={() => void updateApplication(application.id, 'ACCEPTED')}>{updating ? 'Mise à jour…' : 'Accepter'}</Button><Button variant="secondary" disabled={updating} onClick={() => void updateApplication(application.id, 'REJECTED')}>Refuser</Button></div></footer>
  </article>;
}
