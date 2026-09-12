/* ============================================================
   FREY v2 — home: 3D necklace / slogan roller / photo wall
   three.js 由 <script src="assets/vendor/three.min.js"> 提供全局 THREE（UMD）
   —— 不依赖 ES Module，file:// 直接双击打开也能工作
   ============================================================ */
const THREE = window.THREE;
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch (e) { return false; }
}

/* ============================================================
   1) HERO — labradorite necklace (procedural, draggable)
   ============================================================ */
function initNecklace() {
  const wrap = document.getElementById('necklace');
  const canvas = document.getElementById('necklace-canvas');
  if (!wrap || !canvas) return;

  const fallback = () => {
    const img = document.createElement('img');
    img.src = 'assets/img/necklace.svg';
    img.alt = '拉长石项链';
    img.style.cssText = 'position:absolute;inset:0;margin:auto;width:56%;height:auto;opacity:.85;';
    wrap.appendChild(img);
  };

  // 降级：reduced-motion / three 未加载 / WebGL 不可用
  if (reduced || !THREE || !webglOK()) { fallback(); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (err) {
    console.warn('Frey: WebGL 初始化失败，使用静态项链占位', err);
    fallback();
    return;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 40);
  camera.position.set(0, 0.1, 5.4);

  /* ---- studio environment (for iridescent reflections) ---- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const soft = (x, y, z, s, color, gain) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, y, z);
    m.material.color.multiplyScalar(gain);
    env.add(m);
  };
  soft(0, 6, 0, 6, 0xffffff, 3.2);      // ceiling softbox
  soft(-6, 1, 3, 5, 0xd8fff8, 2.6);     // green fill
  soft(6, -1, 2, 5, 0xffffff, 2.2);     // white rim
  soft(0, 0, -7, 8, 0xffffff, 1.4);     // back
  const envTex = pmrem.fromScene(env, 0.02).texture;
  scene.environment = envTex;

  /* ---- lights ---- */
  scene.add(new THREE.AmbientLight(0xffffff, 0.35));
  const key = new THREE.DirectionalLight(0xffffff, 2.1);
  key.position.set(2, 4, 3);
  scene.add(key);
  const fill = new THREE.PointLight(0x2fd4c8, 2.0, 12);
  fill.position.set(-1.4, 0.7, 2.2);
  scene.add(fill);
  const rim = new THREE.DirectionalLight(0x9be8e0, 1.5);
  rim.position.set(-2, -3, -4);
  scene.add(rim);

  const group = new THREE.Group();
  group.scale.setScalar(0.85);
  group.position.y = 0.12;
  scene.add(group);

  /* ---- chain: 72 little torus links on a circle ---- */
  const R = 1.5;
  const N = 72;
  const linkGeo = new THREE.TorusGeometry(0.088, 0.034, 10, 24);
  const silver = new THREE.MeshStandardMaterial({ color: 0xdfe5e2, metalness: 1, roughness: 0.32, envMapIntensity: 1.4 });
  const links = new THREE.InstancedMesh(linkGeo, silver, N);
  const up = new THREE.Vector3(0, 0, 1);
  const tang = new THREE.Vector3();
  const dummy = new THREE.Object3D();
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    dummy.position.set(Math.cos(a) * R, Math.sin(a) * R, 0);
    tang.set(-Math.sin(a), Math.cos(a), 0).normalize();
    dummy.quaternion.setFromUnitVectors(up, tang);
    dummy.updateMatrix();
    links.setMatrixAt(i, dummy.matrix);
  }
  links.instanceMatrix.needsUpdate = true;
  group.add(links);

  /* ---- pendant: bail + bezel + labradorite cabochon ---- */
  const pendant = new THREE.Group();
  pendant.position.set(0, -R, 0);

  const bail = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.042, 10, 28), silver);
  bail.position.y = -0.08;
  bail.rotation.x = Math.PI / 2;
  pendant.add(bail);

  const gemProfile = [
    [0, 0.60], [0.26, 0.55], [0.46, 0.42], [0.55, 0.22],
    [0.52, 0.02], [0.40, -0.18], [0.22, -0.36], [0.10, -0.46], [0, -0.52]
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const gemGeo = new THREE.LatheGeometry(gemProfile, 48);
  const labradorite = new THREE.MeshPhysicalMaterial({
    color: 0xd6e0db,
    metalness: 0.08,
    roughness: 0.10,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
    iridescence: 1,
    iridescenceIOR: 1.35,
    iridescenceThicknessRange: [200, 900],
    envMapIntensity: 2.2,
    flatShading: true
  });
  const gem = new THREE.Mesh(gemGeo, labradorite);
  gem.position.y = -0.58;
  gem.rotation.y = Math.PI / 4;
  pendant.add(gem);

  const bezel = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.05, 10, 36), silver);
  bezel.position.y = -0.06;
  bezel.rotation.x = Math.PI / 2;
  pendant.add(bezel);

  group.add(pendant);

  /* ---- sparkles ---- */
  const spkGeo = new THREE.BufferGeometry();
  const spkCount = 90;
  const spkPos = new Float32Array(spkCount * 3);
  for (let i = 0; i < spkCount; i++) {
    const r = 1.7 + Math.random() * 1.4;
    const t = Math.random() * Math.PI * 2;
    const p = Math.acos(2 * Math.random() - 1);
    spkPos[i * 3] = r * Math.sin(p) * Math.cos(t);
    spkPos[i * 3 + 1] = r * Math.cos(p) - 0.2;
    spkPos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
  }
  spkGeo.setAttribute('position', new THREE.BufferAttribute(spkPos, 3));
  const spkMat = new THREE.PointsMaterial({ color: 0x9deee5, size: 0.028, transparent: true, opacity: 0.8, depthWrite: false });
  const sparkles = new THREE.Points(spkGeo, spkMat);
  scene.add(sparkles);

  /* ---- soft shadow under necklace ---- */
  (function () {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const cx = cv.getContext('2d');
    const gr = cx.createRadialGradient(128, 128, 8, 128, 128, 126);
    gr.addColorStop(0, 'rgba(1,90,86,0.5)');
    gr.addColorStop(0.6, 'rgba(1,90,86,0.16)');
    gr.addColorStop(1, 'rgba(1,90,86,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 256, 256);
    const tex = new THREE.CanvasTexture(cv);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(3.8, 3.8),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -2.35, 0);
    scene.add(shadow);
  })();

  /* ---- pose + interaction ---- */
  let rotY = -0.55, rotX = 0.34, tRotY = rotY, tRotX = rotX;
  let dragging = false, lastX = 0, lastY = 0;

  canvas.style.touchAction = 'none';
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true; lastX = e.clientX; lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX, dy = e.clientY - lastY;
    lastX = e.clientX; lastY = e.clientY;
    tRotY += dx * 0.006;
    tRotX = Math.max(-0.9, Math.min(0.9, tRotX + dy * 0.005));
  });
  const end = () => { dragging = false; };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);

  /* ---- resize ---- */
  const resize = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap);

  /* ---- pause when offscreen ---- */
  let visible = true;
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0.05 });
  io.observe(wrap);

  /* ---- render loop ---- */
  const clock = new THREE.Clock();
  function tick() {
    requestAnimationFrame(tick);
    const t = clock.getElapsedTime();
    if (!dragging) {
      tRotY += 0.0028;
      tRotX += (0.34 - tRotX) * 0.01;
    }
    rotY += (tRotY - rotY) * 0.16;
    rotX += (tRotX - rotX) * 0.16;
    group.rotation.set(rotX, rotY, 0);
    group.position.y = 0.12 + Math.sin(t * 1.3) * 0.055;
    sparkles.rotation.y = t * 0.05;
    sparkles.rotation.x = Math.sin(t * 0.3) * 0.15;
    spkMat.opacity = 0.55 + Math.sin(t * 2.2) * 0.25;
    if (visible) renderer.render(scene, camera);
  }
  tick();
}

