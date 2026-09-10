/* ============================================================
   FREY v2 — shared UI: loader / cursor / lenis / reveal / theme
   ============================================================ */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  /* FreyBoot — tiny registry so page code (e.g. a future GLB / three.js model
     replacing the necklace) can hold the boot curtain open until its assets are
     really ready. Usage (call any time after this file has parsed — including from
     a DOMContentLoaded handler, which runs before the loader's own init below):
       FreyBoot.add(loadPromise, {
         label: '3d necklace', weight: 3,        // share of the progress bar
         progress: function () { return 0..1; }  // optional live progress
       });
     The curtain only lifts after every task resolves (a hard cap still applies). */
  window.FreyBoot = window.FreyBoot || {};
  if (!window.FreyBoot.tasks) {
    window.FreyBoot.tasks = [];
    window.FreyBoot.add = function (p, opts) {
      opts = opts || {};
      var task = {
        done: false,
        weight: (+opts.weight > 0) ? +opts.weight : 1,
        label: opts.label || '',
        progress: (typeof opts.progress === 'function') ? opts.progress : null
      };
      Promise.resolve(p).then(ok, ok);
      function ok() { task.done = true; }
      window.FreyBoot.tasks.push(task);
      return task;
    };
  }

  /* ---------------- Loader ---------------- */
  /* Wait for the fonts the page actually uses (the loader word + first screen) so
     the FREY word and hero never render in a fallback font. CJK (Noto Sans SC) is
     progressive and deliberately not gated — it falls back to system CJK until it
     arrives. Uses document.fonts.ready, so fonts only used below the fold are not
     force-fetched (e.g. Bricolage Grotesque on pages that never show it). */
  function bootFontsReady() {
    return new Promise(function (resolve) {
      try {
        if (!window.FontFace || !document.fonts || !document.fonts.ready) { resolve(); return; }
        // Kick the loader + hero latin faces so they are definitely requested,
        // then wait until every font currently in use has finished loading.
        var loads = [];
        try {
          loads.push(document.fonts.load('800 1px Syne'));
          loads.push(document.fonts.load('400 1px "Space Mono"'));
          loads.push(document.fonts.load('400 1px "Space Grotesk"'));
        } catch (e) {}
        Promise.all(loads).then(function () {
          return document.fonts.ready || Promise.resolve();
        }).then(resolve, resolve);
      } catch (e) { resolve(); }
    });
  }

  function initLoader() {
    var loader = document.getElementById('loader');
    if (!loader || loader.hasAttribute('data-skip')) return;
    var pctEl = loader.querySelector('.loader__pct');
    var barEl = loader.querySelector('.loader__bar i');

    // When the FREY word has fully risen (CSS delay + duration) we lift the curtain.
    var spans = loader.querySelectorAll('.loader__word span');
    var textDone = 0;
    for (var i = 0; i < spans.length; i++) {
      var cs = window.getComputedStyle(spans[i]);
      var delay = parseFloat(cs.animationDelay) || 0;
      var durMs = (parseFloat(cs.animationDuration) || 0) * 1000;
      textDone = Math.max(textDone, delay * 1000 + durMs);
    }
    if (!textDone) textDone = 1160; // fallback: last letter = .46s delay + .7s anim
    var hold = 120;                 // small beat after the letters land
    var lettersTotal = textDone + hold;

    var WAIT_CAP = 3000;            // never hold the visitor longer than this
    var FONT_W = 40;                // weight of "fonts ready" in the bar

    var tasks = (window.FreyBoot && window.FreyBoot.tasks) || [];
    var taskW = 0;
    for (var t = 0; t < tasks.length; t++) taskW += tasks[t].weight;

    var fontsReady = false;
    bootFontsReady().then(function () { fontsReady = true; });

    function allReady() {
      if (!fontsReady) return false;
      for (var t = 0; t < tasks.length; t++) if (!tasks[t].done) return false;
      return true;
    }
    function resourceRatio() {
      var done = fontsReady ? FONT_W : 0;
      for (var t = 0; t < tasks.length; t++) {
        var task = tasks[t];
        if (task.done) done += task.weight;
        else if (task.progress) {
          var p = 0;
          try { p = Math.max(0, Math.min(1, +task.progress() || 0)); } catch (e) {}
          done += task.weight * p;
        }
      }
      var total = FONT_W + taskW || FONT_W;
      return done / total;
    }

    // Lock page scroll while the curtain is down (so the page can't jump behind it).
    var prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    var t0 = performance.now();
    var runAt = -1;   // timestamp when the letters started rising
    var released = false;

    function startLetters(now) {
      if (runAt >= 0) return;
      runAt = now;
      loader.classList.add('run'); // letters start rising (CSS resumes)
      clearTimeout(capTimer);
    }
    var capTimer = setTimeout(function () { startLetters(performance.now()); }, WAIT_CAP);

    function frame(now) {
      if (runAt < 0 && (allReady() || now - t0 >= WAIT_CAP)) startLetters(now);
      var p;
      if (runAt < 0) {
        // waiting: ease toward 84% — blend elapsed-time creep with real asset progress
        var creep = 84 * (1 - Math.exp(-(now - t0) / 600));
        p = Math.max(creep, resourceRatio() * 84);
      } else {
        var q = Math.min(1, (now - runAt) / lettersTotal);
        var easeQ = 1 - Math.pow(1 - q, 3);
        p = 84 + 16 * easeQ;
        if (q >= 1 && !released) release();
      }
      p = Math.max(0, Math.min(100, p));
      var v = Math.round(p);
      if (pctEl) pctEl.textContent = String(v).padStart(3, '0');
      if (barEl) barEl.style.transform = 'scaleX(' + (p / 100) + ')';
      loader.style.setProperty('--lp', (p / 100).toFixed(4));
      if (!released) requestAnimationFrame(frame);
    }

    function release() {
      released = true;
      document.body.style.overflow = prevOverflow;
      loader.classList.add('done');
      setTimeout(function () { loader.remove(); }, 950);
      document.body.classList.add('page-in');
      if (window.FreyBoot && typeof window.FreyBoot.onReady === 'function') {
        try { window.FreyBoot.onReady(); } catch (e) {}
      }
    }

    requestAnimationFrame(frame);
  }

  /* ---------------- Custom cursor ---------------- */
  function initCursor() {
    if (!finePointer) return;
    document.body.classList.add('has-cursor');
    var dot = document.getElementById('cur-dot');
    var ring = document.getElementById('cur-ring');
    if (!dot || !ring) return;
    var mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    var hovering = false;
    window.addEventListener('mousemove', function (e) {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = 'translate3d(' + mx + 'px,' + my + 'px,0)';
    }, { passive: true });
    (function loop() {
      rx += (mx - rx) * 0.14; ry += (my - ry) * 0.14;
      ring.style.transform = 'translate3d(' + rx + 'px,' + ry + 'px,0)';
      requestAnimationFrame(loop);
    })();
    document.addEventListener('mouseover', function (e) {
      var t = e.target.closest('a,button,.btn,[data-hover],.card,.tile,.ticket,.g-item,canvas');
      if (t && !hovering) { hovering = true; ring.classList.add('is-hover'); }
    });
    document.addEventListener('mouseout', function (e) {
      var t = e.target.closest('a,button,.btn,[data-hover],.card,.tile,.ticket,.g-item,canvas');
      if (t && hovering) { hovering = false; ring.classList.remove('is-hover'); }
    });
    window.addEventListener('mousedown', function () { ring.classList.add('is-down'); });
    window.addEventListener('mouseup', function () { ring.classList.remove('is-down'); });
  }

  /* ---------------- Lenis smooth scroll ---------------- */
  function initLenis() {
    if (reduced || !window.Lenis) return;
    var lenis = new Lenis({ duration: 1.15, smoothWheel: true });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    window.lenis = lenis;
    document.querySelectorAll('[data-to-top]').forEach(function (el) {
      el.addEventListener('click', function (e) { e.preventDefault(); lenis.scrollTo(0, { duration: 1.4 }); });
    });
  }

  /* ---------------- In-page anchors: nudge so section heading sits under the nav ---------------- */
  function initAnchorNudge() {
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var href = a.getAttribute('href');
        if (!href || href === '#') return;
        var el = document.querySelector(href);
        if (!el) return;
        e.preventDefault();
        var head = document.querySelector('.site-head');
        var hh = head ? head.getBoundingClientRect().height : 92;
        var t = el.querySelector('.sec-head, h1, h2, h3, .ask-title') || el;
        var cur = window.scrollY;
        var dy = 0;   // account for un-revealed [data-reveal] translateY so the goal is layout-accurate
        if (window.DOMMatrix && t.classList && !t.classList.contains('is-in')) {
          var tr = getComputedStyle(t).transform;
          if (tr && tr !== 'none') dy = new DOMMatrix(tr).f;
        }
        var absTop = t.getBoundingClientRect().top + cur - dy;
        var goal = Math.max(0, absTop - hh - 8);   // land the heading ~8px under the fixed nav
        if (window.lenis) {
          window.lenis.scrollTo(goal);
        } else {
          window.scrollTo(0, goal);
        }
      });
    });
  }

  /* ---------------- Marquee: damped speed on hover ---------------- */
  function initMarquee() {
    document.querySelectorAll('.marquee').forEach(function (row) {
      var track = row.querySelector('.marquee__track');
      if (!track || track.dataset.marquee === '1') return;
      track.dataset.marquee = '1';
      track.style.animation = 'none';      // JS drives the loop; CSS anim stays as no-JS fallback
      if (reduced) return;                 // reduced motion -> static
      var base = parseFloat(row.dataset.speed) || 30;   // px/sec
      var slow = parseFloat(row.dataset.slow) || 0.15;  // hover speed ratio
      var speed = base, target = base, x = 0, last = performance.now();
      function half() { return track.scrollWidth / 2; }
      function step(now) {
        var dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        speed += (target - speed) * Math.min(1, dt * 3);   // damping
        x -= speed * dt;
        var h = half();
        if (h > 0 && x <= -h) x += h;      // seamless wrap (2 identical halves)
        track.style.transform = 'translateX(' + x.toFixed(2) + 'px)';
        requestAnimationFrame(step);
      }
      row.addEventListener('mouseenter', function () { target = base * slow; });
      row.addEventListener('mouseleave', function () { target = base; });
      requestAnimationFrame(step);
    });
  }

  /* ---------------- Reveal on scroll ---------------- */
  function initReveal() {
    var els = document.querySelectorAll('[data-reveal]');
    if (!('IntersectionObserver' in window) || reduced) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Theme (header color follows section) ---------------- */
  function initTheme() {
    var body = document.body;
    var fixed = body.getAttribute('data-theme'); // pages with fixed theme
    if (fixed) return;
    /* theme follows the section behind the fixed header (probe below the header),
       so the header text never turns invisible against a mismatched background */
    function pick() {
      if (!document.elementsFromPoint) return;
      var list = document.elementsFromPoint(innerWidth / 2, 55);
      for (var i = 0; i < list.length; i++) {
        var el = list[i];
        if (!el || !el.closest) continue;
        var sec = el.closest('[data-theme]');
        if (sec) { body.setAttribute('data-theme', sec.getAttribute('data-theme')); return; }
      }
    }
    window.addEventListener('scroll', pick, { passive: true });
    window.addEventListener('resize', pick);
    pick();
  }

  /* ---------------- Mobile menu ---------------- */
  function initMobileMenu() {
    var burger = document.querySelector('.head-burger');
    var menu = document.querySelector('.head-mobile');
    if (!burger || !menu) return;
    burger.addEventListener('click', function () {
      var open = menu.classList.toggle('open');
      burger.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    menu.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () {
        burger.classList.remove('open');
        menu.classList.remove('open');
        document.body.classList.remove('menu-open');
        document.body.style.overflow = '';
      });
    });
  }

  /* ---------------- Page transition ---------------- */
  /* ---------------- Page transition ---------------- */
  function initTransitions() {
    var supportsView = 'startViewTransition' in document;
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href]');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.charAt(0) === '#' || href.indexOf('http') === 0 || a.target === '_blank' || a.hasAttribute('download')) return;
      if (href === location.pathname.split('/').pop() || href === location.pathname) return;
      e.preventDefault();
      if (supportsView) {
        document.startViewTransition(function () { location.href = href; });
      } else {
        document.documentElement.classList.add('is-leaving');
        setTimeout(function () { location.href = href; }, 380);
      }
    });
  }

  /* ---------------- Boot ---------------- */
  document.addEventListener('DOMContentLoaded', function () {
    initLoader();
    initCursor();
    initLenis();
    initMarquee();
    initAnchorNudge();
    initReveal();
    initTheme();
    initMobileMenu();
    initTransitions();
  });
})();







