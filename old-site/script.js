// ── 工具：从CSS变量读取尺寸 ──────────────────────────────
function getBallPx() {
    return document.getElementById('ball').offsetWidth;
}

// ── 生成圆环上的字符 ──────────────────────────────────────
function buildRing(ringEl, text, radius, isGlow) {
    ringEl.innerHTML = '';
    const total = text.length;

    for (let i = 0; i < total; i++) {
        const char = document.createElement('div');
        char.className = 'char';

        const front = document.createElement('div');
        front.className = isGlow ? 'face front glow-face' : 'face front';
        front.textContent = text[i];

        const back = document.createElement('div');
        back.className = 'face back';
        back.textContent = text[i];

        char.appendChild(front);
        char.appendChild(back);

        const angle = (360 / total) * i;
        char.style.transform = `
            translate(-50%,-50%)
            rotateY(${angle}deg)
            translateZ(${radius}px)
        `;

        const fs = Math.max(10, radius * 0.3) + 'px';
        front.style.fontSize = fs;
        back.style.fontSize  = fs;

        ringEl.appendChild(char);
    }
}

// ── 初始化 ────────────────────────────────────────────────
function init() {
    const ballSize  = getBallPx();
    const outerR    = ballSize * 0.5;
    const innerR    = ballSize * 0.485;

    buildRing(document.getElementById('ringGlow'), ' FREY•PERSONAL•WEBSITE • ', outerR, true);
    buildRing(document.getElementById('ring'),     ' FREY•PERSONAL•WEBSITE • ', outerR, false);
    buildRing(document.getElementById('ring2'),    ' COMING SOON•COMING SOON•', innerR, false);
}

init();

let resizeTimer;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(init, 150);
});

// ── JS驱动旋转 + 悬停阻尼减速 ────────────────────────────
const ballEl  = document.getElementById('ball');
const ringEl  = document.getElementById('ring');
const glowEl  = document.getElementById('ringGlow');
const ring2El = document.getElementById('ring2');

const BASE_RX_OUTER =  22;
const BASE_RX_INNER = -22;

// 正常速度 / 悬停速度（度/帧）
const SPEED_NORMAL = 0.7;
const SPEED_HOVER  = 0.15;
// 阻尼系数：越小越顺滑
const SPEED_DAMP   = 0.035;

let angleOuter   = 0;
let angleInner   = 0;
let speedCurrent = SPEED_NORMAL;
let isHovering   = false;

ballEl.addEventListener('mouseenter', () => { isHovering = true; });
ballEl.addEventListener('mouseleave', () => { isHovering = false; });

function tick() {
    const targetSpeed = isHovering ? SPEED_HOVER : SPEED_NORMAL;
    // 指数缓动插值，产生阻尼感
    speedCurrent += (targetSpeed - speedCurrent) * SPEED_DAMP;

    angleOuter -= speedCurrent;
    // 内环按原CSS速度比 12s:18s 保持相对节奏
    angleInner -= speedCurrent * (12 / 18);

    ringEl.style.transform  = `rotateX(${BASE_RX_OUTER}deg) rotateY(${angleOuter}deg)`;
    glowEl.style.transform  = `rotateX(${BASE_RX_OUTER}deg) rotateY(${angleOuter}deg)`;
    ring2El.style.transform = `rotateX(${BASE_RX_INNER}deg) rotateY(${angleInner}deg)`;

    requestAnimationFrame(tick);
}

tick();

/* ================= Frey Cursor ================= */

const isTouchDevice =
window.matchMedia('(hover: none), (pointer: coarse)').matches;

