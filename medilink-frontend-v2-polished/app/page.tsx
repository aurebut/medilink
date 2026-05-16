import Link from 'next/link';
import { Badge, Card, LinkButton } from '@/components/ui';

const platformStats = [
  { label: 'Missions', value: 'courtes', helper: 'Gardes, remplacements, vacations et renforts ponctuels.' },
  { label: 'Candidatures', value: 'centralisées', helper: 'Profil, documents, échanges et statut réunis au même endroit.' },
  { label: 'Accord', value: 'sécurisé', helper: 'Proposition finale, validation de mission et paiement encadré.' },
];

const candidateFlow = [
  'Compléter son profil médical',
  'Ajouter ses documents',
  'Postuler à une mission',
  'Échanger et accepter une proposition',
];

const establishmentFlow = [
  'Créer une fiche établissement',
  'Publier un besoin court terme',
  'Comparer les candidatures',
  'Formaliser l’accord final',
];

const workflowSteps = ['Mission', 'Candidature', 'Conversation', 'Proposition', 'Paiement', 'Justificatifs'];

export default function HomePage() {
  return (
    <main className="landing-page">
      <div className="container">
        <nav className="public-nav">
          <Link href="/" className="brand">
            <span className="brand-mark">M</span>
            <span>Médilink</span>
          </Link>
          <div className="nav-actions">
            <LinkButton variant="light" href="/login">Connexion</LinkButton>
            <LinkButton href="/register">Créer un compte</LinkButton>
          </div>
        </nav>

        <section className="hero landing-hero">
          <div className="hero-copy">
            <div className="kicker">Plateforme santé</div>
            <h1>Missions médicales courtes, candidatures et paiements sécurisés.</h1>
            <p>
              Médilink aide les établissements et les professionnels de santé à gérer le cycle complet
              d’une mission courte, depuis la publication jusqu’aux justificatifs.
            </p>
            <div className="actions">
              <LinkButton href="/register">Créer un compte</LinkButton>
              <LinkButton variant="light" href="/login">Connexion</LinkButton>
            </div>
            <div className="hero-badges">
              <Badge>Remplacements</Badge>
              <Badge tone="neutral">Documents vérifiés</Badge>
              <Badge tone="success">Paiement encadré</Badge>
            </div>
          </div>

          <Card className="landing-panel">
            <div className="landing-panel-header">
              <div>
                <span className="small">Mission recommandée</span>
                <h2>Garde médicale - Urgences</h2>
              </div>
              <Badge tone="success">Publiée</Badge>
            </div>

            <div className="landing-panel-meta">
              <div>
                <span>Établissement</span>
                <strong>Clinique Rhône Santé</strong>
              </div>
              <div>
                <span>Lieu</span>
                <strong>Lyon</strong>
              </div>
              <div>
                <span>Créneau</span>
                <strong>24 mai · Nuit</strong>
              </div>
            </div>

            <div className="landing-panel-row">
              <div>
                <span className="small">Rémunération</span>
                <strong>640 €</strong>
              </div>
              <div>
                <span className="small">Candidatures</span>
                <strong>8 reçues</strong>
              </div>
            </div>

            <div className="landing-timeline" aria-label="Cycle de mission">
              {workflowSteps.map((step) => (
                <div key={step}>
                  <span />
                  <strong>{step}</strong>
                </div>
              ))}
            </div>

            <div className="landing-message">
              <span>Dernier échange</span>
              <p>Votre profil est complet. L’établissement peut vous envoyer une proposition finale.</p>
            </div>
          </Card>
        </section>

        <section className="landing-stats" aria-label="Points forts Médilink">
          {platformStats.map((stat) => (
            <Card key={stat.label} className="landing-stat-card">
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
              <p>{stat.helper}</p>
            </Card>
          ))}
        </section>

        <section className="landing-section">
          <div className="section-heading">
            <div className="kicker">Deux parcours</div>
            <h2>Un espace clair pour chaque côté de la mission.</h2>
            <p>
              Les candidats suivent leurs opportunités. Les établissements pilotent leurs besoins,
              leurs candidatures et leurs échanges.
            </p>
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
              <LinkButton variant="light" href="/register">Je suis candidat</LinkButton>
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
              <LinkButton variant="light" href="/register">Je recrute</LinkButton>
            </Card>
          </div>
        </section>

        <section className="workflow-band">
          <div className="section-heading">
            <div className="kicker">Cycle complet</div>
            <h2>Plus qu’une annonce, un suivi opérationnel.</h2>
            <p>
              Chaque mission conserve ses informations clés : candidature, conversation, proposition,
              paiement sécurisé et documents de fin de mission.
            </p>
          </div>
          <div className="workflow-rail">
            {workflowSteps.map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <div>
            <div className="kicker">Médilink</div>
            <h2>Une base plus simple pour tester les parcours candidat et établissement.</h2>
          </div>
          <div className="actions">
            <LinkButton href="/register">Démarrer</LinkButton>
            <LinkButton variant="light" href="/login">Connexion</LinkButton>
          </div>
        </section>
      </div>
    </main>
  );
}
