// Static, repository-authored illustration. No live messages or documents.
const check = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>';
const file = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 3H5v18h14V8l-5-5Z"/><path d="M14 3v5h5M8 12h8M8 16h5"/></svg>';

export const workspacePreview = `<div class="ml-dossier ml-dossier--editorial" aria-label="Exemple du dossier partagé d’un remplacement">
          <header class="ml-dossier-masthead">
            <span class="ml-dossier-wordmark" aria-hidden="true">Médi<em>Link</em><span>/</span></span>
            <span>Votre espace partagé</span>
            <span class="ml-dossier-reference">Dossier ML–0428</span>
          </header>
          <div class="ml-dossier-overview">
            <div><span class="ml-editorial-eyebrow">Cabinet des Tilleuls · Paris 11e</span><h3>Remplacement en<br><em>médecine générale.</em></h3></div>
            <div class="ml-dossier-people"><span class="ml-dossier-avatars" aria-hidden="true"><span>CT</span><img src="/landing-assets/temoignage-sarah-bernard.png" width="40" height="40" alt=""></span><p>Cabinet des Tilleuls<br><strong>&amp; Dre Sarah Bernard</strong></p></div>
          </div>
          <div class="ml-dossier-columns">
            <aside class="ml-dossier-agenda" id="suivi" aria-labelledby="ml-progress-title">
              <div class="ml-agenda-heading"><h4 id="ml-progress-title">Votre mission, en clair</h4><span class="ml-agenda-status"><i aria-hidden="true"></i>En cours</span></div>
              <div class="ml-agenda-period"><span>Septembre 2026</span><strong>14<span>—</span>18</strong><p>Lundi au vendredi · 5 jours</p></div>
              <dl class="ml-agenda-conditions"><div><dt>Horaires convenus</dt><dd>08:30 — 18:30</dd></div><div><dt>Rétrocession</dt><dd>70 <span>%</span></dd></div></dl>
              <ol class="ml-agenda-steps" aria-label="Avancement du remplacement">
                <li class="is-complete"><span aria-hidden="true">${check}</span><div><strong>Conditions confirmées</strong><small>Accord enregistré</small></div></li>
                <li class="is-current"><span aria-hidden="true">02</span><div><strong>Mission en cours</strong><small>Journée 2 sur 5 · Vous êtes ici</small></div></li>
                <li><span aria-hidden="true">03</span><div><strong>Bilan de fin de mission</strong><small>La prochaine étape, ensemble</small></div></li>
              </ol>
              <div class="ml-agenda-note">Les conditions convenues restent<br>accessibles à tout moment.</div>
            </aside>
            <div class="ml-dossier-conversation" aria-labelledby="ml-chat-title">
              <header class="ml-conversation-heading"><div><span class="ml-editorial-eyebrow">Les échanges</span><h4 id="ml-chat-title">Le fil de la mission.</h4></div><span class="ml-conversation-shared">Partagé entre vous</span></header>
              <div class="ml-conversation-date">Avant le remplacement</div>
              <div class="ml-conversation-message"><span class="ml-conversation-avatar" aria-hidden="true">SB</span><div><span class="ml-conversation-author">Sarah <small>Médecin remplaçante</small></span><p>Je vous confirme ma disponibilité du 14 au 18. Le secrétariat est-il présent chaque jour ?</p></div></div>
              <div class="ml-conversation-message ml-conversation-message--cabinet"><span class="ml-conversation-avatar" aria-hidden="true">CT</span><div><span class="ml-conversation-author">Cabinet des Tilleuls</span><p>Oui, de 8 h 30 à 17 h 30. Je l’ajoute au brief pour que vous ayez toutes les informations.</p></div></div>
              <div class="ml-conversation-agreement"><span aria-hidden="true">${check}</span><p><strong>Conditions confirmées ensemble</strong><small>Secrétariat chaque jour · Du 14 au 18 septembre</small></p></div>
              <div class="ml-conversation-files" aria-label="Exemples de documents partagés"><div class="ml-conversation-file"><span class="ml-file-symbol">${file}</span><div><strong>Brief du cabinet</strong><span>Horaires, accès et repères utiles</span></div><span class="ml-file-format">PDF</span></div><div class="ml-conversation-file"><span class="ml-file-symbol">${file}</span><div><strong>Conditions convenues</strong><span>La dernière version, au même endroit</span></div><span class="ml-file-format">PDF</span></div></div>
              <div class="ml-conversation-arrival"><span class="ml-arrival-dot" aria-hidden="true"></span><p><span>Aujourd’hui · Sarah, 08:15</span>« Bien arrivée. J’ai retrouvé le brief et les horaires, merci ! »</p><span class="ml-arrival-read">Lu ${check}</span></div>
            </div>
          </div>
          <div class="ml-dossier-caption"><span>${check}Chaque décision reste liée à la bonne mission.</span><span>Aperçu illustratif · Données fictives</span></div>
        </div>`;
