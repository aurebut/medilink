// Repository-authored marketing HTML, rendered by a Server Component. No user content.
export const landingContent = {
  home: `
    <section class="hero hero--structured" aria-labelledby="hero-title">
      <div class="hero-bg" aria-hidden="true"></div>
      <div class="hero-layout-human">
        <div class="hero-copy">
          <p class="hero-eyebrow">Le remplacement médical, de la recherche à la transmission.</p>
          <h1 id="hero-title"><span>Vos remplacements médicaux.</span><em>Préparez-les ensemble.</em></h1>
          <p class="hero-sub">MédiLink rapproche médecins généralistes remplaçants et cabinets selon leurs disponibilités et leurs conditions d’exercice. Créez votre profil, préparez vos candidatures et retrouvez les échanges dans le dossier du remplacement.</p>
          <div class="hero-ctas"><a class="btn btn-primary btn-lg" href="/register?type=candidate">Créer mon profil remplaçant <span aria-hidden="true">↗</span></a></div><p class="seo-launch-note">MédiLink développe son réseau de médecins et de cabinets. Les missions dépendent des annonces publiées. Vous pouvez dès maintenant <a href="/register?type=candidate">créer votre profil</a> et préparer vos disponibilités.</p>
        </div>
        <div class="hero-human-wrap">
          <div class="hero-story">
            <figure class="hero-human-frame">
              <img srcset="/landing-assets/hero-medecin-640.webp 640w, /landing-assets/hero-medecin.webp 1280w" sizes="(max-width: 640px) 100vw, 800px" class="hero-human-photo" src="/landing-assets/hero-medecin.webp" width="1217" height="562" alt="Médecin généraliste échangeant avec une patiente dans son cabinet" fetchpriority="high" decoding="async">
              <figcaption class="hero-photo-caption"><span>Dates, conditions, transmissions.</span><strong>Un remplacement se prépare dans les détails.</strong></figcaption>
            </figure>
            <ol class="hero-path" aria-label="Votre remplacement, de la recherche au suivi">
              <li><a href="#matching"><span class="hero-path-number" aria-hidden="true">01</span><span><strong>Comparez selon vos critères</strong><small>Disponibilités, localisation, conditions d’exercice.</small></span><span class="hero-path-arrow" aria-hidden="true"><svg class="landing-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></span></a></li>
              <li><a href="#communication"><span class="hero-path-number" aria-hidden="true">02</span><span><strong>Préparez le remplacement</strong><small>Échanges, documents et modalités à confirmer.</small></span><span class="hero-path-arrow" aria-hidden="true"><svg class="landing-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></span></a></li>
              <li><a href="#continuite"><span class="hero-path-number" aria-hidden="true">03</span><span><strong>Organisez la transmission</strong><small>Activité, résultats attendus et points à reprendre.</small></span><span class="hero-path-arrow" aria-hidden="true"><svg class="landing-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></span></a></li>
            </ol>
          </div>
        </div>
      </div>
    </section>

    <section class="ml-process" id="matching" aria-labelledby="ml-process-title">
      <div class="ml-process-inner">
        <header class="ml-process-head">
          <span class="ml-process-kicker">Vos critères comme point de départ</span>
          <h2 id="ml-process-title">Les mêmes dates <em>ne suffisent pas toujours.</em></h2>
          <p>Le lieu, les horaires, le logiciel utilisé ou l’organisation du cabinet comptent aussi. MédiLink compare les critères renseignés par chacun pour vous aider à choisir avec qui travailler.</p>
        </header>
        <div class="ml-process-nav">
          <div class="ml-process-tabs" role="tablist" aria-label="Les trois étapes du remplacement">
            <button class="ml-process-tab" type="button" role="tab" id="ml-tab-criteria" aria-controls="ml-panel-criteria" aria-selected="true">
              <span class="ml-tab-fill" aria-hidden="true"></span>
              <span class="ml-tab-num" aria-hidden="true">01</span>
              <span class="ml-tab-text">Précisez vos attentes</span>
            </button>
            <button class="ml-process-tab" type="button" role="tab" id="ml-tab-matching" aria-controls="ml-panel-matching" aria-selected="false" tabindex="-1">
              <span class="ml-tab-fill" aria-hidden="true"></span>
              <span class="ml-tab-num" aria-hidden="true">02</span>
              <span class="ml-tab-text">Comparez les possibilités</span>
            </button>
            <button class="ml-process-tab" type="button" role="tab" id="ml-tab-report" aria-controls="ml-panel-report" aria-selected="false" tabindex="-1">
              <span class="ml-tab-fill" aria-hidden="true"></span>
              <span class="ml-tab-num" aria-hidden="true">03</span>
              <span class="ml-tab-text">Suivez le remplacement</span>
            </button>
          </div>
        </div>
        <div class="ml-process-panel" id="ml-panel-criteria" role="tabpanel" aria-labelledby="ml-tab-criteria" tabindex="0">
          <div class="ml-process-copy">
            <span class="ml-process-kicker">01 · Vos critères</span>
            <h3>Ce que vous cherchez.<br>Ce que le cabinet propose.</h3>
            <p>Le cabinet décrit le remplacement : dates, horaires, spécialité et organisation. Le médecin remplaçant indique ses disponibilités, sa zone de recherche et ses préférences d’exercice.</p>
            <ul class="ml-process-benefits"><li>Des conditions connues avant de prendre contact.</li><li>Des critères que chacun peut comparer à ses attentes.</li></ul>
          </div>
          <figure class="ml-stage ml-human-stage ml-human-stage--criteria"><img srcset="/landing-assets/process-criteria-640.webp 640w, /landing-assets/process-criteria.webp 1280w" sizes="(max-width: 640px) 100vw, 800px" class="ml-human-photo" src="/landing-assets/process-criteria.webp" width="800" height="1000" alt="Une médecin prépare ses disponibilités au cabinet" loading="lazy" decoding="async"><div class="ml-float ml-float--criteria-0"><div class="ml-persona ml-value-persona"><div class="ml-ui-head"><span class="ml-ui-icon" aria-hidden="true">+</span><div><small>DR THOMAS MARTIN · LYON 6e</small><h4>Médecin à remplacer</h4></div><span class="ml-ui-dot" aria-label="Critères enregistrés"></span></div><dl>
                    <div class="ml-field"><dt>Date</dt><dd>14 – 18 sept. 2026</dd></div>
                    <div class="ml-field"><dt>Besoin</dt><dd>Remplacement en cabinet</dd></div>
                    <div class="ml-field"><dt>Spécialité</dt><dd>Médecine générale</dd></div>
                    <div class="ml-field"><dt>Durée</dt><dd>5 jours · Temps plein</dd></div>
                    <div class="ml-field"><dt>Localisation</dt><dd>Lyon 6e</dd></div>
                  </dl><div class="ml-value-calendar"><div><span>5 jours à couvrir</span><b>SEPT. 2026</b></div><ol aria-label="Du 14 au 18 septembre"><li><small>L</small><b>14</b></li><li><small>M</small><b>15</b></li><li><small>M</small><b>16</b></li><li><small>J</small><b>17</b></li><li><small>V</small><b>18</b></li></ol></div></div></div><div class="ml-float ml-float--criteria-1"><div class="ml-persona ml-persona--locum ml-value-persona"><div class="ml-ui-head"><span class="ml-ui-icon ml-ui-icon--blue" aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></span><div><small>DRE SARAH BERNARD</small><h4>Médecin remplaçant</h4></div><span class="ml-ui-dot" aria-label="Critères enregistrés"></span></div><dl>
                    <div class="ml-field"><dt>Disponibilités</dt><dd>14 – 25 sept. 2026</dd></div>
                    <div class="ml-field"><dt>Zone géographique</dt><dd>Lyon · Rayon de 15 km</dd></div>
                    <div class="ml-field"><dt>Spécialité</dt><dd>Médecine générale</dd></div>
                    <div class="ml-field"><dt>Préférences</dt><dd>Cabinet de groupe</dd></div>
                    <div class="ml-field"><dt>Durée souhaitée</dt><dd>1 à 2 semaines</dd></div>
                  </dl><div class="ml-value-calendar"><div><span>Disponible du 14 au 25</span><b>SEPT.</b></div><ol aria-label="Du 14 au 18 septembre"><li><small>L</small><b>14</b></li><li><small>M</small><b>15</b></li><li><small>M</small><b>16</b></li><li><small>J</small><b>17</b></li><li><small>V</small><b>18</b></li></ol></div></div></div><figcaption class="ml-human-caption">Illustration MédiLink · Données fictives</figcaption></figure>
        </div>
        <div class="ml-process-panel" id="ml-panel-matching" role="tabpanel" aria-labelledby="ml-tab-matching" tabindex="0" hidden>
          <div class="ml-process-copy">
            <span class="ml-process-kicker">02 · Les recommandations</span>
            <h3>Comprenez pourquoi un profil ou une mission vous est proposé.</h3>
            <p>MédiLink croise les informations des deux côtés et détaille les points de compatibilité. Vous pouvez examiner la recommandation, puis échanger pour préciser ce qui compte avant de vous engager.</p>
            <ul class="ml-process-benefits"><li>Des recommandations expliquées.</li><li>Un accord à construire entre les deux médecins.</li></ul>
          </div>
          <figure class="ml-stage ml-human-stage ml-human-stage--matching"><img srcset="/landing-assets/process-matching-640.webp 640w, /landing-assets/process-matching.webp 1280w" sizes="(max-width: 640px) 100vw, 800px" class="ml-human-photo" src="/landing-assets/process-matching.webp" width="800" height="1000" alt="Deux médecins échangent autour d’une tablette au cabinet" loading="lazy" decoding="async"><div class="ml-float ml-float--score"><span>Les critères s’alignent</span><div class="ml-ui-score-ring"><strong>98<small>%</small></strong></div><b><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg> Match trouvé</b></div><div class="ml-float ml-float--matches ml-value-match">
<div class="ml-ui-head"><span class="ml-ui-icon" aria-hidden="true"><svg class="landing-icon landing-icon--exchange" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16M8 8l-4 4 4 4m8-8 4 4-4 4"/></svg></span><div><small>UNE CORRESPONDANCE EXPLIQUÉE</small><h4>Pourquoi ce match ?</h4></div><span class="ml-ui-count">98 %</span></div>
<div class="ml-value-pair"><div><span class="ml-ui-avatar" aria-hidden="true">SB</span><strong>Dre Sarah Bernard<small>Médecin remplaçante</small></strong></div><span aria-hidden="true"><svg class="landing-icon landing-icon--exchange" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16M8 8l-4 4 4 4m8-8 4 4-4 4"/></svg></span><div><strong>Dr Thomas Martin<small>Cabinet des Brotteaux</small></strong></div></div>
<dl class="ml-value-reasons"><div><dt><i aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></i> Disponibilités</dt><dd>5 jours sur 5 couverts</dd></div><div><dt><i aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></i> Spécialité</dt><dd>Médecine générale</dd></div><div><dt><i aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></i> Distance</dt><dd>3 km · dans votre zone</dd></div><div><dt><i aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></i> Cadre d’exercice</dt><dd>Cabinet de groupe souhaité</dd></div></dl>
<div class="ml-value-secondary"><span class="ml-ui-avatar" aria-hidden="true">AM</span><span><strong>Dr Adam Morel <svg class="landing-icon landing-icon--exchange" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16M8 8l-4 4 4 4m8-8 4 4-4 4"/></svg> Cabinet Bellecour</strong><small>21–25 sept. · Disponible · 7 km</small></span><b>94 %</b></div>
<div class="ml-value-footer"><span aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></span> Une recommandation. La décision reste la vôtre.</div>
</div><figcaption class="ml-human-caption">Illustration MédiLink · Données fictives</figcaption></figure>
        </div>
        <div class="ml-process-panel" id="ml-panel-report" role="tabpanel" aria-labelledby="ml-tab-report" tabindex="0" hidden>
          <div class="ml-process-copy">
            <span class="ml-process-kicker">03 · Le suivi du remplacement</span>
            <h3>Préparez aussi ce qu’il faudra transmettre.</h3>
            <p>Le compte rendu réunit l’activité du remplacement, les points de vigilance et les transmissions. Les deux médecins disposent d’un support commun, mis à jour en temps réel, pour faire le point quand ils en ont besoin.</p>
            <ul class="ml-process-benefits"><li>Les points à reprendre identifiés.</li><li>Les transmissions consultables pendant et après le remplacement.</li></ul>
          </div>
          <figure class="ml-stage ml-human-stage ml-human-stage--report"><img srcset="/landing-assets/process-report-640.webp 640w, /landing-assets/process-report.webp 1280w" sizes="(max-width: 640px) 100vw, 800px" class="ml-human-photo" src="/landing-assets/process-report.webp" width="800" height="1000" alt="Une médecin consulte le compte rendu de son remplacement" loading="lazy" decoding="async"><div class="ml-float ml-float--done"><b><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></b><div><strong>Le compte rendu partagé</strong><span>Pendant et après la mission</span></div></div><div class="ml-float ml-float--report"><div class="ml-ui-head"><span class="ml-ui-icon" aria-hidden="true"><svg class="landing-icon landing-icon--list" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 6h14M5 12h14M5 18h14"/></svg></span><div><small>MISSION #ML-0428</small><h4>Compte rendu du remplacement</h4></div><span class="ml-ui-dot"></span></div><div class="ml-ui-report-date"><time datetime="2026-09-14">14 septembre 2026</time><span><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg> Mission en cours</span></div><div class="ml-ui-professional"><span class="ml-ui-avatar" aria-hidden="true">SB</span><div><strong>Dre Sarah Bernard</strong><small>Remplace le Dr Thomas Martin</small></div></div><dl class="ml-ui-report-facts"><div><dt>Mission</dt><dd>Médecine générale · Brotteaux</dd></div><div><dt>Horaires</dt><dd>09:00–12:30 · 14:00–18:00</dd></div></dl><div class="ml-value-metrics"><div><strong>24</strong><span>consultations</span></div><div><strong>2</strong><span>points à reprendre</span></div><div><strong>3</strong><span>transmissions</span></div></div><div class="ml-ui-summary"><strong>Les éléments à transmettre</strong><p>Activité, points de vigilance et transmissions réunis pour suivre le remplacement en cours.</p><div class="ml-value-handoff"><span aria-hidden="true"><svg class="landing-icon landing-icon--arrow-up-right" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></span><span>2 résultats attendus à vérifier<strong>Transmis au médecin remplacé</strong></span></div></div></div><figcaption class="ml-human-caption">Illustration MédiLink · Données fictives</figcaption></figure>
        </div>
        <p class="ml-process-note">Une fois le contact établi, MédiLink accompagne aussi <strong>la préparation et le déroulement du remplacement.</strong></p>
      </div>
    </section>

    <section class="ml-workspace" id="communication" aria-labelledby="ml-workspace-title">
      <div class="ml-workspace-inner">
        <header class="ml-workspace-heading">
          <div><span class="ml-workspace-kicker">La préparation du remplacement</span><h2 id="ml-workspace-title">Quels horaires avez-vous convenus ?<br><em>Où est le dernier document envoyé ?</em></h2></div>
          <p>Chaque remplacement possède son dossier : messages, documents et conditions confirmées. Vous retrouvez ce qui a été échangé et ce qui reste à régler avant le premier jour.</p>
        </header>
        <div class="ml-dossier" aria-label="Exemple du dossier partagé d’un remplacement">
          <header class="ml-dossier-head">
            <div class="ml-dossier-identity"><span class="ml-dossier-symbol" aria-hidden="true">M<span><svg class="landing-icon landing-icon--exchange" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16M8 8l-4 4 4 4m8-8 4 4-4 4"/></svg></span></span><div><span class="ml-dossier-eyebrow">DOSSIER PARTAGÉ · ML-0428</span><h3>Remplacement en médecine générale</h3><p>Cabinet des Tilleuls · Paris 11e</p></div></div>
            <span class="ml-dossier-status"><i aria-hidden="true"></i>Mission en cours</span>
          </header>
          <div class="ml-dossier-facts"><span>14–18 septembre 2026</span><span>08:30–18:30</span><span>Rétrocession <strong>70 %</strong></span><span class="ml-dossier-members"><img srcset="/landing-assets/temoignage-sarah-bernard-640.webp 640w, /landing-assets/temoignage-sarah-bernard.webp 1280w" sizes="(max-width: 640px) 100vw, 800px" src="/landing-assets/temoignage-sarah-bernard.webp" width="24" height="24" alt="">Cabinet &amp; Dre Sarah Bernard</span></div>
          <div class="ml-dossier-body">
            <aside class="ml-dossier-progress" id="suivi" aria-labelledby="ml-progress-title">
              <div class="ml-dossier-label"><h4 id="ml-progress-title">Votre mission, en clair</h4><span>02 / 03</span></div>
              <ol class="ml-dossier-timeline">
                <li class="is-complete"><span class="ml-timeline-dot" aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></span><div><span>01 · Accord</span><strong>Conditions confirmées</strong><p>Horaires et rétrocession validés par les deux médecins.</p><small>Accord enregistré</small></div></li>
                <li class="is-current"><span class="ml-timeline-dot" aria-hidden="true">02</span><div><span>02 · Remplacement</span><strong>Mission en cours</strong><p>Le brief et les échanges restent accessibles à tout moment.</p><small>Vous êtes ici</small></div></li>
                <li><span class="ml-timeline-dot" aria-hidden="true">03</span><div><span>03 · Clôture</span><strong>Bilan de fin de mission</strong><p>Compte rendu, justificatifs et suivi réunis dans le dossier.</p></div></li>
              </ol>
              <div class="ml-dossier-today"><div><small>SEPT.</small><strong>15</strong></div><p><strong>Journée 2 sur 5</strong><span>Mardi · Le remplacement avance.</span></p></div>
            </aside>
            <div class="ml-dossier-chat" aria-labelledby="ml-chat-title">
              <header class="ml-chat-head"><div><span class="ml-chat-icon" aria-hidden="true"><svg class="landing-icon landing-icon--exchange" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 12h16M8 8l-4 4 4 4m8-8 4 4-4 4"/></svg></span><h4 id="ml-chat-title">Le fil de la mission</h4></div><span>Visible par les deux parties</span></header>
              <div class="ml-chat-content">
                <div class="ml-chat-date">Avant le remplacement</div>
                <div class="ml-chat-message"><img srcset="/landing-assets/temoignage-sarah-bernard-640.webp 640w, /landing-assets/temoignage-sarah-bernard.webp 1280w" sizes="(max-width: 640px) 100vw, 800px" src="/landing-assets/temoignage-sarah-bernard.webp" width="30" height="30" alt=""><div><span>Sarah · Médecin remplaçante</span><p>Je vous confirme ma disponibilité du 14 au 18. Le secrétariat est-il présent chaque jour ?</p></div></div>
                <div class="ml-chat-message is-cabinet"><div><span>Cabinet des Tilleuls</span><p>Oui, de 8 h 30 à 17 h 30. Je l’ajoute au brief pour que vous ayez toutes les informations.</p></div></div>
                <div class="ml-chat-decision"><span aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></span><div><small>DÉCISION CONSERVÉE DANS LE DOSSIER</small><strong>Conditions confirmées par les deux parties</strong><p>Secrétariat chaque jour · Mission du 14 au 18 septembre</p></div></div>
                <div class="ml-chat-date">Aujourd’hui · 15 septembre</div>
                <div class="ml-chat-message"><img srcset="/landing-assets/temoignage-sarah-bernard-640.webp 640w, /landing-assets/temoignage-sarah-bernard.webp 1280w" sizes="(max-width: 640px) 100vw, 800px" src="/landing-assets/temoignage-sarah-bernard.webp" width="30" height="30" alt=""><div><span>Sarah · 08:15</span><p>Bien arrivée pour cette deuxième journée. J’ai retrouvé le brief et les horaires dans le dossier, merci !</p></div></div>
                <div class="ml-chat-read">Lu par le cabinet <span aria-hidden="true"><svg class="landing-icon landing-icon--double-check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m2 12 4 4L16 6m-5 9 1 1L22 6"/></svg></span></div>
              </div>
              <div class="ml-chat-compose" aria-hidden="true"><span><svg class="landing-icon landing-icon--plus" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 5v14M5 12h14"/></svg></span><span>Écrire dans le fil de la mission…</span><span><svg class="landing-icon landing-icon--arrow-up-right" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></span></div>
            </div>
          </div>
          <div class="ml-dossier-bottom"><span><i aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></i>Chaque décision reste liée à la bonne mission.</span><span>Aperçu illustratif · Données fictives</span></div>
        </div>
        <div class="ml-workspace-benefits"><p><span aria-hidden="true">01</span><strong>Reprenez la conversation</strong>Retrouvez les échanges liés à ce remplacement.</p><p><span aria-hidden="true">02</span><strong>Vérifiez les conditions convenues</strong>Dates, horaires et rétrocession restent consultables.</p><p><span aria-hidden="true">03</span><strong>Identifiez ce qui reste à confirmer</strong>Repérez l’étape en cours et la suite à donner.</p></div>
      </div>
    </section>

    <section class="ml-continuity" id="continuite" aria-labelledby="continuity-title">
      <div class="ml-continuity-inner">
        <div class="ml-continuity-copy">
          <header>
            <span class="ml-continuity-kicker">Le suivi du remplacement en temps réel</span>
            <h2 id="continuity-title">Pendant le remplacement, savoir où en est la mission.<br><em>Quand vous en avez besoin.</em></h2>
            <p>Consultations réalisées, résultats attendus, situations à suivre : le compte rendu évolue en temps réel. Médecin remplaçant ou remplacé, consultez les informations de la mission au moment où vous en avez besoin.</p>
          </header>
          <ol class="ml-continuity-benefits">
            <li><span aria-hidden="true">01</span><div><h3>L’activité du remplacement</h3><p>Consultez les consultations réalisées au fil de la mission.</p></div></li>
            <li><span aria-hidden="true">02</span><div><h3>Les points à reprendre</h3><p>Repérez les résultats attendus et les situations qui nécessitent un suivi.</p></div></li>
            <li><span aria-hidden="true">03</span><div><h3>Les informations à transmettre</h3><p>Consultez les consignes et les éléments partagés au fil du remplacement.</p></div></li>
          </ol>
          <p class="ml-continuity-connection"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7h-9m6-3 3 3-3 3M4 17h9m-6-3-3 3 3 3"/></svg><span>Un compte rendu partagé.<br><strong>Consultable par les deux médecins, quand ils en ont besoin.</strong></span></p>
        </div>

        <figure class="ml-continuity-preview">
          <div class="ml-continuity-preview-label"><span>Le compte rendu du remplacement</span><span aria-hidden="true"><svg class="landing-icon landing-icon--arrow-up-right" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></span></div>
          <div class="ml-continuity-report">
            <header class="ml-continuity-report-head">
              <div class="ml-continuity-report-meta"><span>Mission ML-0428</span><span class="ml-continuity-status"><i aria-hidden="true"></i>En cours</span></div>
              <h3>Le point sur le remplacement</h3>
              <p>Cabinet des Tilleuls <span aria-hidden="true">·</span> Jour 3 sur 5</p>
            </header>
            <dl class="ml-continuity-metrics" aria-label="Résumé de la mission">
              <div><dt>Consultations</dt><dd>87</dd></div>
              <div><dt>À surveiller</dt><dd>2</dd></div>
              <div><dt>Transmissions</dt><dd>4</dd></div>
            </dl>
            <section class="ml-continuity-watch" aria-labelledby="watch-title">
              <div class="ml-continuity-report-label"><h4 id="watch-title">Les points à suivre</h4><span>02</span></div>
              <ul>
                <li><span class="ml-continuity-attention" aria-hidden="true">!</span><div><strong>Suivi clinique à poursuivre</strong><p>Dossier #2841 · Contrôle sous 7 jours</p></div><span class="ml-continuity-priority">Prioritaire</span></li>
                <li><span class="ml-continuity-attention" aria-hidden="true">!</span><div><strong>Résultat attendu</strong><p>Dossier #1976 · Compte rendu à vérifier</p></div></li>
              </ul>
            </section>
            <section class="ml-continuity-handoff" aria-labelledby="handoff-title">
              <div class="ml-continuity-report-label"><h4 id="handoff-title">Les transmissions réunies</h4><span>04</span></div>
              <ul>
                <li><span aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></span>Compte rendu de spécialiste</li>
                <li><span aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></span>Renouvellement à confirmer</li>
                <li><span aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></span>Appel de suivi programmé</li>
                <li><span aria-hidden="true"><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></span>Consignes de suivi</li>
              </ul>
            </section>
            <div class="ml-continuity-report-footer"><span aria-hidden="true"><svg class="landing-icon landing-icon--refresh" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5M20 7v5"/></svg></span><div><strong>Un compte rendu qui évolue avec la mission.</strong><p>Activité, points à reprendre et consignes partagées.</p></div></div>
          </div>
          <figcaption>Aperçu illustratif · Données fictives</figcaption>
        </figure>
      </div>
    </section>



    <section class="audiences" id="audiences" aria-labelledby="audiences-title"><div class="audiences-inner">
      <header class="section-head reveal"><div class="section-kicker">Votre recherche</div><h2 class="section-h" id="audiences-title">Vous cherchez une mission ou un remplaçant ?</h2></header>
      <div class="audience-grid">
        <article class="audience-card reveal"><div class="audience-card-head"><span class="audience-index">01</span><div><span>Parcours 1 sur 2</span><div class="audience-kicker">Médecin remplaçant</div></div></div><h3>Choisissez vos remplacements avec les informations qui comptent.</h3><p>Consultez les dates, l’organisation du cabinet et les conditions proposées. Comparez-les à vos préférences avant de candidater.</p><a class="btn btn-primary" href="/remplacement-medical">Découvrir le parcours remplaçant <span aria-hidden="true"><svg class="landing-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></a></article>
        <article class="audience-card reveal"><div class="audience-card-head"><span class="audience-index">02</span><div><span>Parcours 2 sur 2</span><div class="audience-kicker">Cabinet / médecin installé</div></div></div><h3>Présentez votre besoin avant les premiers échanges.</h3><p>Précisez les dates à couvrir et le fonctionnement de votre cabinet. Étudiez les candidatures, puis préparez le remplacement avec le médecin retenu.</p><a class="btn btn-teal" href="/trouver-medecin-remplacant">Découvrir le parcours cabinet <span aria-hidden="true"><svg class="landing-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></span></a></article>
      </div>
    </div></section>

    <section class="cta-band" aria-labelledby="cta-title"><h2 id="cta-title">Préparez votre prochain remplacement en médecine générale.</h2><p>Renseignez votre statut, vos disponibilités et votre zone de recherche dans votre profil remplaçant.</p><div class="cta-actions"><a class="btn btn-primary btn-lg" href="/register?type=candidate">Créer mon profil</a></div></section>

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

<section class="seo-resources" aria-labelledby="guides-title"><h2 id="guides-title">Préparer le remplacement, étape par étape.</h2><p>Des repères concrets pour les médecins généralistes remplaçants et les cabinets : les questions à poser, les documents à préparer et les informations à partager.</p><div class="seo-resource-grid"><a class="seo-resource-card" href="/guides/premier-remplacement-medical-checklist"><small>Médecins remplaçants</small><h3>Votre premier remplacement en médecine générale</h3><p>Une checklist pour préparer les démarches, les conditions et votre arrivée au cabinet.</p><span>Lire le guide →</span></a><a class="seo-resource-card" href="/guides/annonce-remplacement-medical-cabinet"><small>Cabinets médicaux</small><h3>Une annonce de remplacement claire et complète</h3><p>Les informations utiles et une trame à adapter à votre besoin.</p><span>Lire le guide →</span></a></div></section>
`,
  candidate: `
    <section class="persona-hero" aria-labelledby="hero-title">
      <div class="hero-bg" aria-hidden="true"><div class="blob one"></div><div class="blob two"></div><div class="blob three"></div></div>
      <div class="persona-hero-inner">
        <div class="persona-eyebrow">Pour les médecins remplaçants</div>
        <h1 id="hero-title">Remplacement en médecine générale : <em>préparez votre prochaine mission.</em></h1>
        <p class="persona-hero-copy">Comparez les dates, les horaires, la rétrocession et l’organisation du cabinet avant de candidater. Votre profil, vos documents et vos échanges restent ensuite réunis pour chaque mission.</p>
        <div class="hero-ctas"><a class="btn btn-primary btn-lg" href="/register?type=candidate">Créer mon profil remplaçant</a><a class="btn btn-outline btn-lg" href="/guides/premier-remplacement-medical-checklist">Préparer mon premier remplacement</a></div><p class="seo-launch-note">MédiLink développe son réseau de médecins et de cabinets. Les missions dépendent des annonces publiées. Vous pouvez dès maintenant <a href="/register?type=candidate">créer votre profil</a> et préparer vos disponibilités.</p>
        <div class="persona-stage">
          <div class="persona-photo-frame"><img srcset="/landing-assets/hero-medecin-640.webp 640w, /landing-assets/hero-medecin.webp 1280w" sizes="(max-width: 640px) 100vw, 800px" src="/landing-assets/hero-medecin.webp" width="1217" height="562" alt="Médecin généraliste échangeant avec une patiente dans son cabinet" fetchpriority="high" decoding="async"></div>
          <div class="hero-action"><form action="/search" method="get" role="search" aria-label="Rechercher une mission"><label class="hero-field"><small>Je cherche</small><input name="q" type="search" autocomplete="off" placeholder="Spécialité, cabinet…"></label><label class="hero-field"><small>Où</small><input name="city" type="search" autocomplete="address-level2" placeholder="Ville ou département"></label><label class="hero-field"><small>Format</small><select name="missionType"><option value="">Tous les formats</option><option value="REMPLACEMENT">Remplacement</option><option value="GARDE">Garde</option><option value="VACATION">Vacation</option></select></label><button type="submit">Rechercher une mission <svg class="landing-icon landing-icon--arrow-right" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button></form></div>
        </div>
      </div>
    </section>

    <section class="persona-section" id="parcours" aria-labelledby="parcours-title"><div class="persona-section-inner">
      <header class="section-head reveal"><div class="section-kicker">Votre parcours MédiLink</div><h2 class="section-h" id="parcours-title">Choisissez avec les bonnes informations. <em>Candidatez sans repartir de zéro.</em></h2><p class="section-sub">Le parcours est conçu autour des trois moments où les informations se perdent habituellement : avant la candidature, pendant l’accord et le jour de la mission.</p></header>
      <div class="continuous-grid reveal">
        <article class="continuous-card"><div class="continuous-card-head"><span class="continuous-index">01</span><small>Avant de candidater</small></div><h3>Comparez ce qui compte vraiment</h3><p>Dates, horaires, rétrocession, logiciel, patientèle et organisation du cabinet sont visibles avant de vous positionner.</p><ul class="micro-list"><li>Conditions d’exercice détaillées</li><li>Préférences et mobilité prises en compte</li><li>Aucune décision automatique</li></ul></article>
        <article class="continuous-card"><div class="continuous-card-head"><span class="continuous-index">02</span><small>Au moment de postuler</small></div><h3>Réutilisez votre dossier</h3><p>Votre profil et les documents autorisés accompagnent votre candidature. Vous ne recommencez pas les mêmes envois à chaque mission.</p><ul class="micro-list"><li>Profil professionnel commun</li><li>Documents liés à la candidature</li><li>Statut toujours visible</li></ul></article>
        <article class="continuous-card"><div class="continuous-card-head"><span class="continuous-index">03</span><small>Après le premier échange</small></div><h3>Gardez l’accord dans son contexte</h3><p>Les questions, les conditions proposées et la prochaine action restent dans le même fil jusqu’à la clôture.</p><ul class="micro-list"><li>Messagerie liée à la mission</li><li>Proposition structurée</li><li>Agenda et suivi communs</li></ul></article>
      </div>
    </div></section>

    <section class="persona-section product-section" id="apercu" aria-labelledby="apercu-title"><div class="persona-section-inner">
      <header class="section-head reveal"><div class="section-kicker">Un choix plus lisible</div><h2 class="section-h" id="apercu-title">Comprenez en un coup d’œil <em>pourquoi une mission vous correspond.</em></h2><p class="section-sub">Le score organise les critères utiles sans choisir à votre place. Les conditions de chaque mission restent visibles à côté de la recommandation.</p></header>
      <figure class="product-demo reveal"><figcaption class="sr-only">Exemple de l’espace de recherche MédiLink présentant trois missions et leur niveau de compatibilité.</figcaption>
        <div class="product-bar"><span class="product-path"><b>Espace remplaçant</b><i>/</i><span>Missions recommandées</span></span><span class="product-state">Préférences à jour</span></div>
        <div class="candidate-workspace">
          <aside class="workspace-sidebar"><span class="workspace-sidebar-label">Votre profil</span><div class="profile-card"><img srcset="/landing-assets/temoignage-sarah-bernard-640.webp 640w, /landing-assets/temoignage-sarah-bernard.webp 1280w" sizes="(max-width: 640px) 100vw, 800px" src="/landing-assets/temoignage-sarah-bernard.webp" width="314" height="218" alt="Portrait de la Dre Sarah Bernard"><h3>Dre Sarah Bernard</h3><p>Médecin généraliste remplaçante</p><div class="profile-meter"><div><span>Profil complété</span><strong>86 %</strong></div><i aria-hidden="true"></i></div></div></aside>
          <div class="workspace-main"><div class="workspace-head"><div><span>Selon vos disponibilités</span><h3>3 missions à découvrir</h3></div><p>Dates, distance et cadre d’exercice expliquent chaque recommandation.</p></div><div class="mission-stack">
            <article class="mission-result is-featured"><div><small>Remplacement · Recommandé</small><h4>Cabinet des Tilleuls</h4><p>Paris 11e · Médecine générale · 14–18 septembre</p></div><div class="mission-data"><div><span>Rétrocession</span><strong>70 %</strong></div><div><span>Logiciel</span><strong>Doctolib</strong></div></div><div class="match-pill">92<small>/100</small></div></article>
            <article class="mission-result"><div><small>Vacation · Bonne compatibilité</small><h4>Maison de santé Voltaire</h4><p>Montreuil · Médecine générale · 22 septembre</p></div><div class="mission-data"><div><span>Horaires</span><strong>09:00–18:00</strong></div><div><span>Distance</span><strong>7 km</strong></div></div><div class="match-pill">84<small>/100</small></div></article>
            <article class="mission-result"><div><small>Remplacement · À examiner</small><h4>Cabinet du Parc</h4><p>Saint-Denis · Médecine générale · 2–5 octobre</p></div><div class="mission-data"><div><span>Rétrocession</span><strong>75 %</strong></div><div><span>Hébergement</span><strong>Non</strong></div></div><div class="match-pill">76<small>/100</small></div></article>
          </div></div>
        </div>
      </figure>
    </div></section>

    <section class="persona-dark" aria-labelledby="mission-title"><div class="dark-inner">
      <header class="dark-heading reveal"><div><div class="dark-kicker">Un dossier par mission</div><h2 id="mission-title">Le jour J, tout est encore là.</h2></div><p>Les conditions acceptées, les informations pratiques, l’agenda et les échanges restent rattachés à la mission. Vous retrouvez le bon contexte sans fouiller dans vos emails ou vos SMS.</p></header>
      <div class="dark-panel reveal"><div class="mission-file"><aside class="mission-file-aside"><span>Mission confirmée</span><h3>Remplacement<br>Médecine générale</h3><p>Cabinet des Tilleuls · Paris 11e</p><dl class="file-facts"><div><dt>Dates</dt><dd>14–18 sept.</dd></div><div><dt>Horaires</dt><dd>08:30–18:30</dd></div><div><dt>Rétrocession</dt><dd>70 %</dd></div></dl></aside><div class="mission-file-main"><div class="file-progress"><div><span>01 · Accord</span><strong>Conditions acceptées</strong></div><div class="active"><span>02 · Mission</span><strong>En cours aujourd’hui</strong></div><div><span>03 · Clôture</span><strong>À venir</strong></div></div><div class="file-feed"><div class="file-event"><i><svg class="landing-icon landing-icon--arrow-up-right" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M7 7h10v10"/></svg></i><div><strong>Brief de mission mis à jour</strong><small>Horaires du secrétariat ajoutés par le cabinet</small></div><span>Voir le brief</span></div><div class="file-event"><i><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></i><div><strong>Conditions de mission acceptées</strong><small>Dates, horaires et rétrocession conservés dans le dossier</small></div><span>Relire</span></div><div class="file-event"><i>16</i><div><strong>Journée 2 sur 5</strong><small>Agenda, consignes et messagerie accessibles</small></div><span>Ouvrir</span></div></div></div></div></div>
    </div></section>

    <section class="persona-cta" aria-labelledby="cta-title"><h2 id="cta-title">Votre prochain remplacement peut commencer par un choix plus clair.</h2><p>Renseignez votre profil et vos disponibilités pour préparer vos prochaines candidatures. Les offres dépendent des annonces publiées par les cabinets.</p><div class="cta-actions"><a class="btn btn-primary btn-lg" href="/register?type=candidate">Créer mon profil</a><a class="btn btn-outline btn-lg" href="/search">Consulter les missions</a></div></section>

    <section class="faq" id="faq" aria-labelledby="faq-title"><div class="faq-inner"><header class="section-head reveal"><div class="section-kicker">Questions fréquentes</div><h2 class="section-h" id="faq-title">Avant votre première candidature</h2><p class="section-sub">Les réponses concrètes sur le profil, les documents, l’accord et la rétrocession.</p></header><div class="faq-list">
      <details class="faq-item reveal"><summary>Qui peut créer un profil de médecin remplaçant ?</summary><div class="faq-answer">Les médecins thésés, internes et docteurs juniors disposant des autorisations nécessaires peuvent renseigner leur statut et consulter les missions correspondant à leur niveau d’exercice.</div></details>
      <details class="faq-item reveal"><summary>Dois-je envoyer mes documents à chaque candidature ?</summary><div class="faq-answer">Non. Vous déposez vos documents dans votre espace. Les pièces utiles et autorisées sont ensuite consultables par le cabinet uniquement dans le contexte de votre candidature.</div></details>
      <details class="faq-item reveal"><summary>Quelles informations sont visibles avant de postuler ?</summary><div class="faq-answer">Selon la mission : lieu, dates, horaires, rétrocession, organisation du cabinet, logiciel, patientèle et informations pratiques renseignées par le cabinet.</div></details>
      <details class="faq-item reveal"><summary>Comment l’accord est-il formalisé ?</summary><div class="faq-answer">Après les échanges, le cabinet envoie une proposition récapitulant la rétrocession, les dates, les horaires et les conditions. Vous pouvez l’accepter ou la refuser depuis la conversation.</div></details>
      <details class="faq-item reveal"><summary>Comment la rétrocession est-elle suivie ?</summary><div class="faq-answer">Les conditions convenues et les statuts déclarés restent visibles dans le dossier de mission. MédiLink ne se présente pas comme un service de séquestre ou de conservation des fonds.</div></details>
    </div></div></section>

<section class="seo-resources" aria-labelledby="guides-title"><h2 id="guides-title">Préparer le remplacement, étape par étape.</h2><p>Des repères concrets pour les médecins généralistes remplaçants et les cabinets : les questions à poser, les documents à préparer et les informations à partager.</p><div class="seo-resource-grid"><a class="seo-resource-card" href="/guides/premier-remplacement-medical-checklist"><small>Médecins remplaçants</small><h3>Votre premier remplacement en médecine générale</h3><p>Une checklist pour préparer les démarches, les conditions et votre arrivée au cabinet.</p><span>Lire le guide →</span></a><a class="seo-resource-card" href="/guides/annonce-remplacement-medical-cabinet"><small>Cabinets médicaux</small><h3>Une annonce de remplacement claire et complète</h3><p>Les informations utiles et une trame à adapter à votre besoin.</p><span>Lire le guide →</span></a></div></section>
`,
  establishment: `
    <section class="persona-hero" aria-labelledby="hero-title">
      <div class="hero-bg" aria-hidden="true"><div class="blob one"></div><div class="blob two"></div><div class="blob three"></div></div>
      <div class="persona-hero-inner">
        <div class="persona-eyebrow">Pour les cabinets et médecins installés</div>
        <h1 id="hero-title">Trouver un médecin remplaçant <em>pour votre cabinet.</em></h1>
        <p class="persona-hero-copy">Présentez votre besoin de remplacement en médecine générale : dates, organisation du cabinet et conditions proposées. Préparez votre annonce et centralisez les candidatures et les échanges dans votre espace.</p>
        <div class="hero-ctas"><a class="btn btn-teal btn-lg" href="/register?type=establishment">Publier mon besoin</a><a class="btn btn-outline btn-lg" href="#parcours">Voir comment ça marche</a></div>
        <p class="seo-launch-note">Le réseau MédiLink se développe. Préparez votre besoin et les informations utiles aux remplaçants ; la publication ne garantit pas de candidature.</p>
        <div class="persona-stage">
          <div class="persona-photo-frame"><img srcset="/landing-assets/hero-medecin-640.webp 640w, /landing-assets/hero-medecin.webp 1280w" sizes="(max-width: 640px) 100vw, 800px" src="/landing-assets/hero-medecin.webp" width="1217" height="562" alt="Médecin installée échangeant avec une patiente dans son cabinet" fetchpriority="high" decoding="async"></div>
          <div class="hero-action">
            <form class="intent-grid" action="/register" method="get" data-intent-form="establishment" aria-describedby="intent-note">
              <input type="hidden" name="type" value="establishment">
              <label class="hero-field"><small>Besoin</small><select name="intentType"><option value="REMPLACEMENT">Remplacement</option><option value="GARDE">Garde</option><option value="VACATION">Vacation</option></select></label>
              <label class="hero-field"><small>Spécialité</small><input name="intentSpecialty" autocomplete="off" placeholder="Médecine générale…"></label>
              <label class="hero-field"><small>Quand</small><input name="intentPeriod" autocomplete="off" placeholder="Dates ou période"></label>
              <label class="hero-field"><small>Où</small><input name="intentCity" autocomplete="address-level2" placeholder="Ville"></label>
              <button type="submit">Préparer ma mission <svg class="landing-icon landing-icon--arrow-right" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></button>
              <p class="hero-action-note" id="intent-note">Ces informations sont conservées dans ce navigateur pour préparer votre mission après la création du compte.</p>
            </form>
          </div>
        </div>
      </div>
    </section>

    <section class="persona-section" id="parcours" aria-labelledby="parcours-title"><div class="persona-section-inner">
      <header class="section-head reveal"><div class="section-kicker">Le parcours établissement</div><h2 class="section-h" id="parcours-title">Un besoin bien renseigné. <em>Une décision plus simple à prendre.</em></h2><p class="section-sub">MédiLink relie les trois moments du remplacement : le besoin publié, la candidature étudiée et l’accord confirmé.</p></header>
      <div class="continuous-grid reveal">
        <article class="continuous-card"><div class="continuous-card-head"><span class="continuous-index">01</span><small>Publier le besoin</small></div><h3>Donnez le bon niveau de détail</h3><p>Dates, horaires, rétrocession, organisation, logiciel et patientèle permettent au médecin de se positionner en connaissance de cause.</p><ul class="micro-list"><li>Critères essentiels explicites</li><li>Informations terrain réunies</li><li>Moins de candidatures mal alignées</li></ul></article>
        <article class="continuous-card"><div class="continuous-card-head"><span class="continuous-index">02</span><small>Étudier les candidatures</small></div><h3>Comparez dans un dossier commun</h3><p>Profil, expérience, disponibilités, message et documents autorisés restent rattachés à la candidature concernée.</p><ul class="micro-list"><li>Compatibilité expliquée</li><li>Documents au bon endroit</li><li>Historique partagé par l’équipe</li></ul></article>
        <article class="continuous-card"><div class="continuous-card-head"><span class="continuous-index">03</span><small>Confirmer et suivre</small></div><h3>Gardez l’accord dans son contexte</h3><p>La proposition reprend la rétrocession, les dates, les horaires et les conditions avant d’être acceptée ou refusée dans le fil.</p><ul class="micro-list"><li>Proposition structurée</li><li>Prochaine action visible</li><li>Agenda et clôture liés à la mission</li></ul></article>
      </div>
    </div></section>

    <section class="persona-section product-section" id="apercu" aria-labelledby="apercu-title"><div class="persona-section-inner">
      <header class="section-head reveal"><div class="section-kicker">Une vue commune</div><h2 class="section-h" id="apercu-title">Ce qui demande une action <em>remonte en premier.</em></h2><p class="section-sub">Chaque mission porte un statut, une prochaine étape et les informations utiles pour que les recruteurs et l’administratif travaillent avec le même contexte.</p></header>
      <figure class="product-demo reveal"><figcaption class="sr-only">Exemple de l’espace établissement présentant le suivi des missions et le détail d’une candidature recommandée.</figcaption>
        <div class="product-bar"><span class="product-path"><b>Espace établissement</b><i>/</i><span>Suivi des missions</span></span><span class="product-state">Équipe synchronisée</span></div>
        <div class="establishment-workspace">
          <div class="pipeline-area"><div class="pipeline-heading"><h3>Vos missions en cours</h3><span>3 éléments demandent votre attention</span></div><div class="pipeline-list">
            <article class="pipeline-item is-active"><div><small>Remplacement · Médecine générale</small><strong>Cabinet des Tilleuls · 14–18 septembre</strong></div><p>3 candidatures compatibles à étudier</p><span class="status-pill">À traiter</span></article>
            <article class="pipeline-item"><div><small>Vacation · Médecine générale</small><strong>Maison de santé Voltaire · 22 septembre</strong></div><p>Proposition acceptée par le médecin</p><span class="status-pill">À confirmer</span></article>
            <article class="pipeline-item"><div><small>Remplacement · Cabinet</small><strong>Cabinet du Parc · 2–5 octobre</strong></div><p>Conditions convenues et agenda à jour</p><span class="status-pill good">Confirmée</span></article>
            <article class="pipeline-item"><div><small>Remplacement · Médecine générale</small><strong>Cabinet République · 8–12 octobre</strong></div><p>Besoin enregistré, publication en attente</p><span class="status-pill">Brouillon</span></article>
          </div></div>
          <aside class="candidate-drawer"><span>Candidature recommandée</span><div class="drawer-person"><img srcset="/landing-assets/temoignage-sarah-bernard-640.webp 640w, /landing-assets/temoignage-sarah-bernard.webp 1280w" sizes="(max-width: 640px) 100vw, 800px" src="/landing-assets/temoignage-sarah-bernard.webp" width="314" height="218" alt="Portrait de la Dre Sarah Bernard"><div><h3>Dre Sarah Bernard</h3><p>Médecin généraliste remplaçante</p></div></div><div class="drawer-score"><span>Compatibilité mutuelle</span><strong>92<small>/100</small></strong></div><ul class="drawer-facts"><li><span>Spécialité</span><b>Compatible</b></li><li><span>Dates</span><b>Disponible</b></li><li><span>Mobilité</span><b>Paris · 8 km</b></li><li><span>Documents</span><b>Accessibles</b></li></ul><a class="drawer-action" href="/register?type=establishment">Étudier la candidature <svg class="landing-icon landing-icon--arrow-right" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></a></aside>
        </div>
      </figure>
    </div></section>

    <section class="persona-dark" aria-labelledby="team-title"><div class="dark-inner">
      <header class="dark-heading reveal"><div><div class="dark-kicker">Un dossier partagé par l’équipe</div><h2 id="team-title">Plus besoin de reconstruire l’historique.</h2></div><p>Le besoin, les candidatures, les échanges et les décisions restent rattachés à la même mission. Chaque membre retrouve ce qui a été décidé et ce qu’il reste à faire.</p></header>
      <div class="dark-panel reveal"><div class="mission-file"><aside class="mission-file-aside"><span>Mission en discussion</span><h3>Remplacement<br>Médecine générale</h3><p>Cabinet des Tilleuls · Paris 11e</p><dl class="file-facts"><div><dt>Candidatures</dt><dd>3 reçues</dd></div><div><dt>Proposition</dt><dd>À préparer</dd></div><div><dt>Suivi par</dt><dd>2 membres</dd></div></dl></aside><div class="mission-file-main"><div class="file-progress"><div><span>01 · Besoin</span><strong>Mission publiée</strong></div><div class="active"><span>02 · Sélection</span><strong>Candidature étudiée</strong></div><div><span>03 · Accord</span><strong>Prochaine étape</strong></div></div><div class="file-feed"><div class="file-event"><i>03</i><div><strong>Trois candidatures reçues</strong><small>Deux profils présentent une compatibilité supérieure à 80</small></div><span>Comparer</span></div><div class="file-event"><i><svg class="landing-icon landing-icon--check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg></i><div><strong>Documents consultés par Claire</strong><small>Diplôme, attestation et assurance liés à la candidature</small></div><span>Voir</span></div><div class="file-event"><i><svg class="landing-icon landing-icon--arrow-right" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg></i><div><strong>Prochaine action : envoyer la proposition</strong><small>Dates, horaires et rétrocession prêts à être récapitulés</small></div><span>Préparer</span></div></div></div></div></div>
    </div></section>

    <section class="persona-cta" aria-labelledby="cta-title"><h2 id="cta-title">Votre prochain besoin mérite un dossier clair dès le départ.</h2><p>Créez votre espace établissement, ajoutez les membres concernés et préparez votre première mission.</p><div class="cta-actions"><a class="btn btn-teal btn-lg" href="/register?type=establishment">Publier mon besoin</a><a class="btn btn-outline btn-lg" href="/login">J’ai déjà un compte</a></div></section>

    <section class="faq" id="faq" aria-labelledby="faq-title"><div class="faq-inner"><header class="section-head reveal"><div class="section-kicker">Questions fréquentes</div><h2 class="section-h" id="faq-title">Avant de publier une mission</h2><p class="section-sub">Les réponses utiles sur le besoin, les candidatures, les accès d’équipe et la confirmation.</p></header><div class="faq-list">
      <details class="faq-item reveal"><summary>Quels cabinets peuvent utiliser MédiLink ?</summary><div class="faq-answer">Les cabinets médicaux, maisons et centres de santé ainsi que les structures qui organisent des remplacements médicaux peuvent créer un espace établissement.</div></details>
      <details class="faq-item reveal"><summary>Quelles informations faut-il pour publier une mission ?</summary><div class="faq-answer">Vous renseignez la spécialité, le lieu, les dates et horaires, la rétrocession ainsi que les informations pratiques nécessaires au médecin pour se positionner.</div></details>
      <details class="faq-item reveal"><summary>Que voit-on dans une candidature ?</summary><div class="faq-answer">La candidature rassemble le profil professionnel, le niveau d’exercice, l’expérience, les disponibilités, le message du médecin et les documents autorisés dans ce contexte.</div></details>
      <details class="faq-item reveal"><summary>Plusieurs membres peuvent-ils accéder à l’espace ?</summary><div class="faq-answer">Oui. L’établissement peut gérer plusieurs membres et adapter les droits selon leurs responsabilités : propriétaire, administrateur, recruteur ou lecteur.</div></details>
      <details class="faq-item reveal"><summary>Comment une mission est-elle confirmée ?</summary><div class="faq-answer">Après les échanges, le cabinet envoie une proposition récapitulative. Une fois acceptées, les conditions restent rattachées à la mission et son statut est mis à jour.</div></details>
    </div></div></section>

<section class="seo-resources" aria-labelledby="guides-title"><h2 id="guides-title">Préparer le remplacement, étape par étape.</h2><p>Des repères concrets pour les médecins généralistes remplaçants et les cabinets : les questions à poser, les documents à préparer et les informations à partager.</p><div class="seo-resource-grid"><a class="seo-resource-card" href="/guides/premier-remplacement-medical-checklist"><small>Médecins remplaçants</small><h3>Votre premier remplacement en médecine générale</h3><p>Une checklist pour préparer les démarches, les conditions et votre arrivée au cabinet.</p><span>Lire le guide →</span></a><a class="seo-resource-card" href="/guides/annonce-remplacement-medical-cabinet"><small>Cabinets médicaux</small><h3>Une annonce de remplacement claire et complète</h3><p>Les informations utiles et une trame à adapter à votre besoin.</p><span>Lire le guide →</span></a></div></section>
`
};
