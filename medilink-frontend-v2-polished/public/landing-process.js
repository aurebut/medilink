(function () {
  var section = document.querySelector('.ml-process');
  if (!section) return;
  var tabs = Array.from(section.querySelectorAll('[role="tab"]'));
  var panels = Array.from(section.querySelectorAll('[role="tabpanel"]'));
  function select(index) {
    tabs.forEach(function (tab, i) {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
  }
  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { select(index); });
    tab.addEventListener('keydown', function (event) {
      var next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      select(next);
      tabs[next].focus();
    });
  });
})();
