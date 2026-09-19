import { interfacePreview } from './landing-interface-preview';

const syncIcon = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 9a7.5 7.5 0 0 0-12.7-3L4 8m0-5v5h5M5 15a7.5 7.5 0 0 0 12.7 3L20 16m0 5v-5h-5"/></svg>';

export const documentsSection = `<section class="ml-documents" id="documents" aria-labelledby="ml-documents-title">
      <div class="ml-documents-inner">
        <div class="ml-documents-copy">
          <span class="ml-documents-kicker">Les documents du remplacement</span>
          <h2 id="ml-documents-title">Vos documents réunis<br><em>dans un <span class="title-accent">espace commun</span>.</em></h2>
          <p>Générez votre contrat, réunissez vos justificatifs et transmettez votre dossier de remplacement depuis un espace partagé.</p>
          <ul class="ml-documents-benefits">
            <li><span aria-hidden="true">01</span><div><h3>Un contrat préparé ensemble</h3><p>Identités, dates et rétrocession : retrouvez les informations du remplacement dans un contrat prêt à relire et à signer.</p></div></li>
            <li><span aria-hidden="true">02</span><div><h3>Les pièces utiles à votre situation</h3><p>Assurance RCP, inscription à l’Ordre ou licence : réunissez vos justificatifs et l’autorisation lorsqu’elle est nécessaire.</p></div></li>
            <li><span aria-hidden="true">03</span><div><h3>Un dossier prêt à transmettre</h3><p>Choisissez les documents et leur destinataire, puis retrouvez l’historique des envois.</p></div></li>
          </ul>
          <div class="ml-documents-connection">${syncIcon}<p>Pour vos remplacements en exercice libéral individuel.<br><strong>De la préparation du contrat au dossier transmis.</strong></p></div>
        </div>

        ${interfacePreview('documents', 'ml-documents-preview', 'Le dossier du remplacement', 'Dossier partagé MédiLink : contrat de remplacement à signer, déclaration à l’Ordre et justificatifs professionnels.')}
      </div>
    </section>`;
