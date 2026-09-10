/* ============================================================
   WORK - horizontal scroll (smooth lerp) + drag with inertia
   ============================================================ */
(function () {
  'use strict';

  document.querySelectorAll('[data-gallery]').forEach(function (scroller) {
    var inner = scroller.querySelector('.h-scroll__inner');
    var curEl = scroller.closest('.gallery').querySelector('.g-progress-cur');
    var bar = scroller.closest('.gallery').querySelector('.gallery__progress i');

    function update() {
      var max = scroller.scrollWidth - scroller.clientWidth;
      var p = max > 0 ? scroller.scrollLeft / max : 0;
      var idx = Math.min(inner.children.length, Math.max(1, Math.round(p * (inner.children.length - 1)) + 1));
      if (curEl) curEl.textContent = String(idx).padStart(2, '0');
      if (bar) bar.style.setProperty('transform', 'scaleX(' + p + ')');
    }

    /* ---- smooth horizontal scroll (lerp) ---- */
    var target = scroller.scrollLeft;
    var raf = null;
    var momentumRaf = null;

    function stopSmooth() {
      if (raf) { cancelAnimationFrame(raf); raf = null; }
      if (momentumRaf) { cancelAnimationFrame(momentumRaf); momentumRaf = null; }
    }
    function goto(x) {
      var max = scroller.scrollWidth - scroller.clientWidth;
      target = Math.max(0, Math.min(max, x));
      if (!raf) raf = requestAnimationFrame(smooth);
    }
    function smooth() {
      raf = null;
      var cur = scroller.scrollLeft;
      var diff = target - cur;
      if (Math.abs(diff) < 0.5) { scroller.scrollLeft = target; update(); return; }
      scroller.scrollLeft = cur + diff * 0.13;
      update();
      raf = requestAnimationFrame(smooth);
    }

    scroller.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        e.stopPropagation();
        goto(scroller.scrollLeft + e.deltaY);
      }
    }, { passive: false });

    /* ---- drag with time-based velocity + momentum ---- */
    var down = false, startX = 0, startL = 0, moved = false, lastX = 0, lastT = 0, vel = 0;

    scroller.addEventListener('pointerdown', function (e) {
      stopSmooth();               /* stop any running smooth loop so it cannot fight the drag */
      down = true; moved = false;
      startX = e.clientX; startL = scroller.scrollLeft;
      lastX = e.clientX; lastT = performance.now(); vel = 0;
      target = scroller.scrollLeft;
    });
    window.addEventListener('pointermove', function (e) {
      if (!down) return;
      var now = performance.now();
      var dt = now - lastT;
      if (dt > 0) vel = (e.clientX - lastX) / dt;   /* px/ms */
      lastX = e.clientX; lastT = now;
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 4) moved = true;
      scroller.scrollLeft = startL - dx;
      update();
    });
    window.addEventListener('pointerup', function () {
      if (down) {
        if (moved) {
          if (Math.abs(vel) > 0.4) {          /* fast flick -> glide */
            (function momentum() {
              if (Math.abs(vel) < 0.02) { momentumRaf = null; return; }
              goto(scroller.scrollLeft + vel * 12);
              vel *= 0.92;
              momentumRaf = requestAnimationFrame(momentum);
            })();
          } else {
            target = scroller.scrollLeft;     /* slow drag -> stay exactly */
          }
        }
        down = false;
      }
    });
    window.addEventListener('pointercancel', function () { down = false; });

    scroller.addEventListener('click', function (e) {
      if (moved) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    scroller.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });
})();
