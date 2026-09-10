/* 滚动驱动的文字放大：下滑 → 词放大到覆盖全屏 → 下一个词继续 */
(function () {
  'use strict';
  var sec = document.getElementById('scrollZoom');
  if (!sec) return;
  var words = Array.prototype.slice.call(sec.querySelectorAll('.zoom-word'));
  if (words.length === 0) return;
  var H = window.innerHeight, W = window.innerWidth;

  function easeOut(p) { return 1 - Math.pow(1 - p, 3); }

  function measure() {
    H = window.innerHeight; W = window.innerWidth;
    words.forEach(function (w) {
      var ww = w.offsetWidth || 200;
      var wh = w.offsetHeight || 100;
      w._max = Math.max(W / ww, H / wh) * 1.2; // 放大到铺满全屏
    });
  }
  measure();
  addEventListener('resize', function () { measure(); });

  function update() {
    var top = sec.getBoundingClientRect().top + window.scrollY;
    var sy = window.scrollY - top;
    words.forEach(function (w, i) {
      var p = (sy - i * H) / H; // 每个词占 100vh
      p = Math.max(0, Math.min(1, p));
      var inT = easeOut(Math.min(1, p / 0.12));         // 快速淡入
      var outT = easeOut(Math.max(0, (p - 0.9) / 0.1)); // 结尾淡出
      var scale = 0.25 + easeOut(p) * (w._max - 0.25);
      w.style.transform = 'translate(-50%,-50%) scale(' + scale.toFixed(4) + ')';
      w.style.opacity = String((inT * (1 - outT)).toFixed(4));
    });
    requestAnimationFrame(update);
  }
  update();
})();
