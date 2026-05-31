import Link from 'next/link';
import type { FormEventHandler, ReactNode } from 'react';

function AuthBrand({ compact = false }: { compact?: boolean }) {
  return (
    <Link className={`auth-brand ${compact ? 'auth-brand-compact' : ''}`} href="/">
      <span className="auth-brand-name">Médi<em>Link</em></span>
    </Link>
  );
}

export function AuthPage({
  eyebrow,
  title,
  description,
  children,
  footer,
  onSubmit,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
  onSubmit: FormEventHandler<HTMLFormElement>;
}) {
  return (
    <main className="auth-page">
      <div className="auth-shell">
        <section className="auth-intro" aria-label="À propos de MédiLink">
          <AuthBrand />
          <div className="auth-intro-copy">
            <span className="auth-kicker">La relève médicale, simplement</span>
            <h2>Les remplacements qui font avancer <em>la médecine de proximité.</em></h2>
            <p>
              Une plateforme pensée pour connecter les médecins généralistes et les cabinets,
              avec une expérience claire du premier échange à la mission confirmée.
            </p>
          </div>
          <div className="auth-stats" aria-label="Chiffres clés">
            <div><strong>2 800+</strong><span>Missions publiées</span></div>
            <div><strong>1 200</strong><span>Médecins remplaçants</span></div>
            <div><strong>640</strong><span>Cabinets partenaires</span></div>
          </div>
        </section>

        <form className="auth-card form" onSubmit={onSubmit}>
          <AuthBrand compact />
          <div className="auth-card-heading">
            <span className="auth-kicker">{eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          {children}
          <div className="auth-card-footer">{footer}</div>
        </form>
      </div>
    </main>
  );
}