/* ============================================================
   2) SLOGAN — centered rolling words
   ============================================================ */


/* ============================================================
   3) PHOTO WALL — move mouse to unfold polaroids
   ============================================================ */
const NECKLACE_GREEN =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 300"><path d="M30 8 C 62 72, 54 128, 110 150 C 166 128, 158 72, 190 8" fill="none" stroke="#2FC9BC" stroke-width="3"/><path d="M110 158 L 138 196 L 110 234 L 82 196 Z" fill="none" stroke="#2FC9BC" stroke-width="3"/><circle cx="110" cy="238" r="6" fill="#2FC9BC"/></svg>';

function artSVG(i) {
  const palettes = [
    ['#01847F', '#0A0D0C'], ['#2FC9BC', '#F5F6F1'], ['#0A0D0C', '#01847F'],
    ['#9BE8E0', '#0A0D0C'], ['#F5F6F1', '#2FC9BC'], ['#015A56', '#9BE8E0']
  ];
  const [a, b] = palettes[i % palettes.length];
  const shapes = [
    `<circle cx="60" cy="45" r="26" fill="${a}"/><rect x="70" y="60" width="50" height="40" fill="${b}"/>`,
    `<path d="M20 20 L100 40 L20 60 Z" fill="${a}"/><circle cx="110" cy="80" r="16" fill="${b}"/>`,
    `<rect x="30" y="30" width="60" height="60" rx="8" fill="${a}"/><rect x="52" y="14" width="34" height="92" rx="6" fill="${b}"/>`,
    `<circle cx="60" cy="60" r="34" fill="${a}"/><circle cx="60" cy="60" r="14" fill="${b}"/>`,
    `<path d="M20 80 C 40 30, 80 30, 100 80 Z" fill="${a}"/><circle cx="110" cy="34" r="12" fill="${b}"/>`,
    `<rect x="16" y="16" width="88" height="88" fill="none" stroke="${a}" stroke-width="8"/><rect x="40" y="40" width="40" height="40" fill="${b}"/>`
  ];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 90">${shapes[i % shapes.length]}</svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

/* ============================================================
   ImageTrail (React Bits, vanilla port) — photos follow cursor
   variants: 1 (classic trail) / 7 (wall queue, default)
   ============================================================ */
function itLerp(a, b, n) { return (1 - n) * a + n * b; }
function itPointer(e, rect) {
  let cx = 0, cy = 0;
  if (e.touches && e.touches.length > 0) { cx = e.touches[0].clientX; cy = e.touches[0].clientY; }
  else { cx = e.clientX; cy = e.clientY; }
  return { x: cx - rect.left, y: cy - rect.top };
}
function itDist(p1, p2) { return Math.hypot(p1.x - p2.x, p1.y - p2.y); }

class ImageItem {
  constructor(el) {
    this.DOM = { el: el, inner: el.querySelector('.content__img-inner') };
    this.defaultStyle = { scale: 1, x: 0, y: 0, opacity: 0 };
    this.rect = null;
    this.resize = () => { gsap.set(this.DOM.el, this.defaultStyle); this.getRect(); };
    window.addEventListener('resize', this.resize);
    this.getRect();
  }
  getRect() { this.rect = this.DOM.el.getBoundingClientRect(); }
}

class ImageTrailVariant1 {
  constructor(container) {
    this.container = container;
    this.DOM = { el: container };
    this.images = [...container.querySelectorAll('.content__img')].map(el => new ImageItem(el));
    this.imagesTotal = this.images.length;
    this.imgPosition = 0;
    this.zIndexVal = 1;
    this.activeImagesCount = 0;
    this.isIdle = true;
    this.threshold = 80;
    this.mousePos = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.cacheMousePos = { x: 0, y: 0 };
    const move = ev => { const r = container.getBoundingClientRect(); this.mousePos = itPointer(ev, r); };
    container.addEventListener('mousemove', move);
    container.addEventListener('touchmove', move);
    const init = ev => {
      const r = container.getBoundingClientRect();
      this.mousePos = itPointer(ev, r);
      this.cacheMousePos = { ...this.mousePos };
      requestAnimationFrame(() => this.render());
      container.removeEventListener('mousemove', init);
      container.removeEventListener('touchmove', init);
    };
    container.addEventListener('mousemove', init);
    container.addEventListener('touchmove', init);
  }
  render() {
    const distance = itDist(this.mousePos, this.lastMousePos);
    this.cacheMousePos.x = itLerp(this.cacheMousePos.x, this.mousePos.x, 0.1);
    this.cacheMousePos.y = itLerp(this.cacheMousePos.y, this.mousePos.y, 0.1);
    if (distance > this.threshold) { this.showNextImage(); this.lastMousePos = { ...this.mousePos }; }
    if (this.isIdle && this.zIndexVal !== 1) this.zIndexVal = 1;
    requestAnimationFrame(() => this.render());
  }
  showNextImage() {
    ++this.zIndexVal;
    this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
    const img = this.images[this.imgPosition];
    gsap.killTweensOf(img.DOM.el);
    gsap.timeline({ onStart: () => this.onImageActivated(), onComplete: () => this.onImageDeactivated() })
      .fromTo(img.DOM.el,
        { opacity: 1, scale: 1, zIndex: this.zIndexVal, x: this.cacheMousePos.x - img.rect.width / 2, y: this.cacheMousePos.y - img.rect.height / 2 },
        { duration: 0.4, ease: 'power1', x: this.mousePos.x - img.rect.width / 2, y: this.mousePos.y - img.rect.height / 2 }, 0)
      .to(img.DOM.el, { duration: 0.4, ease: 'power3', opacity: 0, scale: 0.2 }, 0.4);
  }
  onImageActivated() { this.activeImagesCount++; this.isIdle = false; }
  onImageDeactivated() { this.activeImagesCount--; if (this.activeImagesCount === 0) this.isIdle = true; }
}

function itPrevPos(position, offset, arr) {
  const realOffset = Math.abs(offset) % arr.length;
  return position - realOffset >= 0 ? position - realOffset : arr.length - (realOffset - position);
}
class ImageTrailVariant7 {
  constructor(container) {
    this.container = container;
    this.DOM = { el: container };
    this.images = [...container.querySelectorAll('.content__img')].map(el => new ImageItem(el));
    this.imagesTotal = this.images.length;
    this.imgPosition = 0;
    this.zIndexVal = 1;
    this.activeImagesCount = 0;
    this.isIdle = true;
    this.threshold = 80;
    this.mousePos = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.cacheMousePos = { x: 0, y: 0 };
    this.visibleImagesCount = 0;
    this.visibleImagesTotal = Math.min(9, this.imagesTotal - 1);
    const move = ev => { const r = container.getBoundingClientRect(); this.mousePos = itPointer(ev, r); };
    container.addEventListener('mousemove', move);
    container.addEventListener('touchmove', move);
    const init = ev => {
      const r = container.getBoundingClientRect();
      this.mousePos = itPointer(ev, r);
      this.cacheMousePos = { ...this.mousePos };
      requestAnimationFrame(() => this.render());
      container.removeEventListener('mousemove', init);
      container.removeEventListener('touchmove', init);
    };
    container.addEventListener('mousemove', init);
    container.addEventListener('touchmove', init);
  }
  render() {
    const distance = itDist(this.mousePos, this.lastMousePos);
    this.cacheMousePos.x = itLerp(this.cacheMousePos.x, this.mousePos.x, 0.3);
    this.cacheMousePos.y = itLerp(this.cacheMousePos.y, this.mousePos.y, 0.3);
    if (distance > this.threshold) { this.showNextImage(); this.lastMousePos = { ...this.mousePos }; }
    if (this.isIdle && this.zIndexVal !== 1) this.zIndexVal = 1;
    requestAnimationFrame(() => this.render());
  }
  showNextImage() {
    ++this.zIndexVal;
    this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
    const img = this.images[this.imgPosition];
    ++this.visibleImagesCount;
    gsap.killTweensOf(img.DOM.el);
    const scaleValue = gsap.utils.random(0.5, 1.6);
    gsap.timeline({ onStart: () => this.onImageActivated(), onComplete: () => this.onImageDeactivated() })
      .fromTo(img.DOM.el,
        { scale: scaleValue - Math.max(gsap.utils.random(0.2, 0.6), 0), rotationZ: 0, opacity: 1, zIndex: this.zIndexVal, x: this.cacheMousePos.x - img.rect.width / 2, y: this.cacheMousePos.y - img.rect.height / 2 },
        { duration: 0.4, ease: 'power3', scale: scaleValue, rotationZ: gsap.utils.random(-3, 3), x: this.mousePos.x - img.rect.width / 2, y: this.mousePos.y - img.rect.height / 2 }, 0);
    if (this.visibleImagesCount >= this.visibleImagesTotal) {
      const lastInQueue = itPrevPos(this.imgPosition, this.visibleImagesTotal, this.images);
      const oldImg = this.images[lastInQueue];
      gsap.to(oldImg.DOM.el, {
        duration: 0.4, ease: 'power4', opacity: 0, scale: 1.3,
        onComplete: () => { if (this.activeImagesCount === 0) this.isIdle = true; }
      });
    }
  }
  onImageActivated() { this.activeImagesCount++; this.isIdle = false; }
  onImageDeactivated() { this.activeImagesCount--; }
}

function initPhotoWall() {
  const wall = document.getElementById('photo-wall');
  if (!wall) return;
  const notes = [
    ['assets/img/labradorite.png', '拉长石', 'Labradorite'],
    [artSVG(0), '圆与方', '形状习作'],
    [artSVG(1), '方向', '形状习作'],
    [artSVG(2), '叠放', '形状习作'],
    [artSVG(3), '留白', '形状习作'],
    [artSVG(5), '边界', '形状习作']
  ];
  const collection = [];
  notes.forEach(([src, title, description], index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'fragment';
    button.style.setProperty('--turn', (index % 2 ? 3 : -3) + 'deg');
    button.setAttribute('aria-label', '放大查看：' + title);
    const img = document.createElement('img');
    img.src = src; img.alt = title; img.className = 'fragment__image'; img.loading = 'lazy';
    const caption = document.createElement('span');
    caption.className = 'fragment__caption mono';
    caption.innerHTML = '<span>' + title + '</span><span>' + String(index + 1).padStart(2, '0') + ' ↗</span>';
    button.append(img, caption); wall.appendChild(button);
    collection.push({ art: img, title, description });
    button.addEventListener('click', () => window.FreyViewer?.open(collection, index, button));
  });
  if (window.gsap && window.ScrollTrigger) {
    gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
      wall.querySelectorAll('.fragment').forEach((card, i) => {
        gsap.from(card, { y: 80 + i * 10, rotation: i % 2 ? 12 : -12, opacity: 0,
          scrollTrigger: { trigger: card, start: 'top 105%', end: 'top 65%', scrub: 0.5 } });
      });
      gsap.from('#choose', { clipPath: 'inset(0 5% 0 5%)',
        scrollTrigger: { trigger: '#choose', start: 'top bottom', end: 'top 30%', scrub: 0.4 } });
    });
  }
}


