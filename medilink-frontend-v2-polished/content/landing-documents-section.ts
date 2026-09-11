// Repository-authored illustration of shared documents; no real files or actions.
const documentIcon = '<svg width="23" height="27" viewBox="0 0 24 28" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H4v24h16V8l-6-6Z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 21h5"/></svg>';
const syncIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 9a7.5 7.5 0 0 0-12.7-3L4 8m0-5v5h5M5 15a7.5 7.5 0 0 0 12.7 3L20 16m0 5v-5h-5"/></svg>';

export const documentsSection = `<section class="ml-documents" id="documents" aria-labelledby="ml-documents-title">
      <div class="ml-documents-inner">
        <div class="ml-documents-copy">
          <span class="ml-documents-kicker">Les documents du remplacement</span>
          <h2 id="ml-documents-title">Vos documents réunis.<br><em>Vous avancez ensemble.</em></h2>
          <p>Contrat, attestations, documents de mission : retrouvez vos pièces sur MédiLink, aux côtés de vos échanges et du suivi du remplacement. Un même point de repère pour préparer la suite ensemble.</p>
          <ol class="ml-documents-benefits">
            <li><span aria-hidden="true">01</span><div><h3>Vos essentiels à portée de main</h3><p>Retrouvez vos justificatifs et vos documents de mission dans votre espace.</p></div></li>
            <li><span aria-hidden="true">02</span><div><h3>Un partage au bon moment</h3><p>Le cabinet avec lequel vous êtes en relation accède à vos justificatifs validés.</p></div></li>
            <li><span aria-hidden="true">03</span><div><h3>La préparation et le suivi réunis</h3><p>Passez des échanges aux pièces utiles, sur la même plateforme.</p></div></li>
          </ol>
          <div class="ml-documents-connection">${syncIcon}<p>Documents et échanges, au même endroit.<br><strong>Un fil commun pour avancer à deux.</strong></p></div>
        </div>

        <figure class="ml-documents-preview" aria-labelledby="ml-documents-preview-title">
          <div class="ml-documents-preview-head"><span>Les documents du remplacement</span><span>ML–0428</span></div>
          <div class="ml-documents-folio">
            <div class="ml-documents-paper">
              <div class="ml-documents-paper-meta"><span>Cabinet des Tilleuls</span><span>01 / 03</span></div>
              <h3 id="ml-documents-preview-title">Le brief<br><em>du cabinet.</em></h3>
              <p class="ml-documents-paper-sub">Les repères pour votre premier jour.</p>
              <dl class="ml-documents-brief"><div><dt>Vos horaires</dt><dd>08:30 — 18:30</dd></div><div><dt>À votre arrivée</dt><dd>Le secrétariat vous accueille.</dd></div><div><dt>Les informations pratiques</dt><dd>Accès, logiciel et contacts utiles.</dd></div></dl>
              <div class="ml-documents-paper-sign"><span class="ml-documents-small-avatar" aria-hidden="true">CT</span><span>Les repères du cabinet</span><span class="ml-documents-paper-mark" aria-hidden="true">M<em>L</em></span></div>
            </div>
            <span class="ml-documents-folio-tab" aria-hidden="true">Le remplacement</span>
          </div>
          <ul class="ml-documents-library" aria-label="Exemples de pièces réunies pour le remplacement">
            <li>${documentIcon}<span><strong>Brief du cabinet</strong><small>Les informations pratiques</small></span><span class="ml-documents-file-type">PDF</span></li>
            <li>${documentIcon}<span><strong>Contrat de remplacement</strong><small>Les conditions à relire ensemble</small></span><span class="ml-documents-file-type">PDF</span></li>
            <li>${documentIcon}<span><strong>Attestation d’assurance</strong><small>Vos justificatifs professionnels</small></span><span class="ml-documents-file-type">PDF</span></li>
          </ul>
          <div class="ml-documents-sharing" aria-label="Une même plateforme réunit le dossier de la remplaçante et le suivi du cabinet">
            <div class="ml-documents-person"><span aria-hidden="true">CT</span><strong>Le cabinet</strong></div>
            <div class="ml-documents-sync"><span>${syncIcon}</span><small>Une plateforme commune</small></div>
            <div class="ml-documents-person ml-documents-person--locum"><span aria-hidden="true">SB</span><strong>La remplaçante</strong></div>
          </div>
          <figcaption>Aperçu illustratif · Données fictives</figcaption>
        </figure>
      </div>
    </section>`;
