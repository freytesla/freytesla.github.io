/* ============================================================
   FREY — Labradorite Necklace · Physics Lab（物理项链演示）
   ------------------------------------------------------------
   · 链子：64 个 Verlet 质点 + 距离约束（两端挂在展示架上），细银绳蛇骨链
     重力让整条链自然下垂、回弹、摆动（猫垂线）
   · 吊坠：挂在链最低点（中点），随链切线方向自然摆动
   · 交互：按住链子/吊坠拖动 → 松手重力回弹、可甩动
   · 模型：自动尝试加载 assets/models/necklace.glb 或 pendant.glb
     （Blender 导出，见 NECKLACE-PHYSICS.md）；找不到就用程序化吊坠兜底
   · 本页使用 ES Module，需本地服务器或 GitHub Pages 打开：
       python -m http.server 8123  →  /necklace-physics.html
   ============================================================ */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const OPT = Object.assign({
  stageId: 'stage', canvasId: 'stage-canvas',
  sparkles: true, shadow: true, hud: true, bright: false, lightBg: false,
  fitW: 4.2, fitH: 3.6, centerY: -0.45
}, window.FREY_NECKLACE_OPTIONS || {});
const wrap = document.getElementById(OPT.stageId) || document.getElementById('stage');
const canvas = document.getElementById(OPT.canvasId) || document.getElementById('stage-canvas');
/* ---------------- helpers ---------------- */
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = (id) => document.getElementById(id);
const setStatus = (t) => { const el = $('hud-status'); if (el) el.textContent = t; };
// 贴图加载（CC0 本地素材；失败返回 null 自动降级为纯程序化材质）
function loadTexture(url, opts = {}) {
  return new Promise((resolve) => {
    new THREE.TextureLoader().load(url, (t) => {
      if (opts.srgb) t.colorSpace = THREE.SRGBColorSpace;
      if (opts.repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(opts.repeat[0], opts.repeat[1]); }
      resolve(t);
    }, undefined, () => resolve(null));
  });
}
const setModelBadge = (t) => { const el = $('hud-model'); if (el) el.textContent = t; };
const PHYS_DT = 1 / 60;   // 物理固定步长（秒）
/* ============================================================
   Verlet 绳（链）物理
   ============================================================ */
class VerletRope {
  constructor(n, segLen) {
    this.n = n;
    this.segLen = segLen;
    this.points = [];
    for (let i = 0; i < n; i++) this.points.push({ x: 0, y: 0, z: 0, px: 0, py: 0, pz: 0, pinned: false });
    this.gravity = 9.8;
    this.damping = 0.995;          // 每帧速度保留率
    this.iterations = 8;           // 约束迭代次数（越大越“硬”）
    this.wind = { x: 0, z: 0 };
    this.anchorA = { x: -1.55, y: 1.15, z: 0 };
    this.anchorB = { x: 1.55, y: 1.15, z: 0 };
    this.grabbed = -1;
    this.grabTarget = new THREE.Vector3();
    this.grabVel = new THREE.Vector3();
    this.anchor(0, this.anchorA);
    this.anchor(this.n - 1, this.anchorB);
    this.reset();
  }
  anchor(i, p) {
    const pt = this.points[i];
    pt.x = pt.px = p.x; pt.y = pt.py = p.y; pt.z = pt.pz = p.z;
    pt.pinned = true;
  }
  reset() {
    // 初始：直接生成“已经垂挂好”的深 U 形链，并预落定——
    // 打开页面/重置时链子直接是挂好的状态，不从上方掉下来
    for (let i = 0; i < this.n; i++) {
      const t = i / (this.n - 1);
      const x = -1.55 + t * 3.1;
      const y = 1.15 - 2.25 * Math.sin(Math.PI * t);   // 深 U，底约 -1.10
      const p = this.points[i];
      p.x = p.px = x; p.y = p.py = y; p.z = p.pz = 0;
    }
    this.anchor(0, this.anchorA);
    this.anchor(this.n - 1, this.anchorB);
    this.grabbed = -1;
    this.settle(500);
  }
  // 预落定：静置模拟，让链子先自然垂好（开场不再坠落）
  settle(steps) {
    for (let i = 0; i < steps; i++) this.step(1 / 60);
  }
  solve() {
    const pts = this.points, L = this.segLen;
    for (let k = 0; k < this.iterations; k++) {
      for (let i = 0; i < this.n - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        if (a.pinned && b.pinned) continue;
        let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
        let d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        const diff = (d - L) / d;
        const mx = dx * diff, my = dy * diff, mz = dz * diff;
        if (a.pinned) { b.x -= mx; b.y -= my; b.z -= mz; }
        else if (b.pinned) { a.x += mx; a.y += my; a.z += mz; }
        else { const hx = mx * 0.5, hy = my * 0.5, hz = mz * 0.5; a.x += hx; a.y += hy; a.z += hz; b.x -= hx; b.y -= hy; b.z -= hz; }
      }
    }
  }
  step(dt) {
    const dt2 = dt * dt;
    const damp = Math.pow(this.damping, dt * 60);
    const pts = this.points;
    for (let i = 0; i < this.n; i++) {
      const p = pts[i];
      if (p.pinned) { p.px = p.x; p.py = p.y; p.pz = p.z; continue; }
      const vx = (p.x - p.px) * damp;
      const vy = (p.y - p.py) * damp;
      const vz = (p.z - p.pz) * damp;
      p.px = p.x; p.py = p.y; p.pz = p.z;
      p.x += vx + this.wind.x * dt2;
      p.y += vy - this.gravity * dt2;
      p.z += vz + this.wind.z * dt2;
    }
    if (this.grabbed >= 0) {
      const p = pts[this.grabbed];
      p.x = this.grabTarget.x; p.y = this.grabTarget.y; p.z = this.grabTarget.z;
      p.px = p.x - this.grabVel.x * dt;   // 把指针速度写回 → 松手可甩
      p.py = p.y - this.grabVel.y * dt;
      p.pz = p.z - this.grabVel.z * dt;
    }
    this.solve();
    // 速度上限，防止极端拖拽把链拉爆
    const MAXV = 40;
    for (let i = 0; i < this.n; i++) {
      const p = pts[i];
      if (p.pinned) continue;
      let vx = p.x - p.px, vy = p.y - p.py, vz = p.z - p.pz;
      const v = Math.sqrt(vx * vx + vy * vy + vz * vz) / dt;
      if (v > MAXV) { const s = MAXV / v; p.px = p.x - vx * s; p.py = p.y - vy * s; p.pz = p.z - vz * s; }
    }
  }
  // 最近的未固定质点（屏幕坐标，像素）
  nearestToScreen(px, py, camera, w, h, maxPx) {
    const v = new THREE.Vector3();
    let best = -1, bestD = maxPx * maxPx;
    for (let i = 0; i < this.n; i++) {
      const p = this.points[i];
      if (p.pinned) continue;
      v.set(p.x, p.y, p.z).project(camera);
      const sx = (v.x * 0.5 + 0.5) * w, sy = (-v.y * 0.5 + 0.5) * h;
      const dx = sx - px, dy = sy - py, d2 = dx * dx + dy * dy;
      if (d2 < bestD) { bestD = d2; best = i; }
    }
    return best;
  }
  // 世界坐标下离某个点最近的未固定质点索引（链子自适应用）
  nearestIndexToPoint(x, y, z) {
    let best = 1, bd = Infinity;
    for (let i = 1; i < this.n - 1; i++) {
      const p = this.points[i];
      const dx = p.x - x, dy = p.y - y, dz = p.z - z;
      const d2 = dx * dx + dy * dy + dz * dz;
      if (d2 < bd) { bd = d2; best = i; }
    }
    return best;
  }
}
/* ============================================================
   boot：WebGL 可用才启动
   ============================================================ */
