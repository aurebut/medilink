import { interfacePreview } from './landing-interface-preview';

const syncIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 9a7.5 7.5 0 0 0-12.7-3L4 8m0-5v5h5M5 15a7.5 7.5 0 0 0 12.7 3L20 16m0 5v-5h-5"/></svg>';

export const documentsSection = `<section class="ml-documents" id="documents" aria-labelledby="ml-documents-title">
      <div class="ml-documents-inner">
        <div class="ml-documents-copy">
          <span class="ml-documents-kicker">Les documents du remplacement</span>
          <h2 id="ml-documents-title">Vos documents réunis<br><em>dans un <span class="title-accent">espace commun</span>.</em></h2>
          <p>Retrouvez tous vos documents au même endroit : justificatifs, attestations, contrats et documents de mission, dans un espace dédié au remplacement. Tout est centralisé pour préparer, suivre et finaliser la mission simplement.</p>
          <div class="ml-documents-connection">${syncIcon}<p>Documents et échanges, au même endroit.<br><strong>Un fil commun pour avancer à deux.</strong></p></div>
        </div>

        ${interfacePreview('documents', 'ml-documents-preview', 'Le dossier documentaire', 'Dossier documents MédiLink : pièces professionnelles, statut de validation et accès aux documents.')}
      </div>
    </section>`;
