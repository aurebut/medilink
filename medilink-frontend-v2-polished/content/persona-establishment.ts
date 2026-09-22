import { interfacePreview } from './landing-interface-preview';

const demo = '<a class="btn btn-primary btn-lg" href="/demo">Demander une démo <span aria-hidden="true">↗</span></a>';

export const establishmentLanding = `
  <section class="persona-hero" aria-labelledby="hero-title">
    <div class="persona-hero-inner">
      <div class="persona-eyebrow">Pour les médecins remplacés et les cabinets</div>
      <h1 id="hero-title">Préparez votre remplacement.<br><em>Gardez le fil, même à distance.</em></h1>
      <p class="persona-hero-copy">Trouvez votre remplaçant, partagez les documents et retrouvez les comptes rendus de la mission. Un même espace, du premier échange à la rétrocession.</p>
      <div class="hero-ctas">${demo}</div>
      <div class="persona-stage"><div class="persona-photo-frame"><img src="/landing-assets/hero-medecin.png" width="1217" height="562" alt="Médecin généraliste échangeant avec une patiente dans son cabinet" fetchpriority="high" decoding="async"></div></div>
    </div>
  </section>

  <section class="persona-section" id="vivier" aria-labelledby="vivier-title"><div class="persona-section-inner">
    <div class="persona-feature-row">
      <div class="persona-feature-copy reveal">
        <div class="section-kicker">01 · Le vivier de remplaçants</div>
        <h2 id="vivier-title">Des médecins à rencontrer.<br><em>Un relais à choisir.</em></h2>
        <p>Présentez vos dates et les conditions d’exercice de votre cabinet. Retrouvez les candidatures dans un même espace et prenez le temps de choisir le médecin avec qui travailler.</p>
        <ul class="persona-benefits">
          <li><h3>Des profils professionnels détaillés</h3><p>Spécialité, niveau d’exercice, expérience et documents autorisés : étudiez les informations utiles.</p></li>
          <li><h3>Vos critères comme point de départ</h3><p>Disponibilités, lieu, organisation et rétrocession donnent un cadre clair aux échanges.</p></li>
          <li><h3>La décision vous appartient</h3><p>Comparez les candidatures, discutez avec le médecin et confirmez ensemble les conditions.</p></li>
        </ul>
      </div>
      ${interfacePreview('candidates', 'persona-screen reveal', 'Exemple de candidatures avec des données fictives', 'Candidatures MédiLink : profils des médecins, statut des candidatures et accès à leur dossier. Données fictives.')}
    </div>
  </div></section>

  <section class="persona-section" id="activite" aria-labelledby="activite-title"><div class="persona-section-inner">
    <div class="persona-feature-row persona-feature-row--reverse">
      <div class="persona-feature-copy reveal">
        <div class="section-kicker">02 · Les comptes rendus</div>
        <h2 id="activite-title">Pendant votre absence,<br><em>gardez le contexte.</em></h2>
        <p>Retrouvez les comptes rendus que votre remplaçant transmet dans le dossier partagé. Les informations de la mission restent réunies pour préparer votre retour.</p>
        <ul class="persona-benefits">
          <li><h3>Les comptes rendus transmis</h3><p>Consultez les fichiers ajoutés au dossier du remplacement, au fil de la mission.</p></li>
          <li><h3>Les échanges au même endroit</h3><p>Reprenez la conversation avec le médecin pour préciser un point ou demander un complément.</p></li>
          <li><h3>Une reprise mieux préparée</h3><p>Retrouvez les éléments partagés sans reconstruire l’historique de vos échanges.</p></li>
        </ul>
      </div>
      ${interfacePreview('report', 'persona-screen reveal', 'Exemple de compte rendu transmis dans un dossier fictif', 'Dossier MédiLink : compte rendu du remplacement ajouté aux documents partagés. Données fictives.')}
    </div>
  </div></section>

  <section class="persona-section" id="documents" aria-labelledby="documents-title"><div class="persona-section-inner">
    <div class="persona-feature-row">
      <div class="persona-feature-copy reveal">
        <div class="section-kicker">03 · L’espace documents</div>
        <h2 id="documents-title">Le bon document.<br><em>Dans le bon dossier.</em></h2>
        <p>Préparez les documents du remplacement et retrouvez les pièces partagées avec votre remplaçant, dans un espace dédié à la mission.</p>
        <ul class="persona-benefits">
          <li><h3>Un contrat à préparer ensemble</h3><p>Identités, dates et rétrocession alimentent le contrat et le courrier à l’Ordre, prêts à relire.</p></li>
          <li><h3>Les pièces utiles réunies</h3><p>Contrat signé, justificatifs et documents complémentaires restent rattachés au remplacement.</p></li>
          <li><h3>Des envois que vous suivez</h3><p>Choisissez les documents et le destinataire, puis retrouvez l’historique des transmissions.</p></li>
        </ul>
      </div>
      ${interfacePreview('documents', 'persona-screen reveal', 'Exemple du dossier documentaire avec des données fictives', 'Dossier partagé MédiLink : contrat à signer, déclaration à l’Ordre et justificatifs. Données fictives.')}
    </div>
  </div></section>

  <section class="persona-section" id="paiement" aria-labelledby="paiement-title"><div class="persona-section-inner">
    <div class="persona-feature-row persona-feature-row--reverse">
      <div class="persona-feature-copy reveal">
        <div class="section-kicker">04 · Le paiement de la rétrocession</div>
        <h2 id="paiement-title">De l’activité déclarée<br><em>au montant à verser.</em></h2>
        <p>Retrouvez les conditions convenues et calculez la rétrocession à partir des honoraires réellement déclarés et du taux accepté.</p>
        <ul class="persona-benefits">
          <li><h3>Un calcul compréhensible</h3><p>Le nombre de consultations et leurs honoraires permettent d’estimer l’activité. Le taux convenu détermine la part du remplaçant.</p></li>
          <li><h3>Une clôture à valider</h3><p>Vérifiez le montant final et conservez le suivi du règlement dans le dossier.</p></li>
          <li><h3>Le prélèvement automatique <span class="persona-coming-soon">À venir</span></h3><p>Le débit bancaire automatique n’est pas encore disponible. Découvrez le parcours prévu lors de votre démo.</p></li>
        </ul>
      </div>
      <figure class="persona-payment-example reveal" aria-labelledby="payment-example-title">
        <figcaption id="payment-example-title">Un exemple de rétrocession</figcaption>
        <div class="persona-payment-source"><span>90 <small>consultations</small></span><span aria-hidden="true">×</span><span>30 € <small>par consultation</small></span></div>
        <dl><div><dt>Honoraires illustratifs</dt><dd>2 700 €</dd></div><div><dt>Taux du remplaçant</dt><dd>70 %</dd></div></dl>
        <div class="persona-payment-total"><span>Rétrocession estimée</span><strong>1 890 €</strong></div>
        <p>Exemple avec un tarif identique pour chaque consultation, hors frais MédiLink. Le montant final dépend des honoraires réellement déclarés.</p>
      </figure>
    </div>
  </div></section>

  <section class="persona-section" id="tarifs" aria-labelledby="tarifs-title"><div class="persona-section-inner">
    <header class="section-head reveal"><div class="section-kicker">05 · Les tarifs</div><h2 class="section-h" id="tarifs-title">Un remplacement ponctuel.<br><em>Ou des besoins toute l’année.</em></h2><p class="section-sub">Choisissez la formule adaptée à votre rythme de remplacement.</p></header>
    <div class="persona-pricing-grid">
      <article class="persona-price-card reveal" aria-labelledby="success-price-title">
        <span class="persona-price-kicker">Pour un besoin ponctuel</span><h3 id="success-price-title">Paiement à la réussite</h3>
        <p class="persona-price"><strong>39 €</strong><span>par remplacement trouvé</span></p>
        <p>Vous payez à la réussite du matching, lorsqu’un remplaçant est trouvé pour votre besoin.</p>
        <ul><li>Une tarification à l’unité</li><li>Un coût lié au remplacement trouvé</li><li>Le dossier de votre mission au même endroit</li></ul>
        ${demo}
      </article>
      <article class="persona-price-card persona-price-card--subscription reveal" aria-labelledby="subscription-price-title">
        <span class="persona-price-kicker">Pour des besoins réguliers</span><h3 id="subscription-price-title">Abonnement illimité</h3>
        <p class="persona-price"><strong>99 €</strong><span>par mois</span></p>
        <p>Une formule mensuelle pour organiser vos remplacements tout au long de l’année.</p>
        <ul><li>Des matchings illimités</li><li>Un budget mensuel pour vos recherches</li><li>Les dossiers de vos missions réunis</li></ul>
        ${demo}
      </article>
    </div>
    <p class="persona-pricing-note">La démo vous permet de préciser vos besoins et les conditions de la formule. Les tarifs MédiLink sont distincts de la rétrocession versée au médecin.</p>
  </div></section>

  <section class="faq" id="faq" aria-labelledby="faq-title"><div class="faq-inner">
    <header class="section-head reveal"><div class="section-kicker">06 · Questions fréquentes</div><h2 class="section-h" id="faq-title">Avant de confier<br><em>votre cabinet.</em></h2><p class="section-sub">Le choix du médecin, le suivi et les conditions du remplacement.</p></header>
    <div class="faq-list">
      <details class="faq-item reveal"><summary>Comment choisir mon remplaçant ?</summary><div class="faq-answer">Précisez votre besoin, puis étudiez les profils, les disponibilités et les candidatures. Échangez avec le médecin pour confirmer ensemble les conditions. MédiLink vous aide à comparer ; la décision vous appartient.</div></details>
      <details class="faq-item reveal"><summary>Comment suivre ce qui se passe pendant la mission ?</summary><div class="faq-answer">Retrouvez les échanges et les comptes rendus transmis dans le dossier partagé. Ce suivi repose sur les informations et fichiers partagés par les médecins ; il ne constitue pas une remontée automatique des consultations.</div></details>
      <details class="faq-item reveal"><summary>Quels documents peut-on préparer sur MédiLink ?</summary><div class="faq-answer">Le dossier permet de préparer un contrat de remplacement libéral individuel et un courrier à l’Ordre, d’ajouter les pièces utiles et de transmettre les documents choisis. Les documents générés doivent être relus. La signature et les démarches d’autorisation restent à effectuer ; un envoi ne vaut pas validation par l’Ordre.</div></details>
      <details class="faq-item reveal"><summary>La rétrocession est-elle prélevée automatiquement ?</summary><div class="faq-answer">Pas encore. MédiLink permet de calculer le montant à partir des honoraires déclarés et du taux convenu, puis d’enregistrer le suivi du règlement. Le prélèvement bancaire automatique est à venir.</div></details>
      <details class="faq-item reveal"><summary>Quelle différence entre les deux tarifs ?</summary><div class="faq-answer">La formule à la réussite coûte 39 € par remplacement trouvé. L’abonnement illimité coûte 99 € par mois et s’adresse aux besoins réguliers. Présentez-nous votre organisation lors d’une démo pour choisir la formule adaptée.</div></details>
      <details class="faq-item reveal"><summary>Que découvre-t-on pendant la démo ?</summary><div class="faq-answer">Nous parcourons la recherche d’un remplaçant, les échanges, les documents et le suivi de la mission. C’est aussi l’occasion de revoir votre organisation et les conditions tarifaires.</div></details>
    </div>
  </div><div class="persona-faq-demo">${demo}</div></section>
`;
