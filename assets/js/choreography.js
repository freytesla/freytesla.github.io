/* Secondary chapters have their own motion language; the opening stays separate. */
(function () {
  'use strict';
  function boot() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      const cleanups = [];
      const notify = () => window.dispatchEvent(new Event('frey:scene-frame'));
      const scroll = (trigger, start = 'top 90%', end = 'top 38%') => ({ trigger, start, end, scrub: 0.45, invalidateOnRefresh: true });
      // Animate a wrapper so hover, physics and existing reveal transforms stay independent.
      function frame(element, className) {
        const wrapper = document.createElement('div');
        wrapper.className = className;
        element.before(wrapper); wrapper.appendChild(element);
        cleanups.push(() => { wrapper.before(element); wrapper.remove(); });
        return wrapper;
      }
      const choose = document.querySelector('#choose');
      if (choose) {
        const cards = [...choose.querySelectorAll('.card')];
        cards.forEach((card, index) => {
          card.classList.add('is-in');
          gsap.fromTo(card, { xPercent: index ? 16 : -16, opacity: 0.35 }, { xPercent: 0, opacity: 1,
            scrollTrigger: scroll(choose.querySelector('.choose__grid'), 'top 94%', 'top 48%') });
        });
        gsap.from(choose.querySelector('.sec-head__title'), { y: 65, clipPath: 'inset(100% 0 0)',
          scrollTrigger: scroll(choose, 'top 94%', 'top 45%') });
      }
      const ask = document.querySelector('.ask-section');
      if (ask) {
        ask.querySelector('.ask-right').classList.add('is-in');
        gsap.to(ask, { '--letter-line': 1, scrollTrigger: scroll(ask, 'top 95%', 'top 65%') });
        gsap.fromTo(ask.querySelector('.ask-right'), { y: 100, rotation: -7, opacity: 0.15 }, { y: 0, rotation: 0, opacity: 1,
          scrollTrigger: scroll(ask, 'top 92%', 'top 25%') });
        gsap.from(ask.querySelector('.ask-title'), { x: -40, opacity: 0,
          scrollTrigger: scroll(ask, 'top 88%', 'top 42%') });
      }
      document.querySelectorAll('.hobby-sec__title, .gallery__title').forEach((title, index) => {
        gsap.from(title, {
          x: index % 2 ? 70 : -70,
          opacity: 0.1,
          clipPath: index % 2 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)',
          scrollTrigger: scroll(title.closest('section') || title, 'top 94%', 'top 42%')
        });
      });
      const tickets = document.querySelector('.tickets');
      if (tickets) {
        const stage = frame(tickets, 'curtain-stage');
        ['left', 'right'].forEach(side => {
          const sheet = document.createElement('div');
          sheet.className = 'curtain-sheet curtain-sheet--' + side;
          sheet.setAttribute('aria-hidden', 'true'); stage.appendChild(sheet);
          gsap.to(sheet, { scaleX: 0, ease: 'power2.inOut', scrollTrigger: scroll(stage, 'top 94%', 'top 35%') });
        });
        // Never conceal a keyboard-focused ticket or control beneath a curtain.
        const focus = () => gsap.set(stage.querySelectorAll('.curtain-sheet'), { scaleX: 0 });
        stage.addEventListener('focusin', focus);
      }
      const deck = document.querySelector('.deck');
      if (deck) {
        const stage = frame(deck, 'record-stage');
        const reveal = gsap.fromTo(stage, { clipPath: 'circle(12% at 35% 50%)' }, { clipPath: 'circle(100% at 35% 50%)',
          onUpdate: notify,
          scrollTrigger: scroll(stage, 'top 98%', 'top 48%') });
        stage.addEventListener('focusin', () => {
          reveal.scrollTrigger.disable();
          gsap.set(stage, { clipPath: 'none' });
        });
        stage.addEventListener('focusout', event => {
          if (!stage.contains(event.relatedTarget)) reveal.scrollTrigger.enable();
        });
      }
      const people = document.querySelector('.people');
      if (people) gsap.from(people, { y: 60, opacity: 0.3, scrollTrigger: scroll(people) });
      // Wrapping changes layout measurements; all existing scene triggers refresh too.
      ScrollTrigger.refresh();
      return () => cleanups.reverse().forEach(cleanup => cleanup());
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
