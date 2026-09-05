(function () {
  var section = document.querySelector('.ml-process');
  if (!section) return;
  var tabsContainer = section.querySelector('.ml-process-tabs');
  var tabs = Array.from(section.querySelectorAll('[role="tab"]'));
  var panels = Array.from(section.querySelectorAll('[role="tabpanel"]'));
  var progressFill = section.querySelector('.ml-process-progress-fill');

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

  function resetProgress() {
    elapsedBeforePause = 0;
    startTime = null;
    if (progressFill) {
      progressFill.style.width = '0%';
    }
  }

  function select(index, shouldCenter) {
    currentIndex = index;
    tabs.forEach(function (tab, i) {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
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

      if (progressFill) {
        progressFill.style.width = (progress * 100).toFixed(2) + '%';
      }

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

  // Pause on hover over process section on desktop
  section.addEventListener('mouseenter', function () {
    isHovered = true;
    pauseTimer();
  });
  section.addEventListener('mouseleave', function () {
    isHovered = false;
    startTime = null;
  });

  // IntersectionObserver: only run auto-play when visible on screen
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
    }, { threshold: 0.2 });
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

  animationFrameId = requestAnimationFrame(step);
})();