if(!isTouchDevice){

const cursor = document.querySelector('.frey-cursor');

let mouseX = window.innerWidth + 100;
let mouseY = window.innerHeight + 100;

let x = mouseX;
let y = mouseY;

window.addEventListener('mousemove', e => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

let cursorEase = 0.22;

function animateCursor(){

    x += (mouseX - x) * cursorEase;
    y += (mouseY - y) * cursorEase;

cursor.style.transform =
    `translate(${x}px, ${y}px) translate(-50%, -50%)`;

    requestAnimationFrame(animateCursor);
}
animateCursor();

/* hover 交互元素时变化 */
const hoverTargets = document.querySelectorAll(
    'a, button, .ball'
);

hoverTargets.forEach(el => {
    el.addEventListener('mouseenter', () => {
        cursor.classList.add('is-hover');
    });

    el.addEventListener('mouseleave', () => {
        cursor.classList.remove('is-hover');
    });
});

/* ================= Click Effect Minimal ================= */

window.addEventListener('mousedown', () => {

    /* 点击瞬间吸附到真实鼠标 */
    x = mouseX;
    y = mouseY;

    cursor.style.transform =
    `translate(${x}px, ${y}px) translate(-50%,-50%)`;

    /* 暂时更跟手 */
    cursorEase = 0.42;

    /* 点击反馈 */
    cursor.animate(
        [
            {
                transform:
                `translate(${x}px, ${y}px) translate(-50%,-50%) scale(1)`
            },
            {
                transform:
                `translate(${x}px, ${y}px) translate(-50%,-50%) scale(0.72)`
            },
            {
                transform:
                `translate(${x}px, ${y}px) translate(-50%,-50%) scale(1.08)`
            },
            {
                transform:
                `translate(${x}px, ${y}px) translate(-50%,-50%) scale(1)`
            }
        ],
        {
            duration:240,
            easing:'cubic-bezier(.22,.61,.36,1)'
        }
    );

    /* 恢复阻尼 */
    setTimeout(() => {
        cursorEase = 0.22;
    }, 180);

});
}

// 页面加载完成 
window.addEventListener('DOMContentLoaded', () => {

  // 第一个LOGO
console.log(
    "%c\n" +
    " ███████████  ███████████    ██████████  █████ █████\n" +
    "▒▒███▒▒▒▒▒▒█  ▒███▒▒▒▒▒███  ▒▒███▒▒▒▒▒█  ▒███ ▒▒███ \n" +
    " ▒███   █ ▒   ▒███    ▒███   ▒███  █ ▒   ▒▒███ ███  \n" +
    " ▒███████     ▒██████████    ▒██████      ▒▒█████   \n" +
    " ▒███▒▒▒█     ▒███▒▒▒▒███    ▒███▒▒█       ▒▒███    \n" +
    " ▒███  ▒      ▒███    ▒███   ▒███ ▒   █     ▒███    \n" +
    " █████        █████   █████  ██████████     █████   \n" +
    "▒▒▒▒▒        ▒▒▒▒▒   ▒▒▒▒▒  ▒▒▒▒▒▒▒▒▒▒     ▒▒▒▒▒\n",
    "font-family: Consolas, 'Courier New', monospace; font-size: 12px; line-height: 1.2; white-space: pre;"
  );

  // 第二个点阵图
  console.log(
    "%c" +
    "⠀⠀⠀⠀⢀⣠⣤⣤⣤⣀⠀⠀⠀⠀⣀⣠⣤⣤⣤⣄⡀⠀⠀⠀⠀⠀\n" +
    "⠀⠀⣠⣿⠿⠛⠛⠛⠛⠛⢿⣷⣤⣾⠿⠛⠛⠙⠛⠛⠿⠗⠀⠀⠀⠀\n" +
    "⠀⣾⡿⠁⠀⠀⠀⠀⠀⠀⠀⠙⡿⠁⠀⠀⠀⢀⣤⣀⠀⠀⢀⣤⣶⡆⠀⠀\n" +
    "⢸⣿⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⣿⣿⣿⣿⣿⣿⣿⡇⠀⠀\n" +
    "⠸⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣸⣿⣿⣿⣿⣿⣿⣧⣄⠀\n" +
    "⠀⢹⣿⠀⣿⣷⣄⣀⣤⡄⠀⠀⠀⠀⠀⢀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⠷\n" +
    "⠀⠀⣁⣤⣿⣿⣿⣿⣿⠃⠀⠀⠀⠀⠀⠘⠛⠛⠛⠻⣿⣿⣿⠋⠉⠀⠀\n" +
    "⠀⠘⠻⢿⣿⣿⣿⣿⡄⠀⠀⠀⠀⠀⠀⠀⠀⢀⡀⠹⣿⡟⠀⠀⠀⠀\n" +
    "⠀⠀⠀⠀⢹⣿⠟⢙⠛⠛⠀⠀⠀⠀⠀⣀⣴⡿⠓⠀⠀⠀⠀⠀⠀⠀\n" +
    "⠀⠀⠀⠀⠈⠁⠀⠈⠻⢿⣦⣄⠀⣠⣾⡿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
    "⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⢿⣿⠿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀\n" +
    "⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀",
    "font-family: monospace; font-size:12px; line-height:1; white-space:pre; letter-spacing:0;"
  );

});

