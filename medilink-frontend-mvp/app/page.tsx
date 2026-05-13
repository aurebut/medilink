import Link from 'next/link';
import { LinkButton } from '@/components/ui';

export default function HomePage() {
  return (
    <main className="container">
      <nav className="public-nav">
        <Link className="brand" href="/"><span className="brand-mark">M</span><span>Médilink</span></Link>
        <div className="nav-actions">
          <LinkButton variant="light" href="/login">Connexion</LinkButton>
          <LinkButton href="/register">Créer un compte</LinkButton>
        </div>
      </nav>
      <section className="hero">
        <div>
          <div className="kicker">Plateforme médicale</div>
          <h1>Missions, candidatures et messagerie au même endroit.</h1>
          <p>MVP fonctionnel pour gérer des profils médicaux, des documents, des établissements, des missions, des candidatures et des échanges contextualisés.</p>
          <div className="actions">
            <LinkButton href="/register">Démarrer</LinkButton>
            <LinkButton variant="secondary" href="/login">J’ai déjà un compte</LinkButton>
          </div>
        </div>
        <div className="hero-card hero-grid">
          <div className="hero-item"><strong>Profil candidat</strong><span className="muted">Identité, spécialité, disponibilité et documents sécurisés.</span></div>
          <div className="hero-item"><strong>Recherche missions</strong><span className="muted">Filtres par type, niveau, spécialité, ville et date.</span></div>
          <div className="hero-item"><strong>Établissements</strong><span className="muted">Création de missions et suivi des candidatures reçues.</span></div>
          <div className="hero-item"><strong>Admin minimal</strong><span className="muted">Validation des documents, comptes et modération de base.</span></div>
        </div>
      </section>
    </main>
  );
}
