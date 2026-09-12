/* Project studies and a painting room, with a shared full-size viewer. */
(function () {
  'use strict';

  function prepare(selector, artSelector, titleSelector, descriptionSelector, label) {
    const cards = [...document.querySelectorAll(selector)];
    const collection = cards.map(card => ({
      art: card.querySelector(artSelector),
      title: card.querySelector(titleSelector).textContent,
      description: card.querySelector(descriptionSelector).textContent
    }));
    cards.forEach((card, index) => {
      card.removeAttribute('data-reveal');
      if (card.classList.contains('p-card')) {
        const number = document.createElement('p');
        number.className = 'project-number mono';
        number.textContent = String(index + 1).padStart(2, '0') + ' / PROJECT';
        card.querySelector('.p-card__body').prepend(number);
      }
      const button = document.createElement('button');
      button.type = 'button'; button.className = 'exhibit-action';
      button.innerHTML = '<span>' + label + '</span><span aria-hidden="true">↗</span>';
      button.setAttribute('aria-label', label + '：' + collection[index].title);
      (card.querySelector('.p-card__body') || card).appendChild(button);
      button.addEventListener('click', () => window.FreyViewer.open(collection, index, button));
    });
    return cards;
  }
  const projects = prepare('.p-card', 'svg', '.p-card__title', '.p-card__desc', '项目预览');
  const paintings = prepare('.d-card', 'svg', '.d-card__cap span', '.d-card__cap', '放大作品');
  const paintCounter = document.querySelector('#paint .g-progress-cur');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      if (visible.length) paintCounter.textContent = String(paintings.indexOf(visible[0].target) + 1).padStart(2, '0');
    }, { rootMargin: '-15% 0px -25% 0px', threshold: [0.15, 0.5, 0.8] });
    paintings.forEach(card => observer.observe(card));
  }
  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    gsap.to('.work-hero__bgtext', { y: -70, opacity: 0,
      scrollTrigger: { trigger: '.work-hero', start: 'top top', end: 'bottom top', scrub: true } });
    projects.forEach(card => {
      gsap.from(card.querySelector('.p-card__art'), { clipPath: 'inset(12% 0 12% 0)', y: 45,
        scrollTrigger: { trigger: card, start: 'top 95%', end: 'top 55%', scrub: 0.35 } });
    });
    gsap.from('.painting-room', { clipPath: 'inset(0 4% 0 4%)',
      onUpdate: () => window.dispatchEvent(new Event('frey:scene-frame')),
      scrollTrigger: { trigger: '.painting-room', start: 'top bottom', end: 'top 25%', scrub: 0.4 } });
    paintings.forEach(card => {
      gsap.from(card.querySelector('.d-card__frame'), { y: 55,
        scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 40%', scrub: 0.5 } });
    });
  });
})();
