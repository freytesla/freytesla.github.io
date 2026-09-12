/* ============================================================
   HOBBY — F1 · 红牛赛车 3D 模型展示（three.js / GLTFLoader）
   ------------------------------------------------------------
   · 加载 assets/models/redbull-f1-car.glb（meshopt Web 优化版，
     原始 39.7MB → 2.6MB，EXT_meshopt_compression + KHR_mesh_quantization）
   · 自动居中/落地/按画幅缩放，环境光反射 + 台面光晕
   · 交互：拖动旋转 · 滚轮/双指缩放 · 双击复位
   · 离开视口自动暂停渲染，prefers-reduced-motion 时禁止自转
   · 模型：Oracle Red Bull F1 Car RB19 2023 © Redgrund (Sketchfab) CC-BY-4.0
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from '../vendor/jsm/libs/meshopt_decoder.module.js';

const MODELS = {
  url: 'assets/models/redbull-f1-car.glb'
};

const wrap = document.getElementById('f1-3d');
const canvas = document.getElementById('f1-canvas');
if (!wrap || !canvas) throw new Error('f1-3d stage not found');

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const statusEl = document.getElementById('f1-3d-status');
const loadEl = document.getElementById('f1-3d-load');
const barEl = document.getElementById('f1-3d-bar');
const pctEl = document.getElementById('f1-3d-pct');
const hintEl = document.getElementById('f1-3d-hint');

function setStatus(text) {
  if (statusEl) {
    const dot = document.createElement('i');
    statusEl.textContent = '';
    statusEl.appendChild(dot);
    statusEl.appendChild(document.createTextNode(text));
  }
}
function setProgress(p) {
  const v = Math.max(0, Math.min(100, Math.round(p * 100)));
  if (barEl) barEl.style.width = v + '%';
  if (pctEl) pctEl.textContent = String(v);
}

/* ---------------- renderer / scene ---------------- */
const QA_MODE = new URLSearchParams(location.search).has('qa');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: QA_MODE
  });
} catch (e) {
  wrap.classList.add('is-error');
  setProgress(0);
  if (loadEl) {
    const t = loadEl.querySelector('.f1-3d__load-t');
    if (t) t.textContent = 'webgl 不可用 / WebGL unavailable';
    loadEl.style.position = 'static';
  }
  setStatus('需要支持 WebGL 的浏览器才能查看模型');
  throw e;
}

renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.22;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050706);

const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);

/* ---------------- procedural studio environment ---------------- */
function makeEnvTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const g = c.getContext('2d');

  const sky = g.createLinearGradient(0, 0, 0, 512);
  sky.addColorStop(0, '#131b19');
  sky.addColorStop(0.42, '#07100e');
  sky.addColorStop(0.55, '#04100d');
  sky.addColorStop(1, '#020604');
  g.fillStyle = sky;
  g.fillRect(0, 0, 1024, 512);

  // soft “key” light panels high up — they reflect on the paint
  function softRect(x, y, w, h, color) {
    const rg = g.createRadialGradient(x + w / 2, y + h / 2, 0, x + w / 2, y + h / 2, Math.max(w, h) * 0.62);
    rg.addColorStop(0, color);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = rg;
    g.fillRect(x - 40, y - 40, w + 80, h + 80);
  }
  softRect(120, 60, 260, 150, 'rgba(255,255,255,0.85)');
  softRect(640, 40, 210, 130, 'rgba(255,255,255,0.5)');
  softRect(400, 280, 300, 170, 'rgba(47,201,188,0.22)');   // teal bounce under horizon
  softRect(40, 300, 200, 140, 'rgba(1,132,127,0.14)');

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromEquirectangular(makeEnvTexture()).texture;
pmrem.dispose();

/* ---------------- lights ---------------- */
scene.add(new THREE.HemisphereLight(0xcfe9e5, 0x020504, 0.55));
const key = new THREE.DirectionalLight(0xffffff, 2.1);
key.position.set(6, 9, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0x9be8e0, 0.45);
fill.position.set(-7, 3, 6);
scene.add(fill);
const rim = new THREE.DirectionalLight(0x2fc9bc, 1.4);
rim.position.set(-4, 2.5, -8);
scene.add(rim);

