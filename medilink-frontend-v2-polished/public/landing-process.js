(function () {
  var section = document.querySelector('.ml-process');
  if (!section) return;
  var tabsContainer = section.querySelector('.ml-process-tabs');
  var tabs = Array.from(section.querySelectorAll('[role="tab"]'));
  var panels = Array.from(section.querySelectorAll('[role="tabpanel"]'));

  var STEP_DURATION = 5500; // 5.5 seconds per step
  var currentIndex = 0;
  var isPlaying = true;
  var isHovered = false;
  var isInView = false;
  var startTime = null;
  var elapsedBeforePause = 0;
  var animationFrameId = null;

  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    isPlaying = false;
  }

  function centerTab(tab) {
    if (!tab || !tabsContainer) return;
    var tabOffsetLeft = tab.offsetLeft;
    var tabWidth = tab.offsetWidth;
    var containerWidth = tabsContainer.offsetWidth;
    var targetScroll = tabOffsetLeft - (containerWidth - tabWidth) / 2;
    tabsContainer.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
  }

  function updateTabProgress(index, progress) {
    tabs.forEach(function (tab, i) {
      var fill = tab.querySelector('.ml-tab-fill');
      if (!fill) return;
      if (i === index) {
        fill.style.width = (progress * 100).toFixed(2) + '%';
      } else {
        fill.style.width = '0%';
      }
    });
  }

  function resetProgress() {
    elapsedBeforePause = 0;
    startTime = null;
    updateTabProgress(currentIndex, 0);
  }

  function select(index, shouldCenter) {
    currentIndex = index;
    tabs.forEach(function (tab, i) {
      var isSelected = (i === index);
      tab.setAttribute('aria-selected', String(isSelected));
      tab.tabIndex = isSelected ? 0 : -1;
      if (panels[i]) {
        panels[i].hidden = !isSelected;
      }
    });
    if (shouldCenter !== false) {
      centerTab(tabs[index]);
    }
    resetProgress();
  }

  function step(timestamp) {
    if (isPlaying && !isHovered && isInView) {
      if (!startTime) {
        startTime = timestamp - elapsedBeforePause;
      }
      var elapsed = timestamp - startTime;
      var progress = Math.min(elapsed / STEP_DURATION, 1);

      updateTabProgress(currentIndex, progress);

      if (progress >= 1) {
        var next = (currentIndex + 1) % tabs.length;
        select(next, true);
      }
    }
    animationFrameId = requestAnimationFrame(step);
  }

  function pauseTimer() {
    if (startTime) {
      elapsedBeforePause = performance.now() - startTime;
      startTime = null;
    }
  }

  tabs.forEach(function (tab, index) {
    tab.addEventListener('click', function () {
      select(index, true);
    });
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

  // Pause on hover over tabs nav so users can click or inspect tabs without sudden switching
  var nav = section.querySelector('.ml-process-nav') || tabsContainer;
  if (nav) {
    nav.addEventListener('mouseenter', function () {
      isHovered = true;
      pauseTimer();
    });
    nav.addEventListener('mouseleave', function () {
      isHovered = false;
      startTime = null;
    });
  }

  // IntersectionObserver: run auto-play only when visible on screen
  if ('IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        isInView = entry.isIntersecting;
        if (isInView && isPlaying && !isHovered) {
          startTime = null;
        } else {
          pauseTimer();
        }
      });
    }, { threshold: 0.15 });
    observer.observe(section);
  } else {
    isInView = true;
  }

  // Touch swipe support on process panels
  var touchStartX = 0;
  var touchStartY = 0;
  section.addEventListener('touchstart', function (e) {
    if (e.target.closest('.ml-process-nav')) return;
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
  }, { passive: true });

  section.addEventListener('touchend', function (e) {
    if (e.target.closest('.ml-process-nav')) return;
    var deltaX = e.changedTouches[0].screenX - touchStartX;
    var deltaY = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4) {
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
      pauseTimer();
    });
    tabsContainer.addEventListener('mouseleave', function () {
      isDown = false;
    });
    tabsContainer.addEventListener('mouseup', function () {
      isDown = false;
      startTime = null;
    });
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

  // Initialize initial state
  select(0, false);
  animationFrameId = requestAnimationFrame(step);
})();


