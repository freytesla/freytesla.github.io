/* Shared, keyboard-accessible viewer for notes, project previews and paintings. */
(function () {
  'use strict';
  let dialog, media, title, description, count, previous, next;
  let entries = [], active = 0, opener, stoppedLenis = false;
  let serial = 0;
  function render() {
    const entry = entries[active];
    const art = entry.art.cloneNode(true);
    // Inline SVG gradients need unique IDs when the original stays in the page.
    const ids = new Map();
    art.querySelectorAll('[id]').forEach(node => {
      const old = node.id, id = 'viewer-' + (++serial);
      ids.set(old, id); node.id = id;
    });
    art.querySelectorAll('*').forEach(node => {
      [...node.attributes].forEach(attr => {
        let value = attr.value;
        ids.forEach((id, old) => { value = value.replaceAll('url(#' + old + ')', 'url(#' + id + ')'); });
        if (value !== attr.value) node.setAttribute(attr.name, value);
      });
    });
    media.replaceChildren(art);
    title.textContent = entry.title;
    description.textContent = entry.description || '';
    count.textContent = String(active + 1).padStart(2, '0') + ' / ' + String(entries.length).padStart(2, '0');
    previous.disabled = active === 0;
    next.disabled = active === entries.length - 1;
  }
  function move(direction) { active = Math.max(0, Math.min(entries.length - 1, active + direction)); render(); }
  function create() {
    dialog = document.createElement('dialog');
    dialog.className = 'art-viewer';
    dialog.setAttribute('aria-labelledby', 'viewer-title');
    dialog.setAttribute('data-lenis-prevent', '');
    dialog.innerHTML = '<div class="art-viewer__toolbar"><span class="mono">CLOSER LOOK</span><button type="button" class="viewer-close">关闭 ×</button></div><div class="art-viewer__media"></div><div class="art-viewer__info"><div><h2 id="viewer-title"></h2><p class="art-viewer__description"></p></div><div class="art-viewer__controls"><button type="button" aria-label="上一件">←</button><span class="mono" aria-live="polite"></span><button type="button" aria-label="下一件">→</button></div></div>';
    document.body.appendChild(dialog);
    media = dialog.querySelector('.art-viewer__media');
    title = dialog.querySelector('h2');
    description = dialog.querySelector('.art-viewer__description');
    count = dialog.querySelector('[aria-live]');
    previous = dialog.querySelector('[aria-label="上一件"]');
    next = dialog.querySelector('[aria-label="下一件"]');
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    dialog.querySelector('.viewer-close').addEventListener('click', () => dialog.close());
    dialog.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault(); move(event.key === 'ArrowRight' ? 1 : -1);
      }
    });
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    dialog.addEventListener('close', () => {
      document.documentElement.classList.remove('viewer-open');
      if (stoppedLenis && window.lenis) window.lenis.start();
      if (opener) opener.focus({ preventScroll: true });
    });
  }
  window.FreyViewer = {
    open(collection, index, button) {
      if (!collection.length) return;
      if (!dialog) create();
      entries = collection; active = index; opener = button;
      render();
      stoppedLenis = !!(window.lenis && !window.lenis.isStopped);
      if (stoppedLenis) window.lenis.stop();
      document.documentElement.classList.add('viewer-open');
      dialog.showModal();
      dialog.querySelector('.viewer-close').focus();
    }
  };
})();