function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch (e) { return false; }
}
function staticFallback(reason) {
  console.warn('Frey: physics lab fallback —', reason);
  const img = document.createElement('img');
  img.src = 'assets/img/necklace.svg';
  img.alt = '拉长石项链';
  img.style.cssText = 'position:absolute;inset:0;margin:auto;width:52%;height:auto;opacity:.8;';
  wrap.appendChild(img);
}
if (reduced || !webglOK()) {
  staticFallback(reduced ? 'prefers-reduced-motion' : 'no WebGL');
} else {
  init();
}
/* ============================================================
   init：渲染器 / 场景 / 物理 / 交互 / 循环
   ============================================================ */
async function init() {
  /* ---- renderer ---- */
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 60);
  camera.position.set(0, OPT.centerY, 9);
  camera.lookAt(0, OPT.centerY, 0);
  /* ---- studio environment（虹彩需要反射环境）---- */
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new THREE.Scene();
  const soft = (x, y, z, s, color, gain) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), new THREE.MeshBasicMaterial({ color }));
    m.position.set(x, y, z);
    m.material.color.multiplyScalar(gain);
    env.add(m);
  };
  soft(0, 6, 0, 6, 0xffffff, 3.2);
  soft(-6, 1, 3, 5, 0xd8fff8, 2.6);
  soft(6, -1, 2, 5, 0xffffff, 2.2);
  soft(0, 0, -7, 8, 0xffffff, 1.4);
  if (OPT.bright) {
    soft(0, 0, 7, 10, 0xffffff, 2.4);
    soft(7, 2, 2, 7, 0xffffff, 2.0);
    soft(-7, 2, 2, 7, 0xffffff, 2.0);
    soft(0, -6, 2, 8, 0xffffff, 1.4);
  }
  scene.environment = pmrem.fromScene(env, 0.02).texture;
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
  /* ---- 材质 ---- */
  const silver = new THREE.MeshStandardMaterial({ color: 0xdfe5e2, metalness: 1, roughness: 0.32, envMapIntensity: 1.4 });
  // 链子专用：高反光银 —— 低粗糙度 + 强环境反射，像抛光镜面
  const chainSilver = new THREE.MeshStandardMaterial({
    color: 0xf2f4f3,       // 亮银
    metalness: 1,
    roughness: 0.08,       // 低粗糙度 → 镜面反光
    envMapIntensity: 2.8   // 强环境反射（反光银）
  });
  if (OPT.lightBg) {   // 浅色背景：链子调成偏灰的金属，白底上也看得清
    chainSilver.color.set(0x8f9996);
    chainSilver.roughness = 0.3;
    chainSilver.envMapIntensity = 1.1;
    chainSilver.needsUpdate = true;
  }
  const labradorite = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,          // 白色 = 不染色，正/背贴图原样显示
    metalness: 0.15,
    roughness: 0.14,
    clearcoat: 0.8,
    clearcoatRoughness: 0.2,
    iridescence: 1,
    iridescenceIOR: 1.4,
    iridescenceThicknessRange: [240, 460],   // 闪光集中在蓝/青
    envMapIntensity: 1.5
  });
  /* ---- 贴图：链子=CC0亮银 / 石头=CC0拉长石 正面一张、背面一张 ---- */
  const [silverColorTex, silverRoughTex, stoneFrontTex, stoneBackTex] = await Promise.all([
    loadTexture('assets/materials/silver/color.jpg', { srgb: true, repeat: [1, 5] }),
    loadTexture('assets/materials/silver/roughness.jpg', { repeat: [1, 5] }),
    loadTexture('assets/materials/labradorite/front.jpg', { srgb: true }),
    loadTexture('assets/materials/labradorite/back.jpg', { srgb: true })
  ]);
  if (silverColorTex) { chainSilver.map = silverColorTex; chainSilver.needsUpdate = true; }
  if (silverRoughTex) { chainSilver.roughnessMap = silverRoughTex; chainSilver.needsUpdate = true; }
  // 白色材质模板 → 克隆出 前/后/侧 三份，各贴各的图（color 0xffffff = 不染色）
  const stoneFront = labradorite.clone();
  const stoneBack = labradorite.clone();
  const stoneSide = labradorite.clone();
  if (stoneFrontTex) { stoneFront.map = stoneFrontTex; stoneFront.needsUpdate = true; stoneSide.map = stoneFrontTex; stoneSide.needsUpdate = true; }
  if (stoneBackTex) { stoneBack.map = stoneBackTex; stoneBack.needsUpdate = true; }
  /* ---- 展示架：横杆 + 两个挂环 ---- */
  const rack = new THREE.Group();
  const rodLen = 3.3;
  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.028, rodLen, 16),
    new THREE.MeshStandardMaterial({ color: 0x39413e, metalness: 0.85, roughness: 0.42, envMapIntensity: 1.2 })
  );
  rod.rotation.z = Math.PI / 2;
  rod.position.set(0, 1.24, 0);
  rack.add(rod);
  const hookMat = new THREE.MeshStandardMaterial({ color: 0x2b3230, metalness: 0.9, roughness: 0.35, envMapIntensity: 1 });
  for (const sx of [-1.55, 1.55]) {
    const h = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 10, 24), hookMat);
    h.position.set(sx, 1.14, 0);
    h.rotation.x = Math.PI / 2;
    rack.add(h);
  }
  const content = new THREE.Group(); // 项链整体（窄屏等比缩放）
  content.add(rack);
  scene.add(content);
  /* ---- 物理 ---- */
  const N = 64;          // 链子质点数量（细蛇骨链需要更密，曲线更顺滑）
  const SEG = 0.09;       // 每节长度（米），N × SEG ≈ 链总长
  const rope = new VerletRope(N, SEG);
  const mid = Math.floor(N / 2);
  /* ---- 滑动扣子：吊坠可沿链子左右滑动（不扣死），带一点摩擦 ---- */
  const bead = { u: 0.5, v: 0 };          // u: 沿链子的位置(0~1)，v: 滑动速度
  let slideGrab = false, slideTargetU = null;
  const SLIDE_FRICTION = 0.6;             // 动摩擦（减速度 m/s²，越小越顺滑）
  const SLIDE_STATIC = 0.06;              // 静摩擦阈值（链子太平时停住，防抖）
  const SLIDE_VMAX = 2.5;                 // 滑动速度上限
  const SAMPLE = { x: 0, y: 0, z: 0, tx: 1, ty: 0, tz: 0, L: 1 };  // 采样结果
  const segLens = new Float32Array(N - 1);
  // 沿链子按弧长比例 u 采样：返回链上位置 + 切线方向（t̂ 指向 +u）
  function sampleRope(u, out) {
    const pts = rope.points;
    let total = 0;
    for (let i = 0; i < N - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
      segLens[i] = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
      total += segLens[i];
    }
    let s = clamp(u, 0, 1) * total;
    for (let i = 0; i < N - 1; i++) {
      if (s <= segLens[i] || i === N - 2) {
        const f = clamp(s / segLens[i], 0, 1);
        const a = pts[i], b = pts[i + 1];
        out.x = a.x + (b.x - a.x) * f;
        out.y = a.y + (b.y - a.y) * f;
        out.z = a.z + (b.z - a.z) * f;
        const il = 1 / segLens[i];
        out.tx = (b.x - a.x) * il;
        out.ty = (b.y - a.y) * il;
        out.tz = (b.z - a.z) * il;
        out.L = total;
        return out;
      }
      s -= segLens[i];
    }
    out.x = pts[N - 1].x; out.y = pts[N - 1].y; out.z = pts[N - 1].z;
    out.tx = 1; out.ty = 0; out.tz = 0; out.L = total;
    return out;
  }
  /* ---- 蛇骨链：细银绳 —— 每节一根细圆柱 + 节点小球，连成柔韧的“绳链” ---- */
  const CHAIN_R = 0.017;                            // 链绳半径（更细，想更粗改这里）
  const JOINT_SCALE = 1.0;                          // 节点球半径 = 绳半径 → 丝滑无突起（>1 会出蛇骨节理）
  const snake = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 14, 1, true), chainSilver, N - 1);
  const joints = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 10), chainSilver, N);
  const UP = new THREE.Vector3(0, 1, 0);            // 圆柱默认轴向 Y
  const dummy = new THREE.Object3D();
  const tang = new THREE.Vector3();
  content.add(snake);
  content.add(joints);
  window.__THREE = THREE; // 调试钩子（可删）
  window.__rope = rope; // 调试/调参钩子（可删）
  window.__bead = bead; // 滑动扣子调试钩子（可删）
  window.__sample = sampleRope;
  window.__sampleOut = SAMPLE;
  window.__dbg = () => ({ grabbed, idleSince, now: performance.now(), wind: rope.wind.x });
  /* ---- 吊坠锚点（挂在链中点下方）---- */
  const pendantAnchor = new THREE.Group();
  content.add(pendantAnchor);
  /* ---- 吊坠：先试 Blender 导出的模型，失败用程序化兜底 ---- */
  const PENDANT_H = 0.62;             // 吊坠期望高度（世界单位）
  const PENDANT_GAP = 0.02;           // 吊坠(扣环中心/顶部)到链的间隙
  const parts = [];
  let pendantKind = '程序化吊坠';
  try {
    const loaded = await loadPendantGLB();
    if (loaded) {
      parts.push(...loaded);
      pendantKind = 'Blender 模型';
    }
  } catch (e) { console.warn('Frey: GLB load failed, fallback', e); }
  let pendant;
  if (parts.length === 0) {
    // 程序化兜底：蓝色拉长石(风筝形) + 扣环，按最终尺寸建模，
    // 局部原点 = 扣环中心（链子正好从环中穿过），不再归一化
    pendant = buildKitePendant(chainSilver, silver, stoneFront, stoneBack, stoneSide);
  } else {
    // Blender 模型：归一化到 PENDANT_H，并把吊坠顶部对准链子
    pendant = new THREE.Group();
    parts.forEach((m) => pendant.add(m));
    normalizePendant(pendant, PENDANT_H);
  }
  pendantAnchor.add(pendant);
  window.__phys = { scene, camera, pendantAnchor, pendant }; // 调试钩子（可删）
  /* 石头中心（悬停/识别基准点用）：锚点 + 局部偏移，旋转/缩放后转到世界 */
  const STONE_C = new THREE.Vector3(0, -0.436, -0.015);
  const stoneWv = new THREE.Vector3();
  function stoneCenterWorld(out) {
    pendantAnchor.getWorldPosition(stoneWv);
    out.copy(STONE_C).applyQuaternion(pendantAnchor.quaternion).multiplyScalar(content.scale.x).add(stoneWv);
    return out;
  }
  pendantAnchor.position.set(0, 0.65, 0); // 初始位置，首帧前防跳变
  setModelBadge('模型：' + pendantKind);
  /* ---- 氛围：星尘 + 地面柔影（可用 OPT 关闭）---- */
  let sparkles = null, spkMat = null;
  if (OPT.sparkles) {
    const spkGeo = new THREE.BufferGeometry();
    const spkCount = 110;
    const spkPos = new Float32Array(spkCount * 3);
    for (let i = 0; i < spkCount; i++) {
      const r = 2.0 + Math.random() * 1.6;
      const t = Math.random() * Math.PI * 2;
      const p = Math.acos(2 * Math.random() - 1);
      spkPos[i * 3] = r * Math.sin(p) * Math.cos(t);
      spkPos[i * 3 + 1] = r * Math.cos(p) - 0.3;
      spkPos[i * 3 + 2] = r * Math.sin(p) * Math.sin(t);
    }
    spkGeo.setAttribute('position', new THREE.BufferAttribute(spkPos, 3));
    spkMat = new THREE.PointsMaterial({ color: 0x9deee5, size: 0.028, transparent: true, opacity: 0.8, depthWrite: false });
    sparkles = new THREE.Points(spkGeo, spkMat);
    content.add(sparkles);
  }
  if (OPT.shadow) {
    const cv = document.createElement('canvas'); cv.width = 256; cv.height = 256;
    const cx = cv.getContext('2d');
    const gr = cx.createRadialGradient(128, 128, 8, 128, 128, 126);
    gr.addColorStop(0, 'rgba(1,90,86,0.36)');
    gr.addColorStop(0.6, 'rgba(1,90,86,0.18)');
    gr.addColorStop(1, 'rgba(1,90,86,0)');
    cx.fillStyle = gr; cx.fillRect(0, 0, 256, 256);
    const shadowTex = new THREE.CanvasTexture(cv);
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(4.6, 4.6),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(0, -1.95, 0);
    content.add(shadow);
  }
  /* ============================================================
     交互：指针 → 抓取最近质点，拖拽目标在过该点的相机平面上
     ============================================================ */
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const plane = new THREE.Plane();
  const planeNorm = new THREE.Vector3();
  const hit = new THREE.Vector3();
  const lastTarget = new THREE.Vector3();
  let grabbed = false;
  let stoneDrag = false;
  const stoneTarget = new THREE.Vector3();
  const stoneOffset = new THREE.Vector3();
  let dragDepth = 0;        // 拖动石头的深度(z)，滚轮可前后推拉
  const stoneFreezeQuat = new THREE.Quaternion();   // 抓住那一刻的朝向
  // 悬停轻翻（小幅度跟随光标翻动石头）
  const hoverTilt = { x: 0, y: 0 };
  let hoverOn = false;
  let lastPx = 0, lastPy = 0;
  const hoverScr = new THREE.Vector3();
  const hoverExtra = new THREE.Quaternion();
  const hoverEul = new THREE.Euler();
