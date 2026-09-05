(function () {
  var section = document.querySelector('.ml-process');
  if (!section) return;
  var tabsContainer = section.querySelector('.ml-process-tabs');
  var tabs = Array.from(section.querySelectorAll('[role="tab"]'));
  var panels = Array.from(section.querySelectorAll('[role="tabpanel"]'));

  function centerTab(tab) {
    if (!tab || !tabsContainer) return;
    var tabOffsetLeft = tab.offsetLeft;
    var tabWidth = tab.offsetWidth;
    var containerWidth = tabsContainer.offsetWidth;
    var targetScroll = tabOffsetLeft - (containerWidth - tabWidth) / 2;
    tabsContainer.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
  }

  function select(index, shouldCenter) {
    tabs.forEach(function (tab, i) {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (shouldCenter !== false) {
      centerTab(tabs[index]);
    }
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () { select(index, true); });
    tab.addEventListener('keydown', function (event) {
      var next = index;
      if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
      else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = tabs.length - 1;
      else return;
      event.preventDefault();
      select(next, true);
      tabs[next].focus();
    });
  });

  // Touch swipe support on process panels
  var touchStartX = 0;
  var touchStartY = 0;
  section.addEventListener('touchstart', function (e) {
    if (e.target.closest('.ml-process-tabs')) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  section.addEventListener('touchend', function (e) {
    if (e.target.closest('.ml-process-tabs')) return;
    var deltaX = e.changedTouches[0].screenX - touchStartX;
    var deltaY = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
      var currentIndex = tabs.findIndex(function (t) { return t.getAttribute('aria-selected') === 'true'; });
      if (currentIndex === -1) currentIndex = 0;
      if (deltaX < 0 && currentIndex < tabs.length - 1) {
        select(currentIndex + 1, true);
      } else if (deltaX > 0 && currentIndex > 0) {
        select(currentIndex - 1, true);
      }
    }
  }, { passive: true });

  // Mouse drag support for the tabs carousel
  if (tabsContainer) {
    var isDown = false;
    var startX = 0;
    var scrollLeft = 0;
    var hasMoved = false;

    tabsContainer.addEventListener('mousedown', function (e) {
      isDown = true;
      hasMoved = false;
      startX = e.pageX - tabsContainer.offsetLeft;
      scrollLeft = tabsContainer.scrollLeft;
    });
    tabsContainer.addEventListener('mouseleave', function () { isDown = false; });
    tabsContainer.addEventListener('mouseup', function () { isDown = false; });
    tabsContainer.addEventListener('mousemove', function (e) {
      if (!isDown) return;
      var x = e.pageX - tabsContainer.offsetLeft;
      var walk = x - startX;
      if (Math.abs(walk) > 4) {
        hasMoved = true;
        e.preventDefault();
        tabsContainer.scrollLeft = scrollLeft - walk;
      }
    });
    tabsContainer.addEventListener('click', function (e) {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);
  }
})();

