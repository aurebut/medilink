'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Badge, Card, LinkButton } from '@/components/ui';

/* ── Data ── */

const painPoints = [
  'Informations de mission dispersées entre appels, mails et fichiers.',
  'Documents candidats difficiles à vérifier et à partager proprement.',
  'Accord final et paiement souvent gérés hors du suivi de recrutement.',
];

const productPillars = [
  { icon: '📋', title: 'Missions', detail: 'Publier un besoin court, clair et daté.' },
  { icon: '👤', title: 'Candidatures', detail: 'Suivre les profils et les statuts reçus.' },
  { icon: '📄', title: 'Documents', detail: 'Centraliser CV, diplômes et attestations.' },
  { icon: '💬', title: 'Messagerie', detail: 'Garder le contexte de chaque échange.' },
  { icon: '🤝', title: 'Proposition', detail: 'Formaliser le montant et les conditions.' },
  { icon: '🔒', title: 'Paiement', detail: 'Sécuriser la confirmation de mission.' },
];

const candidateFlow = [
  'Complète son profil et ses documents.',
  'Trouve une mission selon son lieu, niveau et disponibilité.',
  'Postule puis échange dans une conversation dédiée.',
  'Accepte une proposition claire avant la mission.',
];

const establishmentFlow = [
  'Publie une mission courte avec les conditions attendues.',
  'Consulte les candidatures et les documents utiles.',
  'Échange avec les profils retenus dans le bon contexte.',
  'Confirme l\u2019accord, le paiement et la fin de mission.',
];

const workflowSteps = [
  'Mission publiée',
  'Candidature reçue',
  'Échange centralisé',
  'Proposition finale',
  'Paiement sécurisé',
  'Justificatifs',
];

const candidates = [
  { name: 'Dr Alice Martin', detail: 'Urgences · 5 documents validés', status: 'Retenue' },
  { name: 'Karim Benali', detail: 'Interne · Disponible nuit', status: 'À revoir' },
  { name: 'Lina Moreau', detail: 'Médecine générale · Profil complet', status: 'Nouveau' },
];

const stats = [
  { value: 500, suffix: '+', label: 'Missions publiées' },
  { value: 1200, suffix: '+', label: 'Professionnels inscrits' },
  { value: 98, suffix: '%', label: 'Taux de satisfaction' },
];

/* ── Animated Counter ── */

function AnimatedCounter({
  target,
  suffix,
  visible,
}: {
  target: number;
  suffix: string;
  visible: boolean;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let current = 0;
    const increment = target / 125;
    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [visible, target]);

  return (
    <strong>
      {count.toLocaleString('fr-FR')}
      {suffix}
    </strong>
  );
}

/* ── Page ── */