/* ---------------- floor glow ---------------- */
function radialCanvas(stops) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  stops.forEach(function (s) { grad.addColorStop(s[0], s[1]); });
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

const poolTex = radialCanvas([
  [0, 'rgba(47,201,188,0.40)'],
  [0.32, 'rgba(1,132,127,0.16)'],
  [0.65, 'rgba(1,132,127,0.05)'],
  [1, 'rgba(1,132,127,0)']
]);
const pool = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 24),
  new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false })
);
pool.rotation.x = -Math.PI / 2;
pool.position.y = -0.02;
pool.renderOrder = 0;
scene.add(pool);

// faint showroom ring
const ringGeo = new THREE.RingGeometry(7.6, 7.62, 128);
const ringMat = new THREE.MeshBasicMaterial({ color: 0x2fc9bc, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false });
const ring = new THREE.Mesh(ringGeo, ringMat);
ring.rotation.x = -Math.PI / 2;
ring.position.y = -0.015;
ring.renderOrder = 1;
scene.add(ring);

/* ---------------- orbit state ---------------- */
const state = {
  yaw: 0.85,
  pitch: 0.3,
  dist: 12,
  minD: 4,
  maxD: 40,
  baseDist: 12,
  ty: 1.2,
  ready: false
};
const look = new THREE.Vector3(0, state.ty, 0);

function updateCamera() {
  const hp = Math.cos(state.pitch) * state.dist;
  camera.position.set(
    look.x + hp * Math.sin(state.yaw),
    look.y + state.dist * Math.sin(state.pitch),
    look.z + hp * Math.cos(state.yaw)
  );
  camera.lookAt(look);
}

/* ---------------- load & fit the RB19 ---------------- */
const pivot = new THREE.Group();
scene.add(pivot);
let lastInteract = performance.now();

function fitModel(model) {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());

  model.position.x -= center.x;
  model.position.y -= center.y;
  model.position.z -= center.z;

  // normalise so the longest horizontal dimension ~ 9 units
  const longest = Math.max(size.x, size.z, size.y * 1.6);
  const k = 9 / longest;
  model.scale.multiplyScalar(k);

  box.setFromObject(model);
  const min = box.min;
  model.position.y += -min.y;               // wheels on the floor (y = 0)
  box.setFromObject(model);
  const cx = (box.min.x + box.max.x) / 2;
  const cz = (box.min.z + box.max.z) / 2;
  model.position.x -= cx;                   // centre horizontally on the yaw axis
  model.position.z -= cz;

  box.setFromObject(model);
  const s2 = box.getSize(new THREE.Vector3());
  state.ty = (box.min.y + box.max.y) / 2;
  look.y = state.ty;
  // frame by horizontal fill: car length ≈ 74% of the frame width when broadside
  const halfLen = Math.max(s2.x, s2.z) / 2;
  const aspect = Math.max(0.4, (wrap.clientWidth || 16) / (wrap.clientHeight || 9));
  const halfV = THREE.MathUtils.degToRad(camera.fov * 0.5);
  const halfH = Math.atan(Math.tan(halfV) * aspect);
  state.dist = halfLen / Math.tan(halfH * 0.74);
  state.baseDist = state.dist;
  state.minD = state.dist * 0.3;
  state.maxD = state.dist * 3.2;

  // ground the glow pool + ring under the car
  pool.position.x = 0;
  pool.position.z = 0;
  ring.position.x = 0;
  ring.position.z = 0;
  const groundR = state.dist * 0.6;
  ring.scale.set(groundR / 7.6, groundR / 7.6, 1);
  pool.scale.setScalar(0.78);

  if (QA_MODE) {
    window.__f1 = { state: state, boxMin: box.min.clone(), boxMax: box.max.clone(), fov: camera.fov };
  }
}

