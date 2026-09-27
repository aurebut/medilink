import { ArrowUpRight, Check } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import '../../(public-home)/blue-editorial.css';
import './pricing.css';

export const metadata = pageMetadata(
  'Tarifs : gratuit pour les remplaçants, 39,99 € à la réussite',
  'MédiLink est gratuit pour les médecins remplaçants. Cabinets et médecins installés : 39,99 € par mission, uniquement en cas de réussite du matching.',
  '/tarifs',
);

export default function PricingPage() {
  return <main id="main-content" className="pricing-main">
    <header className="pricing-intro">
      <p className="pricing-eyebrow">Les tarifs MédiLink</p>
      <h1>Le bon match.<br /><em>Le juste prix.</em></h1>
      <p>Deux façons de se retrouver.<br className="pricing-mobile-break" /> Une tarification simple.</p>
    </header>

    <section className="pricing-offers" aria-label="Les offres MédiLink">
      <article className="pricing-offer" aria-labelledby="pricing-candidate-title">
        <div className="pricing-offer-heading">
          <span className="pricing-role">Pour les médecins remplaçants</span>
          <span className="pricing-badge">Gratuit</span>
        </div>
        <h2 id="pricing-candidate-title">Trouvez votre prochaine mission.</h2>
        <p className="pricing-amount"><span>0</span><span className="pricing-currency">€</span></p>
        <p className="pricing-condition">Aucun frais pour les remplaçants.</p>
        <ul className="pricing-features">
          <li><Check aria-hidden="true" />Recherchez les missions qui vous correspondent</li>
          <li><Check aria-hidden="true" />Échangez directement avec les cabinets</li>
          <li><Check aria-hidden="true" />Retrouvez vos échanges et documents</li>
        </ul>
        <a className="btn pricing-button pricing-button--outline" href="/register?type=candidate">Créer mon profil gratuit<ArrowUpRight aria-hidden="true" /></a>
      </article>

      <article className="pricing-offer pricing-offer--success" aria-labelledby="pricing-establishment-title">
        <div className="pricing-offer-heading">
          <span className="pricing-role">Pour les cabinets et médecins installés</span>
          <span className="pricing-badge">À la réussite</span>
        </div>
        <h2 id="pricing-establishment-title">Trouvez le bon remplaçant.</h2>
        <p className="pricing-amount"><span>39,99</span><span className="pricing-currency">€</span></p>
        <p className="pricing-condition">Par mission, uniquement si le match aboutit.</p>
        <ul className="pricing-features">
          <li><Check aria-hidden="true" />Publiez votre besoin de remplacement</li>
          <li><Check aria-hidden="true" />Échangez avec les médecins remplaçants</li>
          <li><Check aria-hidden="true" />Préparez et suivez la mission au même endroit</li>
        </ul>
        <a className="btn btn-primary pricing-button" href="/register?type=establishment">Trouver un remplaçant<ArrowUpRight aria-hidden="true" /></a>
      </article>
    </section>

    <p className="pricing-note">Un match réussi, c’est un remplaçant trouvé pour votre mission.<br />Les frais MédiLink sont distincts de la rétrocession versée au médecin.</p>
    <p className="pricing-help">Envie de découvrir la plateforme ? <a href="/demo">Demander une démo <ArrowUpRight aria-hidden="true" /></a></p>
  </main>;
}
