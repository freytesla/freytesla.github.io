/* ScrollFloat — React Bits 组件纯 JS 移植（GSAP ScrollTrigger scrub 逐字浮起） */
window.ScrollFloat = function (el, opts) {
  'use strict';
  if (!el) return;
  var o = opts || {};
  var text = o.text != null ? String(o.text) : '';
  var duration = o.animationDuration != null ? o.animationDuration : 1;
  var ease = o.ease || 'back.inOut(2)';
  var start = o.scrollStart || 'center bottom+=50%';
  var end = o.scrollEnd || 'bottom bottom-=40%';
  var stagger = o.stagger != null ? o.stagger : 0.03;

  el.classList.add('scroll-float');
  var wrap = document.createElement('span');
  wrap.className = 'scroll-float-text';
  var chars = text.split('').map(function (ch) {
    var s = document.createElement('span');
    s.className = 'char';
    s.textContent = ch === ' ' ? '\u00A0' : ch;
    wrap.appendChild(s);
    return s;
  });
  el.appendChild(wrap);

  if (window.gsap && window.ScrollTrigger) {
    gsap.fromTo(chars, {
      willChange: 'opacity, transform',
      opacity: 0,
      yPercent: 120,
      scaleY: 2.3,
      scaleX: 0.7,
      transformOrigin: '50% 0%'
    }, {
      duration: duration,
      ease: ease,
      opacity: 1,
      yPercent: 0,
      scaleY: 1,
      scaleX: 1,
      stagger: stagger,
      scrollTrigger: { trigger: el, start: start, end: end, scrub: true }
    });
  }
};
