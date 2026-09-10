/* slogan：滚动驱动。下滑 → 当前词向上消失，下一个词从下方滑进同位置；上滑反向 */
(function () {
  'use strict';
  var sec = document.getElementById('slogan');
  if (!sec) return;
  var words = Array.prototype.slice.call(sec.querySelectorAll('.slogan-word'));
  if (words.length === 0) return;
  var H = window.innerHeight;
  var idx = 0;
  var lastY = window.scrollY;
  var dir = 1;

  addEventListener('resize', function () { H = window.innerHeight; });

  function setInFromTop(el) {
    el.className = 'slogan-word above';
    void el.offsetWidth;
    el.className = 'slogan-word on';
  }

  function update() {
    var top = sec.getBoundingClientRect().top + window.scrollY;
    var sy = window.scrollY - top;
    var max = sec.offsetHeight - H;
    sy = Math.max(0, Math.min(sy, max));
    var next = Math.min(words.length - 1, Math.max(0, Math.round(sy / H)));
    dir = window.scrollY >= lastY ? 1 : -1;
    lastY = window.scrollY;

    if (next !== idx) {
      var old = words[idx], neu = words[next];
      if (dir > 0) {
        old.className = 'slogan-word out-up';   // 当前词向上消失
        neu.className = 'slogan-word on';       // 下一个词从下方滑进
      } else {
        old.className = 'slogan-word out-down'; // 当前词向下消失
        setInFromTop(neu);                       // 上一个词从上方滑进
      }
      idx = next;
    }
    requestAnimationFrame(update);
  }

  words[0].className = 'slogan-word on';
  requestAnimationFrame(update);
})();
