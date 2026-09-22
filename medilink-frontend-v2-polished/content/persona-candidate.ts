import { interfacePreview } from './landing-interface-preview';

export const candidateLanding = `
  <section class="persona-hero" aria-labelledby="hero-title">
    <div class="persona-hero-inner">
      <div class="persona-eyebrow">Pour les médecins remplaçants</div>
      <h1 id="hero-title">Le bon remplacement.<br><em>Les bonnes conditions pour exercer.</em></h1>
      <p class="persona-hero-copy">Trouvez les offres qui vous correspondent, échangez avec le médecin et préparez vos documents. Tout votre remplacement commence au même endroit.</p>
      <div class="hero-ctas"><a class="btn btn-primary btn-lg" href="/demo">Demander une démo</a></div>
      <div class="persona-stage">
        <div class="persona-photo-frame"><img src="/landing-assets/hero-medecin.png" width="1217" height="562" alt="Médecin généraliste échangeant avec une patiente dans son cabinet" fetchpriority="high" decoding="async"></div>
      </div>
    </div>
  </section>

  <section class="persona-section" id="parcours" aria-labelledby="parcours-title">
    <div class="persona-section-inner">
      <div class="persona-feature-row">
        <div class="persona-feature-copy reveal">
          <header class="section-head">
            <div class="section-kicker">01 · Trouver votre mission</div>
            <h2 class="section-h" id="parcours-title">Des offres sélectionnées <em>pour vous.</em></h2>
            <p class="section-sub">MédiLink rapproche les missions de votre profil et de vos préférences. Vous pouvez aussi explorer les annonces avec la recherche avancée.</p>
          </header>
          <ul class="persona-benefits">
            <li><h3>Votre profil comme point de départ</h3><p>Votre spécialité, votre niveau d’exercice et vos villes préférées orientent l’ordre des missions proposées.</p></li>
            <li><h3>Vos préférences prises en compte</h3><p>Patientèle, logiciels connus, types de mission acceptés et rétrocession souhaitée aident à rapprocher les annonces de votre façon d’exercer.</p></li>
            <li><h3>La liberté d’affiner</h3><p>Filtrez par ville, spécialité, type de mission, niveau requis, date ou rétrocession. Précisez aussi le secteur, la patientèle, le logiciel et la présence d’un secrétariat.</p></li>
          </ul>
        </div>
        ${interfacePreview('search', 'persona-screen reveal', 'La recherche de missions MédiLink avec des données de démonstration', 'Recherche MédiLink : filtres et offres de remplacement présentant les conditions de chaque mission. Données fictives.')}
      </div>

      <div class="persona-feature-row persona-feature-row--reverse">
        <div class="persona-feature-copy reveal">
          <header class="section-head">
            <div class="section-kicker">L’offre en détail</div>
            <h2 class="section-h">Voyez où vous allez. <em>Et comment vous exercerez.</em></h2>
            <p class="section-sub">Photo du cabinet, conditions et informations pratiques : retrouvez les détails renseignés par le médecin avant de candidater.</p>
          </header>
          <ul class="persona-benefits">
            <li><h3>Le lieu et le calendrier</h3><p>Ville, adresse, dates, horaires et durée pour vérifier que la mission s’intègre à votre organisation.</p></li>
            <li><h3>Les conditions d’exercice</h3><p>Spécialité, niveau requis, type de remplacement, secteur conventionné et rétrocession pour vous positionner en connaissance de cause.</p></li>
            <li><h3>Le quotidien au cabinet</h3><p>Patientèle, logiciel, secrétariat, équipe et matériel disponible pour comprendre votre environnement de travail.</p></li>
            <li><h3>Les détails qui facilitent l’arrivée</h3><p>Consultez les indications d’accès, le parking et la possibilité d’un logement lorsqu’ils sont précisés dans l’offre.</p></li>
          </ul>
        </div>
        ${interfacePreview('offer', 'persona-screen reveal', 'Une carte d’offre MédiLink avec des données de démonstration', 'Carte d’une offre de remplacement MédiLink : photo du cabinet, dates et conditions de la mission. Données fictives.')}
      </div>
    </div>
  </section>

  <section class="persona-section" id="echanges" aria-labelledby="echanges-title">
    <div class="persona-section-inner persona-feature-row">
      <div class="persona-feature-copy reveal">
        <header class="section-head">
          <div class="section-kicker">02 · Échanger avec le médecin</div>
          <h2 class="section-h" id="echanges-title">Une mission vous plaît ? <em>Parlons des détails.</em></h2>
          <p class="section-sub">Après votre candidature, échangez directement avec le médecin dans une conversation liée au remplacement.</p>
        </header>
        <ul class="persona-benefits">
          <li><h3>Posez vos questions</h3><p>Organisation des consultations, horaires, logiciel ou consignes : précisez ensemble ce qui compte avant de vous engager.</p></li>
          <li><h3>Confirmez les conditions</h3><p>Le médecin vous adresse une proposition récapitulant les dates, les horaires et la rétrocession. Vous pouvez l’accepter ou la refuser depuis la conversation.</p></li>
          <li><h3>Gardez le fil</h3><p>Retrouvez les échanges et les conditions convenues au même endroit, avant et pendant la mission.</p></li>
        </ul>
      </div>
      ${interfacePreview('messages', 'persona-screen reveal', 'La conversation liée au remplacement', 'Messagerie MédiLink entre le médecin titulaire et la remplaçante : échanges et proposition de remplacement. Données fictives.')}
    </div>
  </section>

  <section class="persona-section" id="documents" aria-labelledby="documents-title">
    <div class="persona-section-inner persona-feature-row persona-feature-row--reverse">
      <div class="persona-feature-copy reveal">
        <header class="section-head">
          <div class="section-kicker">03 · Préparer les documents</div>
          <h2 class="section-h" id="documents-title">Moins d’allers-retours. <em>Un dossier partagé.</em></h2>
          <p class="section-sub">Pour vos remplacements en exercice libéral individuel, préparez les documents et retrouvez les pièces utiles dans l’espace dédié à la mission.</p>
        </header>
        <ul class="persona-benefits">
          <li><h3>Générez vos documents</h3><p>Les informations du remplacement alimentent le contrat et le courrier à l’Ordre. Relisez-les, puis ajoutez votre exemplaire signé au dossier.</p></li>
          <li><h3>Réunissez vos justificatifs</h3><p>Assurance RCP, inscription à l’Ordre ou licence et autorisation si nécessaire : déposez les pièces adaptées à votre situation.</p></li>
          <li><h3>Retrouvez et transmettez</h3><p>Téléchargez vos documents, choisissez les pièces et le destinataire d’un envoi, puis consultez son historique dans le dossier.</p></li>
        </ul>
        <a class="btn btn-primary persona-demo-link" href="/demo">Demander une démo</a>
      </div>
      ${interfacePreview('documents', 'persona-screen reveal', 'L’espace partagé des documents du remplacement', 'Dossier MédiLink : contrat de remplacement, courrier à l’Ordre et justificatifs réunis avec leur statut et leurs actions. Données fictives.')}
    </div>
  </section>

  <section class="faq" id="faq" aria-labelledby="faq-title">
    <div class="faq-inner">
      <header class="section-head reveal"><div class="section-kicker">04 · Questions fréquentes</div><h2 class="section-h" id="faq-title">Avant votre prochain remplacement.</h2></header>
      <div class="faq-list">
        <details class="faq-item reveal"><summary>Comment les missions « pour vous » sont-elles sélectionnées ?</summary><div class="faq-answer">Les missions proposées sont classées selon les informations de votre profil : ville, spécialité, niveau d’exercice, patientèle, logiciels, types de mission acceptés et rétrocession souhaitée. Comparez ensuite les dates et les horaires de l’offre avec vos disponibilités. Vous restez libre de candidater et d’utiliser la recherche avancée.</div></details>
        <details class="faq-item reveal"><summary>Quelles informations puis-je consulter avant de candidater ?</summary><div class="faq-answer">L’offre présente les informations renseignées par le médecin : lieu, dates, horaires, niveau requis, rétrocession, secteur, patientèle, logiciel et organisation du cabinet. Les précisions sur le secrétariat, l’équipe, le matériel, l’accès ou le logement y figurent lorsqu’elles sont disponibles.</div></details>
        <details class="faq-item reveal"><summary>Quand puis-je échanger avec le médecin ?</summary><div class="faq-answer">Une conversation est créée dans le cadre de votre candidature. Vous pouvez y poser vos questions, préciser les conditions et répondre à la proposition du médecin avant de confirmer le remplacement.</div></details>
        <details class="faq-item reveal"><summary>Quels documents puis-je générer dans MédiLink ?</summary><div class="faq-answer">Pour un remplacement en exercice libéral individuel, vous pouvez préparer un contrat et un courrier destiné à l’Ordre à partir des informations du dossier. Les documents générés sont à relire et le contrat reste à signer. Les justificatifs professionnels sont à importer dans l’espace dédié.</div></details>
        <details class="faq-item reveal"><summary>Dois-je renvoyer mes justificatifs à chaque candidature ?</summary><div class="faq-answer">Votre profil permet de déposer vos justificatifs professionnels. Les pièces autorisées sont accessibles au cabinet dans le cadre de votre candidature. Le dossier partagé rassemble ensuite les documents propres au remplacement, leurs versions et l’historique des transmissions.</div></details>
      </div>
    </div>
  </section>
`;
