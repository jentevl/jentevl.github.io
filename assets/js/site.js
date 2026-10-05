/* Nudged — site behaviour: theme toggle, mobile menu, header state, reveal, Airtable embed */
(function () {
  'use strict';

  var root = document.documentElement;
  var THEME_KEY = 'nudged-theme';
  var THEME_COLORS = { light: '#ffffff', dark: '#121317' };

  /* ---------- Theme ---------- */
  var systemDark = window.matchMedia('(prefers-color-scheme: dark)');
  var themeButtons = document.querySelectorAll('[data-theme-toggle]');
  var themeMetas = document.querySelectorAll('meta[name="theme-color"]');

  function currentTheme() {
    var set = root.getAttribute('data-theme');
    if (set === 'dark' || set === 'light') return set;
    return systemDark.matches ? 'dark' : 'light';
  }

  function syncTheme() {
    var theme = currentTheme();
    themeButtons.forEach(function (btn) {
      btn.setAttribute('aria-label', theme === 'dark' ? btn.dataset.labelLight : btn.dataset.labelDark);
    });
    // Only pin the browser UI colour when the visitor chose a theme manually.
    if (root.hasAttribute('data-theme')) {
      themeMetas.forEach(function (meta) { meta.setAttribute('content', THEME_COLORS[theme]); });
    }
  }

  themeButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage unavailable */ }
      syncTheme();
    });
  });

  if (systemDark.addEventListener) systemDark.addEventListener('change', syncTheme);
  syncTheme();

  /* ---------- Mobile menu ---------- */
  var menuBtn = document.querySelector('.menu-toggle');
  var nav = document.getElementById('site-nav');

  function setMenu(open) {
    if (!menuBtn || !nav) return;
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? menuBtn.dataset.labelClose : menuBtn.dataset.labelOpen);
    nav.classList.toggle('is-open', open);
  }

  if (menuBtn && nav) {
    menuBtn.addEventListener('click', function () {
      setMenu(menuBtn.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menuBtn.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        menuBtn.focus();
      }
    });
    window.matchMedia('(min-width: 901px)').addEventListener('change', function (e) {
      if (e.matches) setMenu(false);
    });
  }

  /* ---------- Header border on scroll ---------- */
  var header = document.querySelector('.site-header');
  if (header) {
    var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 8); };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -40px 0px', threshold: 0.1 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Steps timeline ---------- */
  var timeline = document.querySelector('.timeline');
  if (timeline) {
    var vertical = window.matchMedia('(max-width: 900px)');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    // Position the track between the first and last dot, and tell each step
    // how far along the line it sits (0–1) so it lights up when the line arrives.
    var layoutTimeline = function () {
      var box = timeline.getBoundingClientRect();
      var dots = timeline.querySelectorAll('.step-dot');
      var centers = Array.prototype.map.call(dots, function (dot) {
        var r = dot.getBoundingClientRect();
        return vertical.matches ? r.top + r.height / 2 - box.top : r.left + r.width / 2 - box.left;
      });
      var start = centers[0];
      var len = centers[centers.length - 1] - start;
      timeline.style.setProperty('--start', start + 'px');
      timeline.style.setProperty('--len', len + 'px');
      dots.forEach(function (dot, i) {
        dot.parentElement.style.setProperty('--at', len > 0 ? ((centers[i] - start) / len).toFixed(3) : '0');
      });
    };

    layoutTimeline();
    window.addEventListener('resize', layoutTimeline);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(layoutTimeline);

    if (reduceMotion.matches || !('IntersectionObserver' in window)) {
      timeline.classList.add('is-active');
    } else {
      // Start once the timeline reaches the upper 70% of the viewport. A margin
      // instead of a visibility ratio, so a tall (vertical) timeline still triggers.
      var timelineObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          timeline.classList.add('is-active');
          timelineObserver.disconnect();
        }
      }, { rootMargin: '0px 0px -30% 0px' });
      timelineObserver.observe(timeline);
    }
  }

  /* ---------- Review spotlight rotation ---------- */
  var rotator = document.querySelector('.review-rotator');
  if (rotator) {
    // The rotation itself is CSS; JS only starts it once the reviews are on screen
    // (so the first review gets its full 10s) and wires up the pause button.
    if ('IntersectionObserver' in window) {
      var rotatorObserver = new IntersectionObserver(function (entries) {
        if (entries[0].isIntersecting) {
          rotator.classList.add('is-running');
          rotatorObserver.disconnect();
        }
      }, { rootMargin: '0px 0px -30% 0px' });
      rotatorObserver.observe(rotator);
    } else {
      rotator.classList.add('is-running');
    }

    var rotatorToggle = rotator.querySelector('.review-toggle');
    if (rotatorToggle) {
      rotatorToggle.addEventListener('click', function () {
        var paused = rotator.classList.toggle('is-paused');
        rotatorToggle.setAttribute('aria-label', paused ? rotatorToggle.dataset.labelPlay : rotatorToggle.dataset.labelPause);
      });
    }
  }

  /* ---------- Airtable sign-up form ---------- */
  var formCard = document.querySelector('[data-airtable-form]');
  if (formCard) {
    // Accepts a shared form ID ("shrXXXX", "appXXXX/shrXXXX") or its full URL.
    var formId = (formCard.dataset.airtableForm || '').trim()
      .replace(/^https?:\/\/airtable\.com\//, '')
      .replace(/^embed\//, '')
      .replace(/[?#].*$/, '');
    var fallback = formCard.querySelector('.form-fallback');

    if (!formId) {
      if (fallback) fallback.hidden = false;
    } else {
      // Prefill and hide the form's "type" (from ?type=mentor etc.) and "lang" fields.
      var params = new URLSearchParams();
      var type = new URLSearchParams(window.location.search).get('type');
      if (type) {
        params.set('prefill_type', type);
        params.set('hide_type', 'true');
      }
      params.set('prefill_lang', root.lang || 'nl');
      params.set('hide_lang', 'true');

      var iframe = document.createElement('iframe');
      iframe.className = 'airtable-embed airtable-dynamic-height';
      iframe.src = 'https://airtable.com/embed/' + formId.split('/').map(encodeURIComponent).join('/') + '?' + params.toString();
      iframe.setAttribute('title', formCard.dataset.title || 'Airtable form');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('height', '1100');
      formCard.appendChild(iframe);

      // Airtable's embed snippet resizes .airtable-dynamic-height iframes to fit the form.
      var script = document.createElement('script');
      script.src = 'https://static.airtable.com/js/embed/embed_snippet_v1.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }
})();
