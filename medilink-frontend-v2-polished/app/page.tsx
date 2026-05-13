import Link from 'next/link';
import { LinkButton } from '@/components/ui';

export default function HomePage() {
  return (
    <main>
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

        <section className="hero">
          <div>
            <div className="kicker">Plateforme médicale</div>
            <h1>Des missions médicales, des profils vérifiés, des échanges centralisés.</h1>
            <p>
              Médilink connecte les professionnels médicaux et les établissements autour des missions,
              des candidatures, des documents et de la messagerie liée au recrutement.
            </p>
            <div className="actions">
              <LinkButton href="/register">Démarrer le MVP</LinkButton>
              <LinkButton variant="light" href="/login">J’ai déjà un compte</LinkButton>
            </div>
          </div>

          <div className="hero-card">
            <div className="hero-grid">
              <div className="hero-item">
                <strong>Profil candidat</strong>
                <span className="small">Identité, spécialité, disponibilités, documents et complétion.</span>
              </div>
              <div className="hero-item">
                <strong>Recherche de missions</strong>
                <span className="small">Filtres par type, niveau, spécialité, ville et date.</span>
              </div>
              <div className="hero-item">
                <strong>Candidature + messagerie</strong>
                <span className="small">Une candidature crée une conversation liée à la mission.</span>
              </div>
              <div className="hero-item">
                <strong>Back-office admin</strong>
                <span className="small">Validation des documents, suivi utilisateurs, missions et établissements.</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