export default function HomePage() {
  const statsRef = useRef<HTMLDivElement>(null);
  const [statsVisible, setStatsVisible] = useState(false);

  useEffect(() => {
    /* Scroll reveal */
    const revealObserver = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('revealed');
        }),
      { threshold: 0.08, rootMargin: '0px 0px -40px 0px' },
    );
    document.querySelectorAll('.reveal').forEach((el) => revealObserver.observe(el));

    /* Stats trigger */
    const statsObserver = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStatsVisible(true);
          statsObserver.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    if (statsRef.current) statsObserver.observe(statsRef.current);

    return () => {
      revealObserver.disconnect();
      statsObserver.disconnect();
    };
  }, []);

  return (
    <main className="landing-page">
      <div className="container">
        {/* ═══ NAV ═══ */}
        <nav className="public-nav">
          <Link href="/" className="brand">
            <span className="brand-mark">M</span>
            <span>Médilink</span>
          </Link>
          <div className="nav-actions">
            <LinkButton variant="light" href="/login">
              Connexion
            </LinkButton>
            <LinkButton href="/register">Créer un compte</LinkButton>
          </div>
        </nav>

        {/* ═══ HERO ═══ */}
        <section className="hero landing-hero">
          <div className="hero-copy landing-hero-copy">
            <div className="kicker">Remplacement médical</div>
            <h1>Remplacements médicaux, sans les échanges dispersés.</h1>
            <p>
              Médilink centralise les missions courtes, les candidatures, les documents, la
              messagerie et le paiement sécurisé entre établissements et professionnels de santé.
            </p>
            <div className="actions">
              <LinkButton href="/register">Publier ou trouver une mission</LinkButton>
              <LinkButton variant="light" href="/login">
                Se connecter
              </LinkButton>
            </div>
            <div className="landing-proof">
              <span>Pour les gardes, remplacements, vacations et renforts ponctuels.</span>
            </div>
          </div>

          <aside className="operations-panel" aria-label="Aperçu opérationnel Médilink">
            <div className="operations-panel-head">
              <div>
                <span>Mission en cours</span>
                <h2>Garde médicale - Urgences</h2>
              </div>
              <Badge tone="success">Ouverte</Badge>
            </div>

            <div className="mission-summary">
              <div>
                <span>Établissement</span>
                <strong>Clinique Rhône Santé</strong>
              </div>
              <div>
                <span>Ville</span>
                <strong>Lyon</strong>
              </div>
              <div>
                <span>Créneau</span>
                <strong>24 mai · 19:00-07:00</strong>
              </div>
              <div>
                <span>Rémunération</span>
                <strong>640 €</strong>
              </div>
            </div>

            <div className="candidate-stack">
              <div className="candidate-stack-head">
                <strong>Candidatures</strong>
                <span>8 reçues</span>
              </div>
              {candidates.map((candidate) => (
                <div className="candidate-row" key={candidate.name}>
                  <div>
                    <strong>{candidate.name}</strong>
                    <span>{candidate.detail}</span>
                  </div>
                  <Badge tone={candidate.status === 'Retenue' ? 'success' : 'neutral'}>
                    {candidate.status}
                  </Badge>
                </div>
              ))}
            </div>

            <div className="agreement-card">
              <div>
                <span>Accord final</span>
                <strong>Proposition envoyée</strong>
              </div>
              <p>
                Le montant, les horaires et les conditions restent rattachés à la conversation.
              </p>
            </div>
          </aside>
        </section>

        {/* ═══ PROBLEM ═══ */}
        <section className="landing-split reveal">
          <div className="section-heading">
            <div className="kicker">Le problème</div>
            <h2>Une mission courte implique souvent trop de canaux.</h2>
          </div>
          <div className="problem-list">
            {painPoints.map((point) => (
              <div key={point}>
                <span />
                <p>{point}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ═══ FEATURES ═══ */}
        <section className="landing-section reveal">
          <div className="section-heading">
            <div className="kicker">La réponse Médilink</div>
            <h2>Un espace unique pour suivre ce qui compte.</h2>
            <p>
              La plateforme rapproche le recrutement, les pièces administratives et la formalisation
              de la mission, sans disperser les informations importantes.
            </p>
          </div>

          <div className="pillar-grid">
            {productPillars.map((pillar) => (
              <Card key={pillar.title} className="pillar-card">
                <div className="pillar-icon">{pillar.icon}</div>
                <strong>{pillar.title}</strong>
                <p>{pillar.detail}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ═══ TWO PATHS ═══ */}
        <section className="landing-section reveal">
          <div className="section-heading">
            <div className="kicker">Deux parcours</div>
            <h2>Le même fil de mission, vu par chaque côté.</h2>
          </div>

          <div className="audience-grid">
            <Card className="audience-card">
              <div className="audience-card-head">
                <div>
                  <span className="small">Professionnels de santé</span>
                  <h3>Trouver une mission fiable</h3>
                </div>
                <Badge tone="neutral">Candidat</Badge>
              </div>
              <div className="flow-list">
                {candidateFlow.map((item, index) => (
                  <div key={item} className="flow-item">
                    <span>{index + 1}</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
              <LinkButton variant="light" href="/register">
                Je cherche une mission
              </LinkButton>
            </Card>

            <Card className="audience-card">
              <div className="audience-card-head">
                <div>
                  <span className="small">Établissements</span>
                  <h3>Couvrir un besoin ponctuel</h3>
                </div>
                <Badge>Recruteur</Badge>
              </div>
              <div className="flow-list">
                {establishmentFlow.map((item, index) => (
                  <div key={item} className="flow-item">
                    <span>{index + 1}</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
              <LinkButton variant="light" href="/register">
                Je publie une mission
              </LinkButton>
            </Card>
          </div>
        </section>

        {/* ═══ WORKFLOW ═══ */}
        <section className="workflow-band reveal">
          <div className="section-heading">
            <div className="kicker">Cycle complet</div>
            <h2>De l&apos;annonce au justificatif, le suivi reste lisible.</h2>
            <p>
              Chaque étape garde sa place dans un parcours simple, traçable et partagé entre les
              parties.
            </p>
          </div>
          <div className="workflow-rail">
            {workflowSteps.map((step, index) => (
              <span key={step}>
                <small>{String(index + 1).padStart(2, '0')}</small>
                {step}
              </span>
            ))}
          </div>
        </section>

        {/* ═══ STATS ═══ */}
        <div className="landing-stats reveal" ref={statsRef}>
          {stats.map((s) => (
            <Card key={s.label} className="landing-stat-card">
              <AnimatedCounter target={s.value} suffix={s.suffix} visible={statsVisible} />
              <span>{s.label}</span>
            </Card>
          ))}
        </div>

        {/* ═══ CTA ═══ */}
        <section className="landing-cta reveal">
          <div>
            <div className="kicker">Médilink</div>
            <h2>Une plateforme sobre pour organiser les missions médicales courtes.</h2>
          </div>
          <div className="actions">
            <LinkButton href="/register">Créer un compte</LinkButton>
            <LinkButton variant="light" href="/login">
              Connexion
            </LinkButton>
          </div>
        </section>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer className="landing-footer">
        <div className="container">
          <div className="landing-footer-grid">
            <div className="landing-footer-brand">
              <Link href="/" className="brand">
                <span className="brand-mark">M</span>
                <span>Médilink</span>
              </Link>
              <p>
                La plateforme de référence pour organiser des remplacements et missions médicales
                courtes, de la recherche du profil jusqu&apos;au paiement final.
              </p>
            </div>
            <div className="landing-footer-col">
              <h4>Plateforme</h4>
              <Link href="/register">Missions</Link>
              <Link href="/register">Candidatures</Link>
              <Link href="/register">Documents</Link>
              <Link href="/register">Messagerie</Link>
            </div>
            <div className="landing-footer-col">
              <h4>Ressources</h4>
              <Link href="#">À propos</Link>
              <Link href="#">Contact</Link>
              <Link href="#">FAQ</Link>
            </div>
            <div className="landing-footer-col">
              <h4>Légal</h4>
              <Link href="#">CGU</Link>
              <Link href="#">Confidentialité</Link>
              <Link href="#">Mentions légales</Link>
            </div>
          </div>
          <div className="landing-footer-bottom">
            <p>© 2025 Médilink. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
