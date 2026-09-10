/* 两层鼠标视差：前=项链，后=人物剪影（靠近变亮） */
(function () {
  'use strict';
  const back = document.getElementById('silhouette');
  const front = document.getElementById('necklace-img');
  if (!back || !front) return;

  let mx = innerWidth / 2, my = innerHeight / 2;
  let fx = 0, fy = 0, bx = 0, by = 0;

  addEventListener('mousemove', function (e) { mx = e.clientX; my = e.clientY; }, { passive: true });

  // SCROLL 提示：淡入淡出（先停掉入场动画，否则 opacity 被 fill-forwards 覆盖）
  var hint = document.querySelector('.scroll-hint');
  var hintAnimOff = false;
  function onScrollHint() {
    if (!hint) return;
    if (!hintAnimOff) { hint.style.animation = 'none'; hintAnimOff = true; }
    var hide = scrollY > 80;
    hint.style.opacity = hide ? '0' : '1';
    hint.style.visibility = hide ? 'hidden' : 'visible';
  }
  addEventListener('scroll', onScrollHint, { passive: true });
  onScrollHint();

  (function loop() {
    const cx = innerWidth / 2, cy = innerHeight / 2;
    // 前层（项链）跟随鼠标、幅度大
    fx += (mx - cx - fx) * 0.07;
    fy += (my - cy - fy) * 0.07;
    // 后层（剪影）反向、幅度小 → 前后视差
    bx += (cx - mx - bx) * 0.05;
    by += (cy - my - by) * 0.05;

    front.style.transform = 'translate3d(' + (fx * 0.045) + 'px,' + (fy * 0.045) + 'px,0) translate(-50%,-50%)';
    back.style.transform = 'translate3d(' + (bx * 0.03) + 'px,' + (by * 0.03) + 'px,0) translate(-50%,-50%)';

    // 鼠标越靠近中心，剪影越亮
    const dist = Math.hypot(mx - cx, my - cy);
    const maxD = Math.hypot(innerWidth, innerHeight) / 2;
    const bright = 0.4 + (1 - Math.min(1, dist / maxD)) * 0.4;
    back.style.opacity = String(Math.min(0.8, bright));

    requestAnimationFrame(loop);
  })();
})();
