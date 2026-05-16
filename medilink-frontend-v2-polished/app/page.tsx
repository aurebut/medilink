import Link from 'next/link';
import { Badge, Card, LinkButton, ProgressBar } from '@/components/ui';

const platformStats = [
  { label: 'Cycle mission', value: 'complet', helper: 'Recherche, candidature, échange, accord et paiement.' },
  { label: 'Documents', value: 'validés', helper: 'CV, diplômes, attestations et pièces administratives.' },
  { label: 'Messagerie', value: 'contextuelle', helper: 'Chaque candidature ouvre un fil lié à la mission.' },
];

const candidateFlow = [
  'Profil professionnel et documents',
  'Recherche de missions filtrée',
  'Candidature en quelques minutes',
  'Proposition finale et paiement sécurisé',
];

const establishmentFlow = [
  'Fiche établissement vérifiée',
  'Publication de missions courtes',
  'Suivi des candidatures reçues',
  'Accord final, validation et justificatifs',
];

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
            <div className="kicker">Marketplace santé</div>
            <h1>Organiser une mission médicale ne devrait pas prendre dix outils.</h1>
            <p>
              Médilink rassemble les remplacements, candidatures, documents, conversations,
              propositions finales et paiements sécurisés dans une seule expérience.
            </p>
            <div className="actions">
              <LinkButton href="/register">Créer un compte</LinkButton>
              <LinkButton variant="light" href="/login">Accéder à mon espace</LinkButton>
            </div>
            <div className="hero-badges">
              <Badge tone="success">Profils vérifiés</Badge>
              <Badge>Chat transactionnel</Badge>
              <Badge tone="warning">Paiement sécurisé</Badge>
            </div>
          </div>

          <div className="product-preview" aria-label="Aperçu du produit Médilink">
            <div className="preview-topbar">
              <span />
              <span />
              <span />
              <strong>Médilink workspace</strong>
            </div>
            <div className="preview-body">
              <aside className="preview-sidebar">
                <div className="preview-user">
                  <span className="avatar">AM</span>
                  <div>
                    <strong>Dr Alice Martin</strong>
                    <span className="small">Urgences · Lyon</span>
                  </div>
                </div>
                <div className="preview-nav-item active">Dashboard</div>
                <div className="preview-nav-item">Missions</div>
                <div className="preview-nav-item">Documents</div>
                <div className="preview-nav-item">Messages</div>
              </aside>

              <div className="preview-main">
                <div className="preview-header">
                  <div>
                    <span className="small">Mission recommandée</span>
                    <h2>Garde médicale - Urgences</h2>
                  </div>
                  <Badge tone="success">Publié</Badge>
                </div>
                <div className="preview-mission-card">
                  <div>
                    <strong>Clinique Rhône Santé</strong>
                    <span className="small">Lyon · 24 mai · 19:00 - 07:00</span>
                  </div>
                  <div className="mission-pay preview-pay">
                    <span className="small">Rémunération</span>
                    <strong>640 €</strong>
                  </div>
                </div>
                <div className="preview-grid">
                  <div>
                    <span>Profil complété</span>
                    <strong>82%</strong>
                    <ProgressBar value={82} />
                  </div>
                  <div>
                    <span>Documents validés</span>
                    <strong>5/6</strong>
                    <ProgressBar value={84} />
                  </div>
                </div>
                <div className="preview-message">
                  <span>Recruteur</span>
                  <p>Votre profil correspond au besoin. Souhaitez-vous recevoir une proposition finale ?</p>
                </div>
              </div>
            </div>
          </div>
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
            <div className="kicker">Deux espaces connectés</div>
            <h2>Candidats et établissements avancent sur le même parcours.</h2>
            <p>
              Le produit ne s’arrête pas à la publication d’annonces : chaque étape importante
              reste traçable dans l’espace de travail.
            </p>
          </div>

          <div className="audience-grid">
            <Card className="audience-card candidate-card">
              <div className="audience-card-head">
                <div>
                  <span className="small">Pour les professionnels de santé</span>
                  <h3>Trouver une mission fiable</h3>
                </div>
                <Badge tone="success">Candidat</Badge>
              </div>
              <div className="flow-list">
                {candidateFlow.map((item, index) => (
                  <div key={item} className="flow-item">
                    <span>{index + 1}</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
              <LinkButton variant="secondary" href="/register">Je suis candidat</LinkButton>
            </Card>

            <Card className="audience-card establishment-card">
              <div className="audience-card-head">
                <div>
                  <span className="small">Pour les recruteurs santé</span>
                  <h3>Couvrir un besoin court terme</h3>
                </div>
                <Badge>Établissement</Badge>
              </div>
              <div className="flow-list">
                {establishmentFlow.map((item, index) => (
                  <div key={item} className="flow-item">
                    <span>{index + 1}</span>
                    <strong>{item}</strong>
                  </div>
                ))}
              </div>
              <LinkButton variant="secondary" href="/register">Je recrute</LinkButton>
            </Card>
          </div>
        </section>

        <section className="workflow-band">
          <div>
            <div className="kicker">Workflow transactionnel</div>
            <h2>De la candidature au règlement, le fil reste centralisé.</h2>
          </div>
          <div className="workflow-rail">
            {['Mission publiée', 'Candidature', 'Discussion', 'Proposition', 'Paiement', 'Fin de mission'].map((step) => (
              <span key={step}>{step}</span>
            ))}
          </div>
        </section>

        <section className="landing-cta">
          <div>
            <div className="kicker">MVP prêt à tester</div>
            <h2>Explore les parcours candidat, établissement et admin avec la même base produit.</h2>
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
