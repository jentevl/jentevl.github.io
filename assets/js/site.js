/* Nudged — site behaviour: theme toggle, mobile menu, header state, reveal, Tally embed */
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

  /* ---------- Tally sign-up form ---------- */
  var formCard = document.querySelector('[data-tally-form]');
  if (formCard) {
    var formId = (formCard.dataset.tallyForm || '').trim();
    var fallback = formCard.querySelector('.form-fallback');

    if (!formId) {
      if (fallback) fallback.hidden = false;
    } else {
      var params = new URLSearchParams({
        alignLeft: '1',
        hideTitle: '1',
        transparentBackground: '1',
        dynamicHeight: '1',
        lang: root.lang || 'nl'
      });
      // Tally's embed script forwards this page's query string (e.g. ?type=mentor)
      // to the form, which fills its hidden "type" field.
      var iframe = document.createElement('iframe');
      var src = 'https://tally.so/embed/' + encodeURIComponent(formId) + '?' + params.toString();
      iframe.setAttribute('data-tally-src', src);
      iframe.setAttribute('title', formCard.dataset.title || 'Tally form');
      iframe.setAttribute('loading', 'lazy');
      iframe.setAttribute('height', '500');
      formCard.appendChild(iframe);

      var script = document.createElement('script');
      script.src = 'https://tally.so/widgets/embed.js';
      script.async = true;
      script.onload = function () { if (window.Tally) window.Tally.loadEmbeds(); };
      script.onerror = function () { iframe.src = src; };
      document.body.appendChild(script);
    }
  }
})();
