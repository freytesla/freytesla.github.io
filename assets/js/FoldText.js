/* ============================================================
   FoldText — vanilla port of React Bits <FoldText /> (JS-CSS)
   Deps: gsap + ScrollTrigger (loaded as globals before this file)
   Usage: FoldText(el, { text, splitBy, hinge, trigger, ... })
   ============================================================ */
(function (global) {
  'use strict';

  var HINGE_CONFIG = {
    top:    { origin: '50% 0%',   rotateX: -92, rotateY: 0 },
    bottom: { origin: '50% 100%', rotateX: 92,  rotateY: 0 },
    left:   { origin: '0% 50%',   rotateX: 0,   rotateY: 92 },
    right:  { origin: '100% 50%', rotateX: 0,   rotateY: -92 }
  };
  var clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };

  function FoldText(root, opts) {
    opts = opts || {};
    var text        = opts.text != null ? opts.text : 'Design unfolds';
    var splitBy     = opts.splitBy || 'char';
    var hinge       = opts.hinge || 'top';
    var duration    = opts.duration != null ? opts.duration : 0.65;
    var stagger     = opts.stagger != null ? opts.stagger : 0.045;
    var ease        = opts.ease || 'power3.out';
    var perspective = opts.perspective != null ? opts.perspective : 700;
    var crease      = opts.creaseShading != null ? opts.creaseShading : 0.55;
    var trigger     = opts.trigger || 'mount';
    var scrollStart = opts.scrollStart || 'top 82%';
    var fontSize    = opts.fontSize != null ? opts.fontSize : 80;
    var fontWeight  = opts.fontWeight != null ? opts.fontWeight : 800;
    var color       = opts.color || '#f7f2e8';

    var hingeConfig = HINGE_CONFIG[hinge] || HINGE_CONFIG.top;
    var safeCrease = clamp(crease, 0, 1);
    var safePerspective = Math.max(120, perspective);

    /* graceful fallback: if gsap is missing, show the plain text */
    if (!global.gsap || !global.ScrollTrigger) {
      root.className = 'fold-text';
      root.textContent = text;
      return { destroy: function () {} };
    }
    global.gsap.registerPlugin(global.ScrollTrigger);

    root.className = 'fold-text';
    root.style.setProperty('--fold-text-font-size', typeof fontSize === 'number' ? fontSize + 'px' : fontSize);
    root.style.setProperty('--fold-text-font-weight', fontWeight);
    root.style.setProperty('--fold-text-color', color);

    var sr = document.createElement('span');
    sr.className = 'fold-text-sr-only';
    sr.textContent = text;
    root.appendChild(sr);

    var visual = document.createElement('span');
    visual.className = 'fold-text-visual';
    visual.setAttribute('aria-hidden', 'true');
    root.appendChild(visual);

    function makeSegment(content, split) {
      var seg = document.createElement('span');
      seg.className = 'fold-text-segment';
      if (split) seg.setAttribute('data-fold-split', split);
      seg.style.setProperty('--fold-perspective', safePerspective + 'px');
      var piece = document.createElement('span');
      piece.className = 'fold-text-piece';
      piece.setAttribute('data-fold-hinge', hinge);
      piece.style.transformOrigin = hingeConfig.origin;
      piece.style.setProperty('--fold-crease', 0);
      piece.textContent = content || '\u00A0';
      seg.appendChild(piece);
      return seg;
    }
    function makeWhitespace(value) {
      var frag = document.createDocumentFragment();
      value.split(/(\n)/).forEach(function (part) {
        if (part === '\n') { frag.appendChild(document.createElement('br')); }
        else if (part) {
          var ws = document.createElement('span');
          ws.className = 'fold-text-whitespace';
          ws.textContent = part.replace(/ /g, '\u00A0');
          frag.appendChild(ws);
        }
      });
      return frag;
    }

    if (splitBy === 'line') {
      text.split('\n').forEach(function (line) {
        var lineEl = document.createElement('span');
        lineEl.className = 'fold-text-line';
        lineEl.appendChild(makeSegment(line || '\u00A0', 'line'));
        visual.appendChild(lineEl);
      });
    } else if (splitBy === 'word') {
      text.split(/(\s+)/).forEach(function (part) {
        if (!part) return;
        if (/^\s+$/.test(part)) { visual.appendChild(makeWhitespace(part)); }
        else { visual.appendChild(makeSegment(part)); }
      });
    } else {
      Array.from(text).forEach(function (ch) {
        if (ch === '\n') { visual.appendChild(document.createElement('br')); }
        else { visual.appendChild(makeSegment(ch === ' ' ? '\u00A0' : ch)); }
      });
    }

    var pieces = Array.from(root.querySelectorAll('.fold-text-piece'));
    if (!pieces.length) return { destroy: function () {} };

    var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var activeDuration = reduceMotion ? Math.min(duration, 0.22) : duration;
    var activeStagger = reduceMotion ? Math.min(stagger, 0.02) : stagger;
    var fromVars = {
      opacity: 0,
      rotateX: reduceMotion ? 0 : hingeConfig.rotateX,
      rotateY: reduceMotion ? 0 : hingeConfig.rotateY,
      '--fold-crease': reduceMotion ? 0 : safeCrease,
      transformOrigin: hingeConfig.origin,
      force3D: true
    };
    var toVars = {
      opacity: 1,
      rotateX: 0,
      rotateY: 0,
      '--fold-crease': 0,
      duration: activeDuration,
      ease: reduceMotion ? 'power1.out' : ease,
      stagger: activeStagger,
      clearProps: 'willChange'
    };

    var timeline = null;
    var scrollTrigger = null;
    var hoverHandler = null;

    function killTimeline() {
      if (timeline) { timeline.kill(); timeline = null; }
      global.gsap.killTweensOf(pieces);
    }
    function play(repeat) {
      killTimeline();
      timeline = global.gsap.timeline({ repeat: repeat ? -1 : 0, repeatDelay: repeat ? 0.75 : 0 });
      timeline.fromTo(pieces, fromVars, toVars);
      return timeline;
    }

    if (trigger === 'hover') {
      global.gsap.set(pieces, { opacity: 1, rotateX: 0, rotateY: 0, '--fold-crease': 0, transformOrigin: hingeConfig.origin });
      hoverHandler = function () { play(false); };
      root.addEventListener('mouseenter', hoverHandler);
    } else if (trigger === 'scroll') {
      global.gsap.set(pieces, fromVars);
      scrollTrigger = global.ScrollTrigger.create({
        trigger: root,
        start: scrollStart,
        once: true,
        onEnter: function () { play(false); }
      });
    } else if (trigger === 'loop') {
      play(true);
    } else {
      play(false);
    }

    return {
      destroy: function () {
        if (hoverHandler) root.removeEventListener('mouseenter', hoverHandler);
        if (scrollTrigger) scrollTrigger.kill();
        killTimeline();
      }
    };
  }

  global.FoldText = FoldText;
})(window);
