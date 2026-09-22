import { processIllustrations } from './landing-process-art';
import { workspacePreview } from './landing-workspace-preview';
import { continuityPreview } from './landing-continuity-preview';
import { documentsSection } from './landing-documents-section';
import { candidateLanding } from './persona-candidate';
import { establishmentLanding } from './persona-establishment';

// Original landing restored from Git 60c8e06, with user-requested process illustrations.
// Legacy hrefs use canonical routes. All markup is repository-authored, never user content.
export const landingContent = {
  home: `
    <section class="hero hero--structured" aria-labelledby="hero-title">
      <div class="hero-bg" aria-hidden="true"></div>
      <div class="hero-layout-human">
        <div class="hero-copy">
          <p class="hero-eyebrow">Le remplacement médical, de la recherche à la transmission.</p>
          <h1 id="hero-title"><span>La plateforme de remplacement</span> <em>conçue <span class="title-accent">avec</span> et <span class="title-accent">pour</span> <span class="hero-title-audience">les médecins généralistes</span></em></h1>
          <p class="hero-sub">MédiLink rapproche médecins remplaçants et cabinets selon leurs disponibilités et leurs conditions d’exercice. Comparez les possibilités, convenez des modalités et retrouvez les échanges et les transmissions dans le dossier du remplacement.</p>
          <div class="hero-ctas"><a class="btn btn-primary btn-lg" href="/demo">Demander une démo <span aria-hidden="true"><svg class="landing-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></span></a></div>
        </div>
        <div class="hero-human-wrap">
          <div class="hero-story">
            <figure class="hero-human-frame">
              <img class="hero-human-photo" src="/landing-assets/hero-medecin.png" width="1217" height="562" alt="Médecin généraliste échangeant avec une patiente dans son cabinet" fetchpriority="high" decoding="async">
            </figure>
          </div>
        </div>
      </div>
    </section>

    <section class="ml-process" id="matching" aria-labelledby="ml-process-title">
      <div class="ml-process-inner">
        <header class="ml-process-head">
          <span class="ml-process-kicker">Vos critères comme point de départ</span>
          <h2 id="ml-process-title">Gérez chaque mission au même endroit, sans vous éparpiller, <span class="title-accent">avant</span>, <span class="title-accent">pendant</span> et <span class="title-accent">après</span> le remplacement.</h2>
        </header>
        <div class="ml-process-nav">
          <div class="ml-process-tabs" role="tablist" aria-label="Les trois étapes du remplacement">
            <button class="ml-process-tab" type="button" role="tab" id="ml-tab-criteria" aria-controls="ml-panel-criteria" aria-selected="true">
              <span class="ml-tab-fill" aria-hidden="true"></span>
              <span class="ml-tab-num" aria-hidden="true">01</span>
              <span class="ml-tab-text">Matchez</span>
            </button>
            <button class="ml-process-tab" type="button" role="tab" id="ml-tab-matching" aria-controls="ml-panel-matching" aria-selected="false" tabindex="-1">
              <span class="ml-tab-fill" aria-hidden="true"></span>
              <span class="ml-tab-num" aria-hidden="true">02</span>
              <span class="ml-tab-text">Pilotez</span>
            </button>
            <button class="ml-process-tab" type="button" role="tab" id="ml-tab-report" aria-controls="ml-panel-report" aria-selected="false" tabindex="-1">
              <span class="ml-tab-fill" aria-hidden="true"></span>
              <span class="ml-tab-num" aria-hidden="true">03</span>
              <span class="ml-tab-text">Concluez</span>
            </button>
          </div>
        </div>
        <div class="ml-process-panel" id="ml-panel-criteria" role="tabpanel" aria-labelledby="ml-tab-criteria" tabindex="0">
          <div class="ml-process-copy ml-match-copy">
            <span class="ml-process-kicker">01 · Vos critères</span>
            <h3>Matchez</h3>
            <p class="ml-match-intro">Nous vous rapprochons selon vos critères.</p>
            <div class="ml-match-audience">
              <p><strong>Remplaçant :</strong> indiquez vos disponibilités et vos préférences.</p>
              <p><strong>Établissement :</strong> décrivez votre besoin et vos critères d’exercice.</p>
            </div>
          </div>
          ${processIllustrations.criteria}
        </div>
        <div class="ml-process-panel" id="ml-panel-matching" role="tabpanel" aria-labelledby="ml-tab-matching" tabindex="0" hidden>
          <div class="ml-process-copy ml-pilot-copy-panel">
            <span class="ml-process-kicker">02 · Le remplacement</span>
            <h3>Pilotez</h3>
            <p class="ml-pilot-intro">Un seul endroit pour un remplacement serein.</p>
            <div class="ml-pilot-explainer">
              <p><strong>Documents :</strong> préparez et partagez les pièces nécessaires.</p>
              <p><strong>Informations :</strong> transmettez les accès et les repères utiles.</p>
              <p><strong>Échanges :</strong> gardez le contact tout au long de la mission.</p>
            </div>
          </div>
          ${processIllustrations.matching}
        </div>
        <div class="ml-process-panel" id="ml-panel-report" role="tabpanel" aria-labelledby="ml-tab-report" tabindex="0" hidden>
          <div class="ml-process-copy ml-close-copy-panel">
            <span class="ml-process-kicker">03 · La fin de mission</span>
            <h3>Concluez</h3>
            <p class="ml-close-intro">Terminez le remplacement l’esprit tranquille.</p>
            <div class="ml-close-explainer">
              <p><strong>Paiement :</strong> validez le règlement du remplacement.</p>
              <p><strong>Bilan :</strong> retrouvez toute la mission dans un récapitulatif clair.</p>
            </div>
          </div>
          ${processIllustrations.report}
        </div>
      </div>
    </section>

    <section class="ml-testimonials" id="temoignages" aria-labelledby="ml-testimonials-title">
      <div class="ml-testimonials-inner">
        <header class="ml-testimonials-heading">
          <span class="ml-testimonials-kicker">Les médecins contributeurs</span>
          <h2 id="ml-testimonials-title">Des médecins ont participé <em>au <span class="title-accent">développement de la plateforme.</span></em></h2>
          <p>Quels critères comparer avant un remplacement ? Quelles informations partager avant le premier jour ? Que transmettre à la reprise ? Les médecins qui ont contribué à MédiLink ont aidé à préciser ces besoins.</p>
        </header>
        <div class="ml-testimonials-grid" role="region" aria-label="Médecins contributeurs" tabindex="0"><figure class="ml-contributor"><div class="ml-contributor-photo"><img src="/landing-assets/temoignage-sarah-bernard.png" width="314" height="218" alt="Portrait d’illustration à remplacer par celui du médecin contributeur" loading="lazy" decoding="async"><span>Portrait d’illustration</span></div><figcaption><span class="ml-contributor-label">Médecin contributeur <span aria-hidden="true">01</span></span><h3>Dr [Prénom Nom]</h3><p class="ml-contributor-specialty">Spécialité · Mode d’exercice à renseigner</p><div class="ml-contributor-contribution"><h4>Ce qu’il ou elle a aidé à définir</h4><p>À compléter avec son rôle dans la conception et les besoins du terrain qu’il ou elle a contribué à préciser.</p></div></figcaption></figure>
<figure class="ml-contributor"><div class="ml-contributor-photo"><img src="/landing-assets/temoignage-claire-martin.png" width="314" height="218" alt="Portrait d’illustration à remplacer par celui du médecin contributeur" loading="lazy" decoding="async"><span>Portrait d’illustration</span></div><figcaption><span class="ml-contributor-label">Médecin contributeur <span aria-hidden="true">02</span></span><h3>Dr [Prénom Nom]</h3><p class="ml-contributor-specialty">Spécialité · Mode d’exercice à renseigner</p><div class="ml-contributor-contribution"><h4>Ce qu’il ou elle a aidé à définir</h4><p>À compléter avec son rôle dans la conception et les besoins du terrain qu’il ou elle a contribué à préciser.</p></div></figcaption></figure>
<figure class="ml-contributor"><div class="ml-contributor-photo"><img src="/landing-assets/temoignage-juliette-moreau.png" width="314" height="218" alt="Portrait d’illustration à remplacer par celui du médecin contributeur" loading="lazy" decoding="async"><span>Portrait d’illustration</span></div><figcaption><span class="ml-contributor-label">Médecin contributeur <span aria-hidden="true">03</span></span><h3>Dr [Prénom Nom]</h3><p class="ml-contributor-specialty">Spécialité · Mode d’exercice à renseigner</p><div class="ml-contributor-contribution"><h4>Ce qu’il ou elle a aidé à définir</h4><p>À compléter avec son rôle dans la conception et les besoins du terrain qu’il ou elle a contribué à préciser.</p></div></figcaption></figure></div>
      </div>
    </section>

    <section class="ml-continuity ml-continuity--editorial" id="continuite" aria-labelledby="continuity-title">
      <div class="ml-continuity-inner">
        <div class="ml-continuity-copy">
          <header>
            <span class="ml-continuity-kicker">Le suivi du remplacement</span>
            <h2 id="continuity-title">Pendant le remplacement, savoir <span class="title-accent">où en est la mission.</span></h2>
            <p>Dates confirmées, avancement, documents et rétrocession : retrouvez les étapes de votre remplacement et les informations utiles au même endroit.</p>
          </header>
        </div>
        ${continuityPreview}
        <ol class="ml-continuity-benefits">
            <li><span aria-hidden="true">01</span><div><h3>Les moments clés</h3><p>De la mission confirmée à la rétrocession, gardez le fil.</p></div></li>
            <li><span aria-hidden="true">02</span><div><h3>La prochaine étape</h3><p>Repérez ce qui est en cours et ce qui reste à finaliser.</p></div></li>
            <li><span aria-hidden="true">03</span><div><h3>Les informations utiles</h3><p>Consultez le brief, les contacts et les conditions convenues.</p></div></li>
        </ol>
      </div>
    </section>

    <section class="ml-workspace ml-workspace--editorial" id="communication" aria-labelledby="ml-workspace-title">
      <div class="ml-workspace-inner">
        <div class="ml-workspace-copy">
          <header class="ml-workspace-heading">
            <div><span class="ml-workspace-kicker">La préparation du remplacement</span><h2 id="ml-workspace-title">Retrouvez les <span class="title-accent">échanges</span> et les <span class="title-accent">points à finaliser</span> avant le premier jour.</h2></div>
            <p>Chaque remplacement possède son dossier : messages, documents et conditions confirmées.</p>
          </header>
          <div class="ml-workspace-benefits"><p><span aria-hidden="true">01</span><strong>Reprenez la conversation</strong>Retrouvez les échanges liés à ce remplacement.</p><p><span aria-hidden="true">02</span><strong>Vérifiez les conditions convenues</strong>Dates, horaires et rétrocession restent consultables.</p><p><span aria-hidden="true">03</span><strong>Identifiez ce qui reste à confirmer</strong>Repérez l’étape en cours et la suite à donner.</p></div>
        </div>
        ${workspacePreview}
      </div>
    </section>

    ${documentsSection}

    <section class="audiences" id="audiences" aria-labelledby="audiences-title"><div class="audiences-inner">
      <header class="section-head reveal"><div class="section-kicker">Votre recherche</div><h2 class="section-h" id="audiences-title">Vous cherchez une mission ou un remplaçant ?</h2></header>
      <div class="audience-grid">
        <article class="audience-card reveal"><div class="audience-card-head"><span class="audience-index">01</span><div><span>Parcours 1 sur 2</span><div class="audience-kicker">Médecin remplaçant</div></div></div><h3>Choisissez vos remplacements avec les informations qui comptent.</h3><p>Consultez les dates, l’organisation du cabinet et les conditions proposées. Comparez-les à vos préférences avant de candidater.</p><a class="btn btn-primary" href="/remplacement-medical">Découvrir le parcours remplaçant <span aria-hidden="true"><svg class="landing-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></a></article>
        <article class="audience-card reveal"><div class="audience-card-head"><span class="audience-index">02</span><div><span>Parcours 2 sur 2</span><div class="audience-kicker">Cabinet / médecin installé</div></div></div><h3>Présentez votre besoin avant les premiers échanges.</h3><p>Précisez les dates à couvrir et le fonctionnement de votre cabinet. Étudiez les candidatures, puis préparez le remplacement avec le médecin retenu.</p><a class="btn btn-teal" href="/trouver-medecin-remplacant">Découvrir le parcours cabinet <span aria-hidden="true"><svg class="landing-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></a></article>
      </div>
    </div></section>

    <section class="cta-band" aria-labelledby="cta-title"><h2 id="cta-title">Découvrez comment préparer votre prochain remplacement avec MédiLink.</h2><p>De vos premiers critères aux transmissions, parcourez les étapes de la plateforme lors d’une démonstration.</p><div class="cta-actions"><a class="btn btn-primary btn-lg" href="/demo">Demander une démo</a></div></section>

    <section class="faq" id="faq" aria-labelledby="faq-title"><div class="faq-inner">
      <header class="section-head reveal"><div class="section-kicker">Questions fréquentes</div><h2 class="section-h" id="faq-title">Vos questions avant de commencer.</h2></header>
      <div class="faq-content">
        <h3 class="faq-group-title">Pour les médecins remplaçants</h3><div class="faq-list">
          <details class="faq-item reveal"><summary>Pourquoi MédiLink me propose-t-il cette mission&nbsp;?</summary><div class="faq-answer">MédiLink vérifie d’abord les critères indispensables, puis compare notamment les créneaux, la mobilité, le cadre d’exercice, le logiciel, la patientèle et les actes renseignés. Le détail du score explique les points de compatibilité.</div></details>
          <details class="faq-item reveal"><summary>Quelles informations le cabinet voit-il sur mon profil&nbsp;?</summary><div class="faq-answer">Le cabinet voit votre profil professionnel et les éléments utiles pour comprendre la recommandation. Vos préférences servent au filtrage et au calcul de compatibilité : leur liste complète et vos refus ne sont pas visibles par le cabinet.</div></details>
        </div>
        <h3 class="faq-group-title">Pour les cabinets et médecins installés</h3><div class="faq-list">
          <details class="faq-item reveal"><summary>Que dois-je préciser pour trouver un remplaçant&nbsp;?</summary><div class="faq-answer">Précisez le niveau requis, la spécialité, les dates, les horaires, la localisation, l’organisation, le logiciel, la patientèle et les actes concernés. Plus le besoin est complet, plus la recommandation est précise et facile à comprendre.</div></details>
          <details class="faq-item reveal"><summary>Qui peut consulter les documents du remplaçant&nbsp;?</summary><div class="faq-answer">Le médecin remplaçant dépose ses documents dans son espace. Les documents qu’il autorise sont consultables par le cabinet dans le contexte d’une candidature, sans envoi répété par e-mail.</div></details>
        </div>
        <h3 class="faq-group-title">Fonctionnement commun de la plateforme</h3><div class="faq-list">
          <details class="faq-item reveal"><summary>Quand puis-je échanger avec l’autre médecin&nbsp;?</summary><div class="faq-answer">Une conversation est créée dans le cadre d’une candidature. Les messages et les mises à jour restent liés à la mission pour que les deux parties retrouvent le même historique.</div></details>
          <details class="faq-item reveal"><summary>Comment confirme-t-on les conditions du remplacement&nbsp;?</summary><div class="faq-answer">Après les échanges, le cabinet envoie une proposition finale avec le montant ou la rétrocession, les dates, les horaires et les conditions. Le médecin peut l’accepter ou la refuser directement dans la conversation.</div></details>
          <details class="faq-item reveal"><summary>Quelles informations restent accessibles après la mission&nbsp;?</summary><div class="faq-answer">La mission confirmée reste visible dans l’agenda et son dossier conserve les conditions convenues. Après le remplacement, la fin de mission et les informations de rétrocession déclarées peuvent aussi y être conservées.</div></details>
        </div>
      </div>
    </div></section>
  `,
  candidate: candidateLanding,
  establishment: establishmentLanding,
};
