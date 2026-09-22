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

  <section class="persona-section persona-section--product" id="vivier" aria-labelledby="vivier-title"><div class="persona-section-inner">
      <header class="section-head reveal">
        <div class="section-kicker">01 · Le vivier de remplaçants</div>
        <h2 class="section-h" id="vivier-title">Des médecins à rencontrer.<br><em>Une compatibilité à comprendre.</em></h2>
        <p class="section-sub">Au-delà d’un profil, voyez ce qui correspond à votre cabinet. Un clic sur « Voir pourquoi » détaille les points communs, les écarts et les conditions à confirmer.</p>
      </header>
      ${interfacePreview('candidates', 'persona-screen persona-screen--large reveal', 'Les candidatures et leurs critères de compatibilité, avec des données fictives', 'Candidatures MédiLink : profil sélectionné et compatibilité expliquée par spécialité, niveau, lieu, type de mission, logiciel, patientèle et rétrocession. Données fictives.')}
      <ul class="persona-benefits persona-benefits--columns reveal">
        <li><h3>Le profil, dans son contexte</h3><p>Parcours, expérience, préférences et mission concernée : les informations utiles pour préparer votre premier échange.</p></li>
        <li><h3>Chaque concordance expliquée</h3><p>Comparez les critères renseignés des deux côtés. Une information manquante reste à confirmer, sans gonfler la compatibilité.</p></li>
        <li><h3>Le choix reste le vôtre</h3><p>Les critères éclairent la discussion. Validez les disponibilités, les justificatifs et les conditions avec le médecin.</p></li>
      </ul>
  </div></section>

  <section class="persona-section persona-section--product" id="activite" aria-labelledby="activite-title"><div class="persona-section-inner">
      <header class="section-head reveal">
        <div class="section-kicker">02 · Les rapports d’activité</div>
        <h2 class="section-h" id="activite-title">Le détail d’une journée.<br><em>Le recul d’une semaine.</em></h2>
        <p class="section-sub">Journalier, hebdomadaire ou mensuel : explorez le nouvel espace de rapports. L’activité déclarée, les points à retenir et la suite à préparer trouvent leur place.</p>
        <p class="persona-feature-status">Rapports structurés à venir · aperçu interactif disponible en démo</p>
      </header>
      ${interfacePreview('report', 'persona-screen persona-screen--large reveal', 'Aperçu de la future interface de rapports avec des données fictives', 'Rapports d’activité MédiLink : sélection journalier, hebdomadaire ou mensuel, synthèse de la période et journal des rapports. Exemple fictif de la fonctionnalité en préparation.')}
      <ul class="persona-benefits persona-benefits--columns reveal">
        <li><h3>Le rythme qui vous convient</h3><p>Passez d’une journée à une semaine ou à un mois, puis revenez au rapport qui vous intéresse.</p></li>
        <li><h3>Les informations à retenir</h3><p>Une synthèse lisible, les points d’organisation et la suite à préparer, au-delà d’un simple fichier à télécharger.</p></li>
        <li><h3>Le dossier reste disponible</h3><p>En attendant les rapports structurés, les comptes rendus peuvent être partagés comme documents dans le dossier du remplacement.</p></li>
      </ul>
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
      <details class="faq-item reveal"><summary>Comment choisir mon remplaçant ?</summary><div class="faq-answer">Consultez les candidatures et ouvrez « Voir pourquoi » pour comparer les critères renseignés dans le profil et la mission. Les concordances, les écarts et les informations à confirmer sont distingués. Les disponibilités et les justificatifs restent à vérifier ensemble. Aucune décision n’est prise automatiquement.</div></details>
      <details class="faq-item reveal"><summary>Comment suivre ce qui se passe pendant la mission ?</summary><div class="faq-answer">Les échanges et les comptes rendus transmis restent accessibles dans le dossier partagé. L’interface de rapports journaliers, hebdomadaires et mensuels peut déjà être explorée avec un exemple interactif ; l’enregistrement et le partage de rapports structurés sont à venir. Il ne s’agit pas d’une remontée automatique des consultations.</div></details>
      <details class="faq-item reveal"><summary>Quels documents peut-on préparer sur MédiLink ?</summary><div class="faq-answer">Le dossier permet de préparer un contrat de remplacement libéral individuel et un courrier à l’Ordre, d’ajouter les pièces utiles et de transmettre les documents choisis. Les documents générés doivent être relus. La signature et les démarches d’autorisation restent à effectuer ; un envoi ne vaut pas validation par l’Ordre.</div></details>
      <details class="faq-item reveal"><summary>La rétrocession est-elle prélevée automatiquement ?</summary><div class="faq-answer">Pas encore. MédiLink permet de calculer le montant à partir des honoraires déclarés et du taux convenu, puis d’enregistrer le suivi du règlement. Le prélèvement bancaire automatique est à venir.</div></details>
      <details class="faq-item reveal"><summary>Quelle différence entre les deux tarifs ?</summary><div class="faq-answer">La formule à la réussite coûte 39 € par remplacement trouvé. L’abonnement illimité coûte 99 € par mois et s’adresse aux besoins réguliers. Présentez-nous votre organisation lors d’une démo pour choisir la formule adaptée.</div></details>
      <details class="faq-item reveal"><summary>Que découvre-t-on pendant la démo ?</summary><div class="faq-answer">Nous parcourons la recherche d’un remplaçant, les échanges, les documents et le suivi de la mission. C’est aussi l’occasion de revoir votre organisation et les conditions tarifaires.</div></details>
    </div>
  </div><div class="persona-faq-demo">${demo}</div></section>
`;