/* ============================================================
   2.5) SLOGAN — seamless marquee + FoldText (React Bits vanilla port)
   ============================================================ */
function initMarquee() {
  const marquee = document.querySelector('.slogan__marquee');
  const track = marquee && marquee.querySelector('.marquee__track');
  const groups = track ? Array.from(track.querySelectorAll('.mq-group')) : [];
  if (!track || !groups.length) return;

  const template = groups[0];
  groups.slice(1).forEach(group => group.remove());

  let resizeFrame = null;

  function fillTrack() {
    const viewport = marquee.clientWidth;
    const unitWidth = template.getBoundingClientRect().width;
    if (!viewport || !unitWidth) return;

    track.querySelectorAll('[data-marquee-clone]').forEach(clone => clone.remove());

    /* Keep one full copy beyond the viewport so the reset point is never blank. */
    const copies = Math.max(2, Math.ceil(viewport / unitWidth) + 2);
    for (let i = 1; i < copies; i += 1) {
      const clone = template.cloneNode(true);
      clone.setAttribute('data-marquee-clone', '');
      track.appendChild(clone);
    }

    track.style.setProperty('--marquee-shift', '-' + unitWidth + 'px');
    track.style.animationDuration = Math.max(22, unitWidth / 28) + 's';
  }

  function scheduleFill() {
    if (resizeFrame) cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(function () {
      resizeFrame = null;
      fillTrack();
    });
  }

  window.addEventListener('resize', scheduleFill, { passive: true });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleFill);
  scheduleFill();
}

