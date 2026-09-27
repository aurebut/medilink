import { ArrowUpRight, Check } from 'lucide-react';
import { pageMetadata } from '@/lib/seo';
import '../../(public-home)/blue-editorial.css';
import './pricing.css';

export const metadata = pageMetadata(
  'Tarifs : gratuit, à la réussite ou matchs illimités',
  'Gratuit pour les remplaçants. Médecins remplacés et cabinets : 39,99 € par match réussi ou 99 €/mois pour des matchs illimités. Découvrez les fonctionnalités incluses.',
  '/tarifs',
);

const candidateFeatures = [
  ['Des missions selon vos critères', 'Affinez par ville, dates, logiciel ou rétrocession.'],
  ['Candidatures et messagerie', 'Postulez et échangez avec le cabinet sur les conditions de la mission.'],
  ['Un dossier documentaire partagé', 'Retrouvez le contrat à relire, vos justificatifs et les pièces de la mission.'],
  ['Votre agenda et vos missions', 'Visualisez vos remplacements et suivez leurs étapes clés.'],
  ['Le suivi de la rétrocession', 'Consultez les montants déclarés et le suivi du règlement.'],
];

const establishmentFeatures = [
  ['Vos annonces de remplacement', 'Présentez le cabinet, les dates et les conditions d’exercice.'],
  ['Des candidatures à comparer', 'Consultez les profils et les critères de compatibilité expliqués.'],
  ['Une messagerie par mission', 'Convenez des conditions et préparez l’arrivée du remplaçant.'],
  ['Les documents au même endroit', 'Préparez contrat et courrier à l’Ordre, puis partagez les pièces utiles.'],
  ['Du calendrier à la rétrocession', 'Suivez la mission, calculez la rétrocession et consignez le règlement.'],
];

function Features({ items }: { items: string[][] }) {
  return <ul className="pricing-features">{items.map(([title, detail]) =>
    <li key={title}><Check aria-hidden="true" /><div><strong>{title}</strong><span>{detail}</span></div></li>
  )}</ul>;
}

export default function PricingPage() {
  return <main id="main-content" className="pricing-main">
    <header className="pricing-intro">
      <p className="pricing-eyebrow">Les tarifs MédiLink</p>
      <h1>Le bon match.<br /><em>Le juste prix.</em></h1>
      <p>Gratuit pour les remplaçants.<br />Deux formules pour les médecins remplacés.</p>
    </header>

    <section className="pricing-offers" aria-label="Les offres MédiLink">
      <article className="pricing-offer" aria-labelledby="pricing-candidate-title">
        <div className="pricing-offer-heading">
          <span className="pricing-role">Médecins remplaçants</span>
          <span className="pricing-badge">Gratuit</span>
        </div>
        <h2 id="pricing-candidate-title">Trouvez votre prochaine mission.</h2>
        <p className="pricing-amount"><span>0</span><span className="pricing-currency">€</span></p>
        <p className="pricing-condition">Aucun frais pour les remplaçants.</p>
        <Features items={candidateFeatures} />
        <a className="btn pricing-button pricing-button--outline" href="/register?type=candidate">Créer mon profil gratuit<ArrowUpRight aria-hidden="true" /></a>
      </article>

      <article className="pricing-offer pricing-offer--success" aria-labelledby="pricing-establishment-title">
        <div className="pricing-offer-heading">
          <span className="pricing-role">Médecins remplacés et cabinets</span>
          <span className="pricing-badge">À la réussite</span>
        </div>
        <h2 id="pricing-establishment-title">Trouvez le bon remplaçant.</h2>
        <p className="pricing-amount"><span>39,99</span><span className="pricing-currency">€</span></p>
        <p className="pricing-condition">Par mission, uniquement si le match aboutit.</p>
        <Features items={establishmentFeatures} />
        <a className="btn btn-primary pricing-button" href="/register?type=establishment">Trouver un remplaçant<ArrowUpRight aria-hidden="true" /></a>
      </article>

      <article className="pricing-offer pricing-offer--unlimited" aria-labelledby="pricing-unlimited-title">
        <div className="pricing-offer-heading">
          <span className="pricing-role">Médecins remplacés et cabinets</span>
          <span className="pricing-badge">Illimité</span>
        </div>
        <h2 id="pricing-unlimited-title">Des besoins toute l’année.</h2>
        <p className="pricing-amount"><span>99</span><span className="pricing-currency">€<span className="pricing-period">/mois</span></span></p>
        <p className="pricing-condition"><strong>Matchs illimités inclus dans l’abonnement.</strong></p>
        <Features items={establishmentFeatures} />
        <a className="btn btn-primary pricing-button" href="/demo">Découvrir l’abonnement<ArrowUpRight aria-hidden="true" /></a>
      </article>
    </section>

    <p className="pricing-note">À la réussite ou en illimité, les mêmes fonctionnalités pour les médecins remplacés.<br />Un match réussi, c’est un remplaçant trouvé pour votre mission. Les frais MédiLink sont distincts de la rétrocession.</p>
    <p className="pricing-help">Envie de découvrir la plateforme ? <a href="/demo">Demander une démo <ArrowUpRight aria-hidden="true" /></a></p>
  </main>;
}
