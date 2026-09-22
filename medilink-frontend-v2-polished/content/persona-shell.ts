type Persona = 'candidate' | 'establishment';
const arrow = '<svg class="landing-arrow" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14m-6-6 6 6-6 6"/></svg>';

export function personaShell(persona: Persona) {
  const candidate = persona === 'candidate';
  const links = candidate
    ? [['#parcours', 'Les missions'], ['#echanges', 'Les échanges'], ['#documents', 'Les documents']]
    : [['#vivier', 'Les remplaçants'], ['#activite', 'Le suivi'], ['#tarifs', 'Les tarifs']];
  const mobileLinks = candidate ? [...links, ['#faq', 'Questions fréquentes']]
    : [...links.slice(0, 2), ['#documents', 'Les documents'], ['#paiement', 'La rétrocession'], links[2], ['#faq', 'Questions fréquentes']];
  const counterpart = candidate ? '/trouver-medecin-remplacant' : '/remplacement-medical';
  const counterpartLabel = candidate ? 'Je cherche un remplaçant' : 'Je cherche une mission';
  const actions = '<a class="btn btn-ghost" href="/login">Se connecter</a><a class="btn btn-primary" href="/demo">Demander une démo</a>';
  return {
    navigation: `
      <a class="nav-logo" href="/" aria-label="MédiLink — Accueil">Médi<em>Link</em></a>
      <div class="nav-links">${links.map(([url, label]) => `<a class="nav-link" href="${url}">${label}</a>`).join('')}</div>
      <div class="nav-right"><a class="nav-link" href="/guides" data-guides-link="desktop">Guides pratiques</a><div class="persona-switch" aria-label="Choisir un parcours"><a${candidate ? ' class="active" aria-current="page"' : ''} href="/remplacement-medical">Médecin remplaçant</a><a${candidate ? '' : ' class="active" aria-current="page"'} href="/trouver-medecin-remplacant">Médecin remplacé</a></div>${actions}</div>
      <button class="nav-mobile-toggle" type="button" aria-expanded="false" aria-controls="mobileNavigation"><span class="sr-only">Ouvrir le menu</span><span aria-hidden="true"><i></i><i></i></span></button>
      <div class="nav-mobile-panel" id="mobileNavigation">${mobileLinks.map(([url, label]) => `<a href="${url}">${label} ${arrow}</a>`).join('')}<a href="${counterpart}">${counterpartLabel} ${arrow}</a><a href="/guides" data-guides-link="mobile">Guides pratiques ${arrow}</a><div class="nav-mobile-actions">${actions}</div></div>
    `,
    footer: `<div class="footer-inner"><div class="footer-top"><div class="footer-brand"><strong>Médi<em>Link</em></strong><p>MédiLink réunit médecins remplaçants et cabinets pour trouver, préparer et suivre leurs remplacements.</p></div><div class="footer-col"><h4>Votre parcours</h4>${links.map(([url, label]) => `<a href="${url}">${label}</a>`).join('')}<a href="#faq">Questions fréquentes</a></div><div class="footer-col"><h4>Découvrir MédiLink</h4><a href="/">Accueil</a><a href="/remplacement-medical">Médecin remplaçant</a><a href="/trouver-medecin-remplacant">Médecin remplacé</a></div><div class="footer-col"><h4>Pour aller plus loin</h4><a href="/demo">Demander une démo</a><a href="/guides">Guides pratiques</a><a href="/login">Se connecter</a></div></div><div class="footer-bottom"><span>© 2026 MédiLink</span><span>Remplacements médicaux · France</span></div></div>`,
  };
}