const hov = { x: 0, y: 0, vx: 0, vy: 0, s: 0, vs: 0, tx: 0, ty: 0, ts: 0 };   // 悬停弹簧状态(旋转x/y + 滑动s)
  let lastMoveT = 0;
  const GRAB_PX = 120;
  canvas.style.touchAction = 'none';
  const setPointer = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  };
  // 指针所在位置 → 链子上的弧长比例（0~1）；够不着返回 null
  const pointerToRopeU = (e) => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    const idx = rope.nearestToScreen(e.clientX - canvas.getBoundingClientRect().left, e.clientY - canvas.getBoundingClientRect().top, camera, w, h, GRAB_PX);
    return idx >= 0 ? idx / (N - 1) : null;
  };
  // 拖动石头：把石头目标放到手所在的世界位置（记住抓取偏移，避免跳变）
  // 用给定屏幕坐标把石头目标放到 z = dragDepth 平面（x/y 跟手，z 由滚轮控制）
  const applyStoneTarget = (px, py) => {
    const r = canvas.getBoundingClientRect();
    ndc.x = ((px - r.left) / r.width) * 2 - 1;
    ndc.y = -((py - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ndc, camera);
    plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, dragDepth));
    if (raycaster.ray.intersectPlane(plane, stoneTarget)) stoneTarget.add(stoneOffset);
  };
  const updateStoneTarget = (e) => { applyStoneTarget(e.clientX, e.clientY); };
  const grabAt = (e) => {
    setPointer(e);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pendant.children, true);
    // 只能抓石头/扣子本体（不再能抓链子）
    if (!(hits.length > 0 && hits[0].distance < 9)) return;
    stoneDrag = true;
    bead.v = 0;
    const aw = new THREE.Vector3();
    pendantAnchor.getWorldPosition(aw);
    dragDepth = aw.z;                 // 记住抓取深度，滚轮可前后改
    // 记录抓取点到石头锚点的偏移（在深度平面上算），拖动过程不跳
    plane.setFromNormalAndCoplanarPoint(new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, dragDepth));
    if (raycaster.ray.intersectPlane(plane, stoneOffset)) stoneOffset.subVectors(aw, stoneOffset);
    else stoneOffset.set(0, 0, 0);
    stoneTarget.copy(aw);
    stoneFreezeQuat.copy(pendantAnchor.quaternion);   // 记住刚抓住时的朝向
    grabbed = true;
    idleSince = performance.now();
    rope.wind.x = 0; rope.wind.z = 0;
    wrap.classList.add('is-grabbed');
  };
  const updateGrabTarget = (e) => {
    const p = rope.points[rope.grabbed];
    setPointer(e);
    raycaster.setFromCamera(ndc, camera);
    camera.getWorldDirection(planeNorm);
    plane.setFromNormalAndCoplanarPoint(planeNorm, new THREE.Vector3(p.x, p.y, p.z));
    if (raycaster.ray.intersectPlane(plane, rope.grabTarget)) {
      // 深度稍微往镜头方向收一点，避免被链子本身挡住视角
      rope.grabTarget.z += 0.02;
    }
  };
  canvas.addEventListener('pointerdown', grabAt);
  canvas.addEventListener('pointermove', (e) => {
    lastPx = e.clientX; lastPy = e.clientY;
    if (stoneDrag) updateStoneTarget(e);
    hoverOn = false;   // mouse hover flip removed
  });
  // 滚轮：拖动/悬停石头时把它前后（z）推拉
  canvas.addEventListener('wheel', (e) => {
    if (!stoneDrag && !hoverOn) return;
    e.preventDefault();
    dragDepth = clamp(dragDepth - e.deltaY * 0.002, -0.9, 0.9);
    if (stoneDrag) applyStoneTarget(lastPx, lastPy);   // 滚轮改深度后立即更新石头位置
  }, { passive: false });
  const release = () => {
    if (!grabbed) return;
    grabbed = false;
    stoneDrag = false;
    slideGrab = false;
    slideTargetU = null;
    rope.grabbed = -1;
    rope.grabVel.set(0, 0, 0);
    idleSince = performance.now();
    wrap.classList.remove('is-grabbed');
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('pointerleave', release);
  canvas.addEventListener('pointerleave', () => { hoverOn = false; });
  /* ---- 控制 ---- */
  const gravSlider = $('gravity');
  const gravVal = $('gravity-val');
  const resetBtn = $('reset');
  if (gravSlider && gravVal) {
    gravSlider.addEventListener('input', () => {
      rope.gravity = parseFloat(gravSlider.value);
      gravVal.textContent = rope.gravity.toFixed(1);
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener('click', () => { rope.reset(); bead.u = 0.5; bead.v = 0; slideTargetU = null; });
  }
  /* ---- resize：相机距离自适应，让项链尽量占满可视区域 ---- */
  const resize = () => {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const vFov = THREE.MathUtils.degToRad(camera.fov);
    const fitW = camera.aspect < 0.9 ? Math.min(OPT.fitW, 3.9) : OPT.fitW;   // 竖屏：优先保证宽度装下
    const distW = (fitW / 2) / (Math.tan(vFov / 2) * Math.max(camera.aspect, 0.2));
    const distH = (OPT.fitH / 2) / Math.tan(vFov / 2);
    camera.position.set(0, OPT.centerY, Math.max(distW, distH));
    camera.lookAt(0, OPT.centerY, 0);
    content.scale.setScalar(1);
  };
  resize();
  window.addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(wrap);
  /* ---- offscreen pause ---- */
  let visible = true;
  const io = new IntersectionObserver((en) => { visible = en[0].isIntersecting; }, { threshold: 0.05 });
  io.observe(wrap);
  /* ---- render loop ---- */
  const clock = new THREE.Clock();
  let last = performance.now();
  let idleSince = performance.now();
  let statusT = 0;
  function tick() {
    requestAnimationFrame(tick);
    const now = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.05) dt = 0.05;          // 后台标签页回来时防止爆炸
    const t = clock.getElapsedTime();
    // 微风已去掉：静止时链子不动，只有拖动/链子物理会带动它
    rope.wind.x = 0; rope.wind.z = 0;
    // 物理子步：固定步长 1/60，最多 2 步
    let remaining = dt;
    while (remaining > 1e-6) {
      const h = Math.min(PHYS_DT, remaining);
      rope.step(h);
      remaining -= h;
    }
    // 石头被抓住拖动时：链子自适应——把离石头最近的链点拉到石头处
    if (stoneDrag) {
      const si = rope.nearestIndexToPoint(stoneTarget.x, stoneTarget.y, stoneTarget.z);
      const sp = rope.points[si];
      sp.x = stoneTarget.x; sp.y = stoneTarget.y; sp.z = stoneTarget.z;
      bead.u = clamp(si / (N - 1), 0.02, 0.98);   // 挂点跟着石头
    }
    /* ---- 蛇骨链摆放：细圆柱沿绳段 + 节点小球 ---- */
    const pts = rope.points;
    for (let i = 0; i < N - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      tang.set(b.x - a.x, b.y - a.y, b.z - a.z);
      const len = tang.length() || 1e-6;
      tang.multiplyScalar(1 / len);
      dummy.position.set((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
      dummy.quaternion.setFromUnitVectors(UP, tang);
      dummy.scale.set(CHAIN_R, len, CHAIN_R);
      dummy.updateMatrix();
      snake.setMatrixAt(i, dummy.matrix);
    }
    for (let i = 0; i < N; i++) {
      const p = pts[i];
      dummy.position.set(p.x, p.y, p.z);
      dummy.quaternion.identity();
      dummy.scale.setScalar(CHAIN_R * JOINT_SCALE);
      dummy.updateMatrix();
      joints.setMatrixAt(i, dummy.matrix);
    }
    snake.instanceMatrix.needsUpdate = true;
    joints.instanceMatrix.needsUpdate = true;
    /* ---- 悬停物理：石头旋转 + 轻微左右滑动，离开后带物理回摆 ---- */
    // 先在当前位置采样得到石头屏幕中心（初始 0.5 最低点）
    // 挂点保持在上次位置（松手不回中点）
    sampleRope(bead.u, SAMPLE);
    if (hoverOn && !stoneDrag) {
      stoneCenterWorld(hoverScr).project(camera);
      const hx = (hoverScr.x * 0.5 + 0.5) * canvas.clientWidth;
      const hy = (-hoverScr.y * 0.5 + 0.5) * canvas.clientHeight;
      hov.ty = clamp((lastPx - hx) * 0.0055, -2.2, 2.2);   // 左右旋转（幅度略小）
      hov.tx = clamp((lastPy - hy) * 0.0055, -2.2, 2.2);  // 上下翻转：鼠标在上->朝上，在下->朝下
      hov.ts = clamp((lastPx - hx) * 0.0005, -0.07, 0.07); // 左右沿链稍滑(小)
    } else {
      hov.ty = 0; hov.tx = 0; hov.ts = 0;
    }
    // 弹簧积分（带回摆）：刚度 K、阻尼 C
    hov.y += hov.vy * dt;  hov.vy += ((hov.ty - hov.y) * 140 - hov.vy * 12) * dt;
    hov.x += hov.vx * dt;  hov.vx += ((hov.tx - hov.x) * 140 - hov.vx * 12) * dt;
    hov.s += hov.vs * dt;  hov.vs += ((hov.ts - hov.s) * 55 - hov.vs * 8) * dt;
    // （悬停滑动已移除）
    sampleRope(bead.u, SAMPLE);

    /* ---- 吊坠跟随扣子所在位置，朝向按链切线 + 重力 ---- */
    const pm = SAMPLE;
    tang.set(SAMPLE.tx, SAMPLE.ty, SAMPLE.tz);
    if (tang.lengthSq() < 1e-10) tang.set(0, 1, 0); else tang.normalize();
    const up = UP2;
    const dot = tang.x * up.x + tang.y * up.y + tang.z * up.z;
    hang.set(up.x - tang.x * dot, up.y - tang.y * dot, up.z - tang.z * dot);
    if (hang.lengthSq() < 1e-10) hang.set(0, 1, 0); else hang.normalize();
    side.crossVectors(tang, hang);
    if (side.lengthSq() < 1e-10) side.set(0, 0, 1); else side.normalize();
    basis.makeBasis(tang, hang, side);
    basis.setPosition(SAMPLE.x, SAMPLE.y, SAMPLE.z);
    targetQuat.setFromRotationMatrix(basis);
    if (stoneDrag) targetQuat.copy(stoneFreezeQuat);   // 抓住时保持朝向
    const k = 1 - Math.exp(-14 * dt);
    // 悬停旋转叠加上去（带物理回摆的 hov.x / hov.y）
    if (!stoneDrag && (Math.abs(hov.x) > 0.003 || Math.abs(hov.y) > 0.003)) {
      hoverExtra.setFromEuler(hoverEul.set(hov.x, hov.y, 0));
      targetQuat.multiply(hoverExtra);
    }
    pendantAnchor.quaternion.slerp(targetQuat, k);
    pendantAnchor.position.set(SAMPLE.x, SAMPLE.y, SAMPLE.z).addScaledVector(hang, -PENDANT_GAP);
    if (stoneDrag) pendantAnchor.position.copy(stoneTarget);   // 石头=手
    /* ---- 氛围动画 ---- */
    if (sparkles) {
      sparkles.rotation.y = t * 0.05;
      sparkles.rotation.x = Math.sin(t * 0.3) * 0.15;
      spkMat.opacity = 0.55 + Math.sin(t * 2.2) * 0.25;
    }
    /* ---- 状态 HUD（低频更新）---- */
    statusT += dt;
    if (statusT > 0.25) {
      statusT = 0;
      setStatus(`g ${rope.gravity.toFixed(1)} · pts ${N} · seg ${SEG.toFixed(3)}m · ${grabbed ? '按住中' : '待机'}`);
    }
    if (visible) renderer.render(scene, camera);
  }
  tick();
}
/* ============================================================
   临时向量池
   ============================================================ */
const DOWN = new THREE.Vector3(0, -1, 0);
const UP2 = new THREE.Vector3(0, 1, 0);
const hang = new THREE.Vector3();
const side = new THREE.Vector3();
const basis = new THREE.Matrix4();
const targetQuat = new THREE.Quaternion();
/* ============================================================
   吊坠模型：Blender GLB 加载 / 程序化兜底
   ============================================================ */
async function loadPendantGLB() {
  const candidates = ['assets/models/necklace.glb', 'assets/models/pendant.glb'];
  const loader = new GLTFLoader();
  for (const url of candidates) {
    try {
      const gltf = await loader.loadAsync(url);
      const out = [];
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        const nm = (o.name || '').toLowerCase();
        if (/link|chain|环|链/.test(nm)) return;         // 链环不用，网页端会重新模拟
        const c = o.clone();
        // 压平到世界坐标（防止 GLB 层级导致偏移）
        c.position.setFromMatrixPosition(o.matrixWorld);
        c.quaternion.setFromRotationMatrix(o.matrixWorld);
        c.scale.setFromMatrixScale(o.matrixWorld);
        // 无贴图的模型：套用拉长石虹彩材质
        const mat = c.material;
        const hasTex = mat && (mat.map || mat.emissiveMap || mat.normalMap);
        if (mat && !hasTex) c.material = labradoriteFor(mat);
        out.push(c);
      });
      if (out.length === 0) throw new Error('empty scene');
      return out;
    } catch (e) { /* 试下一个 */ }
  }
  return null;
}
function labradoriteFor(orig) {
  return new THREE.MeshPhysicalMaterial({
    color: orig && orig.color ? orig.color.clone().multiplyScalar(1.35) : 0xd6e0db,
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
}
function roundedRectShape(cx, cy, w, h, r) {
  const s = new THREE.Shape();
  const x = cx - w / 2, y = cy - h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return s;
}
/* 把挤出几何按三角面法线拆成 前 / 后 / 侧 三份（共享顶点），实现正/背不同贴图 */
function splitStoneFaces(geo, eps) {
  const pos = geo.getAttribute('position');
  const nor = geo.getAttribute('normal');
  const uv = geo.getAttribute('uv');
  const idx = geo.index;
  const A = new THREE.Vector3(), Bv = new THREE.Vector3(), C = new THREE.Vector3();
  const AB = new THREE.Vector3(), AC = new THREE.Vector3(), N = new THREE.Vector3();
  const groups = { front: [], back: [], side: [] };
  const triCount = idx ? idx.count / 3 : pos.count / 3;
  for (let t = 0; t < triCount; t++) {
    const i0 = idx ? idx.getX(t * 3) : t * 3;
    const i1 = idx ? idx.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = idx ? idx.getX(t * 3 + 2) : t * 3 + 2;
    A.fromBufferAttribute(pos, i0); Bv.fromBufferAttribute(pos, i1); C.fromBufferAttribute(pos, i2);
    AB.subVectors(Bv, A); AC.subVectors(C, A); N.crossVectors(AB, AC).normalize();
    const key = N.z > eps ? 'front' : (N.z < -eps ? 'back' : 'side');
    groups[key].push(i0, i1, i2);
  }
  // 把该面的 UV 按它自己的包围盒归一化到 [0,1]（贴图居中、铺满整面）
  function normalizeUV(geo) {
    const p = geo.getAttribute('position');
    const ix = geo.index;
    const n = ix ? ix.count : p.count;
    const at = (i) => (ix ? ix.getX(i) : i);
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const k = at(i), x = p.getX(k), y = p.getY(k);
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
    const sx = (maxX - minX) || 1, sy = (maxY - minY) || 1;
    const arr = new Float32Array(p.count * 2);
    for (let i = 0; i < n; i++) {
      const k = at(i);
      arr[k * 2] = (p.getX(k) - minX) / sx;
      arr[k * 2 + 1] = (p.getY(k) - minY) / sy;
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(arr, 2));
  }
  const out = {};
  for (const k of ['front', 'back', 'side']) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', pos);
    g.setAttribute('normal', nor);
    if (uv) g.setAttribute('uv', uv);
    g.setIndex(groups[k]);
    normalizeUV(g);   // 贴图铺满整面、居中
    out[k] = g;
  }
  return out;
}
function buildKitePendant(chainSilver, silver, stoneFront, stoneBack, stoneSide) {
  // 蓝色拉长石吊坠：风筝形 + 竖椭圆环。石头正/背面各用一张贴图。
  // 局部原点 = 链子位置：环挂在链子下方，石头接在环下端。
  const g = new THREE.Group();
  /* —— 椭圆环（bail）—— */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.10, 0.030, 16, 48), chainSilver);
  ring.rotation.y = Math.PI / 2;   // 面朝左/右（法线沿 X），链子从环心穿过
  ring.scale.y = 1.3;              // 短一些（竖椭圆）
  ring.position.y = -0.09;         // 长一点后仍贴链子
  g.add(ring);
  /* —— 蓝色拉长石主石：风筝形，上短下长；拆成前/后/侧，各贴各的图 —— */
  const T = 0.20, B = 0.52, W = 0.30;
  const kite = new THREE.Shape();
  kite.moveTo(0, T);
  kite.quadraticCurveTo(W * 0.82, T * 0.55, W, 0);
  kite.quadraticCurveTo(W * 0.78, -B * 0.45, 0, -B);
  kite.quadraticCurveTo(-W * 0.78, -B * 0.45, -W, 0);
  kite.quadraticCurveTo(-W * 0.82, T * 0.55, 0, T);
  const gemGeo = new THREE.ExtrudeGeometry(kite, {
    depth: 0.08, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 6, curveSegments: 40
  });
  const faces = splitStoneFaces(gemGeo, 0.35);
  const off = { x: 0, y: -0.16 - T, z: -(0.08 + 0.06 * 2) / 2 };   // 石头下来一点
  const front = new THREE.Mesh(faces.front, stoneFront); front.position.set(off.x, off.y, off.z); g.add(front);
  const back = new THREE.Mesh(faces.back, stoneBack);   back.position.set(off.x, off.y, off.z); g.add(back);
  const side = new THREE.Mesh(faces.side, stoneSide);   side.position.set(off.x, off.y, off.z); g.add(side);
  return g;
}
function normalizePendant(group, targetH) {
  group.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(group);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const s = size.y > 1e-6 ? targetH / size.y : 1;
  group.scale.multiplyScalar(s);
  group.updateMatrixWorld(true);
  const box2 = new THREE.Box3().setFromObject(group);
  const c = box2.getCenter(new THREE.Vector3());
  const top = box2.max.y;
  // 顶部对准局部原点，X/Z 居中
  group.position.set(-c.x, -top, -c.z);
  group.updateMatrixWorld(true);
}
