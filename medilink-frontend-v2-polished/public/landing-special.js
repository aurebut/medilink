var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
var revealElements = document.querySelectorAll('.reveal');

if (reducedMotion || !('IntersectionObserver' in window)) {
  revealElements.forEach(function (element) {
    element.classList.add('visible');
  });
} else {
  var revealObserver = new IntersectionObserver(function (entries, observer) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealElements.forEach(function (element) {
    revealObserver.observe(element);
  });
}

var establishmentIntentForm = document.querySelector('[data-intent-form="establishment"]');
if (establishmentIntentForm) {
  establishmentIntentForm.addEventListener('submit', function () {
    var formData = new FormData(establishmentIntentForm);
    var intent = {
      missionType: formData.get('intentType') || '',
      specialty: formData.get('intentSpecialty') || '',
      period: formData.get('intentPeriod') || '',
      city: formData.get('intentCity') || ''
    };

    try {
      sessionStorage.setItem('medilink_establishment_intent', JSON.stringify(intent));
    } catch (_) {
      // The query string still carries the intent if browser storage is unavailable.
    }
  });
}