const loader = new GLTFLoader();
loader.setCrossOrigin('anonymous');
loader.setMeshoptDecoder(MeshoptDecoder);
loader.load(
  MODELS.url,
  function (gltf) {
    pivot.add(gltf.scene);
    gltf.scene.traverse(function (o) {
      if (o.isMesh && o.material) {
        var mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach(function (m) {
          if (m && typeof m.envMapIntensity === 'number') m.envMapIntensity = 1.45;
        });
      }
    });
    fitModel(pivot);
    state.ready = true;
    wrap.classList.add('is-ready');
    setStatus('模型已就绪 · 拖动旋转查看');
    lastInteract = performance.now();
  },
  function (p) {
    if (p && p.total) setProgress(p.loaded / p.total);
    else setProgress(0.5); // indeterminate
  },
  function (err) {
    console.error('[hobby-f1] failed to load', MODELS.url, err);
    wrap.classList.add('is-error');
    setProgress(0);
    const t = loadEl && loadEl.querySelector('.f1-3d__load-t');
    if (t) t.textContent = '模型加载失败 / model failed to load';
    if (barEl) barEl.style.display = 'none';
    if (pctEl) pctEl.textContent = '!';
    setStatus('3D 模型读取失败，请刷新重试');
    lastInteract = performance.now();
  }
);

/* ---------------- interaction ---------------- */
let dragging = false;
let lastX = 0, lastY = 0;
const pointers = new Map();
let pinchDist = 0;

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

function onDown(e) {
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 1) {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    wrap.classList.add('is-drag');
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
  } else if (pointers.size === 2) {
    dragging = false;
    const pts = Array.from(pointers.values());
    pinchDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
  }
  lastInteract = performance.now();
}
function onMove(e) {
  if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointers.size === 2) {
    const pts = Array.from(pointers.values());
    const d = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    if (pinchDist > 0) {
      state.dist = clamp(state.dist * (pinchDist / d), state.minD, state.maxD);
      lastInteract = performance.now();
    }
    pinchDist = d;
    return;
  }
  if (!dragging || pointers.size !== 1) return;
  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;
  state.yaw -= dx * 0.006;
  state.pitch = clamp(state.pitch - dy * 0.005, 0.06, 1.25);
  lastInteract = performance.now();
}
function onUp(e) {
  pointers.delete(e.pointerId);
  if (pointers.size === 0) {
    dragging = false;
    pinchDist = 0;
    wrap.classList.remove('is-drag');
  } else if (pointers.size === 1) {
    pinchDist = 0;
  }
  lastInteract = performance.now();
}

canvas.addEventListener('pointerdown', onDown);
canvas.addEventListener('pointermove', onMove);
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', onUp);

function onWheel(e) {
  e.preventDefault();
  e.stopPropagation();
  state.dist = clamp(state.dist * Math.exp(e.deltaY * 0.0012), state.minD, state.maxD);
  lastInteract = performance.now();
}
canvas.addEventListener('wheel', onWheel, { passive: false });

function resetView() {
  state.yaw = 0.85;
  state.pitch = 0.3;
  state.dist = state.baseDist || state.dist;
  lastInteract = performance.now();
}
canvas.addEventListener('dblclick', resetView);

/* ---------------- visibility + sizing ---------------- */
function resize() {
  const w = wrap.clientWidth || 1;
  const h = wrap.clientHeight || 1;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(wrap);
resize();

let visible = true;
if ('IntersectionObserver' in window) {
  new IntersectionObserver(function (entries) {
    visible = entries.some(function (en) { return en.isIntersecting; });
  }, { threshold: 0.02 }).observe(wrap);
}

/* ---------------- render loop ---------------- */
/* turntable auto-spin (rad/s): keeps turning, only paused while dragging */
const AUTO_SPIN = reduced ? 0.22 : 0.42;
let lastFrameT = performance.now();

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, Math.max(0, (now - lastFrameT) / 1000));
  lastFrameT = now;
  if (!visible) return;
  if (state.ready && !dragging && now - lastInteract > 900) {
    state.yaw += AUTO_SPIN * dt;
  }
  updateCamera();
  renderer.render(scene, camera);
}
requestAnimationFrame(frame);