/* ============================================================
   SLOGAN — FoldText (React Bits vanilla port)
   ============================================================ */
function initFoldText() {
  const el = document.getElementById('slogan-fold');
  if (!el || !window.FoldText) return;
  window.FoldText(el, {
    text: 'Launch with clarity',
    splitBy: 'char',
    hinge: 'top',
    trigger: reduced ? 'mount' : 'manual',
    duration: 0.65,
    stagger: 0.045,
    ease: 'power3.out',
    perspective: 700,
    creaseShading: 0.55,
    fontSize: 'clamp(3rem, 10vw, 7rem)',
    fontWeight: 800,
    color: '#f7f2e8',
    scrollStart: 'top 55%'
  });
}

/* A faceted aperture links the necklace to the unfolding typography. */
function initOpeningTransition() {
  const opening = document.getElementById('opening');
  if (!opening || !window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  gsap.matchMedia().add('(prefers-reduced-motion: no-preference)', () => {
    const hero = opening.querySelector('.hero');
    const slogan = opening.querySelector('.slogan');
    const pieces = slogan.querySelectorAll('.fold-text-piece');
    const necklace = hero.querySelector('.hero__stage');
    const necklaceNext = necklace && necklace.nextSibling;
    // Keep the same live canvas and physics instance above both scenes.
    // The shared sticky stage carries it away with the slogan at the end.
    const labels = necklace ? [...necklace.querySelectorAll('.hero__stage-hint, .hero__stage-tag')] : [];
    if (necklace) {
      labels.forEach(label => hero.appendChild(label));
      opening.querySelector('.opening__stage').appendChild(necklace);
    }
    opening.classList.add('opening--animated');
    const timeline = gsap.timeline({
      defaults: { ease: 'none' },
      onUpdate: () => window.dispatchEvent(new Event('frey:scene-frame')),
      scrollTrigger: {
        trigger: opening,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.45,
        invalidateOnRefresh: true
      }
    });
    timeline
      .to(hero, { scale: 1.06, opacity: 0.3, duration: 0.65 }, 0.06)
      .fromTo(slogan, { clipPath: 'polygon(50% 55%,50% 55%,50% 55%,50% 55%)' },
        { clipPath: 'polygon(50% 37%,50.3% 55%,50% 73%,49.7% 55%)', duration: 0.14 }, 0.04)
      .to(slogan, { clipPath: 'polygon(50% -65%,170% 55%,50% 175%,-70% 55%)', duration: 0.54, ease: 'power2.inOut' }, 0.18)
      .fromTo(slogan.querySelector('.slogan__center'), { y: 48, scale: 0.94 }, { y: 0, scale: 1, duration: 0.4 }, 0.48)
      .fromTo(pieces, { opacity: 0, rotateX: -85, '--fold-crease': 0.45 },
        { opacity: 1, rotateX: 0, '--fold-crease': 0, stagger: 0.009, duration: 0.22, ease: 'power2.out' }, 0.48)
      .fromTo(slogan.querySelector('.slogan__marquee'), { yPercent: -105, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.18 }, 0.68)
      .fromTo(slogan.querySelector('.slogan__sub'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.16 }, 0.76)
      .to({}, { duration: 0.12 });
    if (necklace) {
      timeline.fromTo(necklace, { opacity: 1 },
        { opacity: 0.28, duration: 0.36, ease: 'power1.inOut' }, 0.35);
    }
    return () => {
      opening.classList.remove('opening--animated');
      if (necklace) {
        hero.insertBefore(necklace, necklaceNext);
        labels.forEach(label => necklace.appendChild(label));
      }
    };
  });
}

/* ============================================================
   boot — 每一项独立 try/catch，任何一个失败不影响其它
   ============================================================ */
window.addEventListener('DOMContentLoaded', () => {
  // 以后把项链换成 three.js / GLB 模型时：想让加载页等模型就绪再掀幕，就在
  // initNecklace() 里注册 FreyBoot.add(gltfPromise, { weight: 3, progress: fn })
  // （用法见 assets/js/ui.js 顶部 FreyBoot 说明）
  // 项链已换成物理版（assets/js/necklace-physics.js，由 index.html 以 ESM 加载）
  try { initMarquee(); } catch (e) { console.warn('Frey: marquee init failed', e); }
  try { initFoldText(); } catch (e) { console.warn('Frey: fold text init failed', e); }
  try { initOpeningTransition(); } catch (e) { console.warn('Frey: opening transition init failed', e); }
  try { initPhotoWall(); } catch (e) { console.warn('Frey: photo wall init failed', e); }
});
