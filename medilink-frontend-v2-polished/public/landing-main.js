(function () {
  var nav = document.querySelector('nav');
  var toggle = document.querySelector('.nav-mobile-toggle');
  var panel = document.querySelector('.nav-mobile-panel');

  function setMenu(open) {
    if (!nav || !toggle) return;
    nav.classList.toggle('mobile-open', open);
    toggle.setAttribute('aria-expanded', String(open));
    var label = toggle.querySelector('.sr-only');
    if (label) label.textContent = open ? 'Fermer le menu' : 'Ouvrir le menu';
  }

  if (toggle) toggle.addEventListener('click', function () { setMenu(!nav.classList.contains('mobile-open')); });
  if (panel) panel.querySelectorAll('a').forEach(function (link) { link.addEventListener('click', function () { setMenu(false); }); });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') setMenu(false); });
  document.addEventListener('click', function (event) { if (nav && nav.classList.contains('mobile-open') && !nav.contains(event.target)) setMenu(false); });
  window.addEventListener('resize', function () { if (window.innerWidth > 640) setMenu(false); });
  window.addEventListener('scroll', function () { if (nav) nav.classList.toggle('nav-scrolled', window.scrollY > 40); }, { passive: true });

  // Keep the full mission alongside the desktop thread; let mobile readers expand it.
  var missionContext = document.querySelector('.mission-context-disclosure');
  if (missionContext) {
    var compactPreview = window.matchMedia('(max-width: 640px)');
    function arrangeMissionContext() { missionContext.open = !compactPreview.matches; }
    arrangeMissionContext();
    compactPreview.addEventListener('change', arrangeMissionContext);
  }
})();
