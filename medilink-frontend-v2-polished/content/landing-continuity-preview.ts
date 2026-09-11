const transmissionMark = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg>`;

export const continuityPreview = `<figure class="ml-continuity-preview ml-journal-stage">
  <div class="ml-journal-stage-label"><span>Le compte rendu du remplacement</span><span aria-hidden="true">03 / 05</span></div>
  <div class="ml-journal-sheet">
    <header class="ml-journal-head">
      <div class="ml-journal-meta"><span>Mission ML-0428</span><span class="ml-journal-status"><i aria-hidden="true"></i>En cours</span></div>
      <h3>Le point sur<br><em>le remplacement.</em></h3>
      <p>Cabinet des Tilleuls <span aria-hidden="true">·</span> Jour 3 sur 5</p>
    </header>

    <div class="ml-journal-activity">
      <dl class="ml-journal-total"><div><dt>Consultations</dt><dd>87</dd></div></dl>
      <div class="ml-journal-days" role="img" aria-label="Consultations réalisées : 24 au jour 1, 31 au jour 2 et 32 au jour 3. Jours 4 et 5 à venir.">
        <div class="ml-journal-day ml-journal-day--one" aria-hidden="true"><span class="ml-journal-day-value">24</span><i></i><span>J1</span></div>
        <div class="ml-journal-day ml-journal-day--two" aria-hidden="true"><span class="ml-journal-day-value">31</span><i></i><span>J2</span></div>
        <div class="ml-journal-day ml-journal-day--three" aria-hidden="true"><span class="ml-journal-day-value">32</span><i></i><span>J3</span></div>
        <div class="ml-journal-day ml-journal-day--future" aria-hidden="true"><span class="ml-journal-day-value">—</span><i></i><span>J4</span></div>
        <div class="ml-journal-day ml-journal-day--future" aria-hidden="true"><span class="ml-journal-day-value">—</span><i></i><span>J5</span></div>
      </div>
    </div>

    <section class="ml-journal-watch" aria-labelledby="watch-title">
      <div class="ml-journal-section-head"><h4 id="watch-title">Les points à suivre</h4><span aria-label="2 points à surveiller">02</span></div>
      <ul>
        <li><span class="ml-journal-attention" aria-hidden="true"></span><div><div class="ml-journal-watch-title"><strong>Suivi clinique à poursuivre</strong><span>Prioritaire</span></div><p>Dossier #2841 · Contrôle sous 7 jours</p></div></li>
        <li><span class="ml-journal-attention" aria-hidden="true"></span><div><strong>Résultat attendu</strong><p>Dossier #1976 · Compte rendu à vérifier</p></div></li>
      </ul>
    </section>

    <section class="ml-journal-handoff" aria-labelledby="handoff-title">
      <div class="ml-journal-section-head"><h4 id="handoff-title">Les transmissions réunies</h4><span aria-label="4 transmissions">04</span></div>
      <ul>
        <li>${transmissionMark}<span>Compte rendu de spécialiste</span></li>
        <li>${transmissionMark}<span>Renouvellement à confirmer</span></li>
        <li>${transmissionMark}<span>Appel de suivi programmé</span></li>
        <li>${transmissionMark}<span>Consignes de suivi</span></li>
      </ul>
    </section>

    <div class="ml-journal-footer"><svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M20 7v5h-5M20 12a8 8 0 1 0-2 5"/></svg><div><strong>Un compte rendu qui évolue avec la mission.</strong><p>Activité, points à reprendre et consignes partagées.</p></div></div>
  </div>
  <figcaption>Aperçu illustratif · Données fictives</figcaption>
</figure>`;
