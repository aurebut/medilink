/* eslint-disable @next/next/no-html-link-for-pages -- Full document navigation preserves isolated marketing and workspace root layouts. */
/* eslint-disable @next/next/no-head-element -- Shared App Router root document; next/head is for the Pages Router. */
import type { ReactNode } from 'react';
import Script from 'next/script';

export type PublicVariant = 'home' | 'candidate' | 'establishment' | 'guides';

const homeStyles = ['main', 'mobile', 'hero', 'theme', 'previews', 'process', 'workspace', 'continuity'];
const links = [
  { href: '/remplacement-medical', label: 'Médecin remplaçant' },
  { href: '/trouver-medecin-remplacant', label: 'Cabinet médical' },
  { href: '/guides', label: 'Guides pratiques' },
];

function PublicNavigation({ variant }: { variant: PublicVariant }) {
  const cabinet = variant === 'establishment';
  const action = { href: cabinet ? '/register?type=establishment' : '/register?type=candidate', label: cabinet ? 'Créer mon espace' : 'Créer mon profil' };
  return <nav aria-label="Navigation principale">
    <a className="nav-logo" href="/" aria-label="MédiLink — Accueil">Médi<em>Link</em></a>
    <div className="nav-links">{links.map(link => <a className="nav-link" href={link.href} key={link.href}>{link.label}</a>)}</div>
    <div className="nav-right"><a className="btn btn-ghost" href="/login">Se connecter</a><a className="btn btn-primary" href={action.href}>{action.label}</a></div>
    <button type="button" className="nav-mobile-toggle" aria-expanded="false" aria-controls="mobileNavigation"><span className="sr-only">Ouvrir le menu</span><span aria-hidden="true" className="menu-bars"><i /><i /><i /></span></button>
    <div className="nav-mobile-panel" id="mobileNavigation">{links.map(link => <a href={link.href} key={link.href}>{link.label} <span aria-hidden="true">↗</span></a>)}<div className="nav-mobile-actions"><a className="btn btn-ghost" href="/login">Se connecter</a><a className="btn btn-primary" href={action.href}>{action.label}</a></div></div>
  </nav>;
}

function PublicFooter() {
  return <footer><div className="footer-inner"><div className="footer-top">
    <div className="footer-brand"><strong>Médi<em>Link</em></strong><p>Médecins remplaçants et cabinets : préparez vos remplacements en médecine générale, partout en France.</p></div>
    <div className="footer-col"><h2>Médecin remplaçant</h2><a href="/remplacement-medical">Préparer mes remplacements</a><a href="/register?type=candidate">Créer mon profil</a><a href="/search">Consulter les missions</a></div>
    <div className="footer-col"><h2>Cabinet médical</h2><a href="/trouver-medecin-remplacant">Trouver un médecin remplaçant</a><a href="/register?type=establishment">Créer mon espace</a><a href="/demo">Demander une démo</a></div>
    <div className="footer-col"><h2>Ressources</h2><a href="/guides">Tous les guides</a><a href="/guides/premier-remplacement-medical-checklist">Premier remplacement</a><a href="/guides/annonce-remplacement-medical-cabinet">Rédiger une annonce</a></div>
  </div><div className="footer-bottom"><span>© 2026 MédiLink</span><span>Remplacements médicaux · France</span></div></div></footer>;
}

export function PublicDocument({ variant, children }: { variant: PublicVariant; children: ReactNode }) {
  const persona = variant === 'candidate' || variant === 'establishment';
  const styles = persona ? ['persona', 'mobile'] : variant === 'home' ? homeStyles : ['main', 'mobile'];
  const bodyClass = persona ? `persona-page ${variant}` : variant === 'home' ? 'landing-home' : 'guides-page';
  return <html lang="fr"><head>
    {['special', ...styles, 'icons', 'seo'].map(name => <link key={name} rel="stylesheet" href={`/landing-${name}.css`} />)}
  </head><body className={bodyClass}>
    <a className="skip-link" href="#main-content">Aller au contenu</a>
    <PublicNavigation variant={variant} />
    {children}
    <PublicFooter />
    <Script src="/landing-main.js" strategy="afterInteractive" />
    {variant === 'establishment' && <Script src="/landing-special.js" strategy="afterInteractive" />}
    {variant === 'home' && <Script src="/landing-process.js" strategy="afterInteractive" />}
  </body></html>;
}
