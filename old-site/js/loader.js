/* 加载动画 + 页面过渡 + 进度条
   进入页面（首载）：FREY 下落（至少两轮；一直没加载好就继续落）→ 进度到 100% → 飞向四角 → 淡出
   页面转换：四角字母飞回中心（当前页，隐藏进度条）→ 跳转 → 新页进度条走到 100% → 飞向四角 → 淡出 */
(function () {
  'use strict';
  var loader = document.getElementById('loader');
  if (!loader) return;
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var FLY_MS = 950, LAND_MS = 1100, BEAT_MS = 250;
  var FALL_ROUND_MS = 1570; // 一轮下落 = 最后字母 0.32s 开始 + 动画 1.25s
  var MIN_FALLS = 2;        // 进入页面至少下落两轮
  var MAX_FALLS = 8;        // 保险上限：加载再慢也不超过 8 轮
  var HOLD_PROGRESS = 85;   // 非最后一轮进度停在这
  var ENTRY_FILL_MS = 1200; // 转换进入时进度条补到 100% 的时长

  function q(s) { return document.querySelector(s); }
  function pairs() {
    return [
      { letter: q('#loader .cf-f'), target: q('#brand .letter-f .in') || q('#brand .letter-f'), flip: 1 },
      { letter: q('#loader .cf-r'), target: q('.corner-tr .in') || q('.corner-tr'), flip: -1 },
      { letter: q('#loader .cf-e'), target: q('.corner-bl .in') || q('.corner-bl'), flip: 1 },
      { letter: q('#loader .cf-y'), target: q('.corner-br .in') || q('.corner-br'), flip: 1 }
    ].filter(function (p) { return p.letter && p.target; });
  }
  function spans() { return Array.prototype.slice.call(loader.querySelectorAll('.corner-fly span')); }

  function resetCenter() {
    spans().forEach(function (s) {
      s.style.transition = 'none';
      s.style.transform = 'none';
      s.style.opacity = '1';
    });
    void loader.offsetWidth;
  }

  // 开始一轮下落（顺序随机，间隔固定 0.08s；land=true 为最后一轮，落到同一行不淡出）
  function playFall(land) {
    loader.classList.remove('playing');
    loader.classList.remove('landing');
    resetCenter();
    var arr = spans();
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    var delays = [0.08, 0.16, 0.24, 0.32];
    arr.forEach(function (s, idx) { s.style.animationDelay = delays[idx].toFixed(2) + 's'; });
    void loader.offsetWidth;
    loader.classList.add('playing');
    if (land) { loader.classList.add('landing'); }
  }
  function stopFall() { loader.classList.remove('playing'); loader.classList.remove('landing'); }

  // ---------- 进度条 ----------
  var progressBar = loader.querySelector('.progress span');
  var progressPct = loader.querySelector('.progress-pct');
  var progressTimer = null;

  function setProgress(pct) {
    if (progressBar) progressBar.style.width = pct + '%';
    if (progressPct) progressPct.textContent = Math.round(pct) + '%';
  }
  function startProgress(target, ms) {
    if (!progressBar) return;
    if (progressTimer) clearInterval(progressTimer);
    var from = parseFloat(progressBar.style.width) || 0;
    var start = Date.now();
    function step() {
      var p = Math.min(1, (Date.now() - start) / ms);
      var e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setProgress(from + (target - from) * e);
      if (p >= 1) { clearInterval(progressTimer); progressTimer = null; }
    }
    progressTimer = setInterval(step, 50);
    step();
  }
  function finishProgress() {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
    setProgress(100);
  }
  function resetProgress() {
    if (progressTimer) { clearInterval(progressTimer); progressTimer = null; }
    setProgress(0);
  }
  // ---------------------------

  function loaded() {
    if (document.readyState !== 'complete') return false;
    if (document.fonts && document.fonts.status && document.fonts.status !== 'loaded') return false;
    return true;
  }

  function whenFontsReady(cb) {
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(cb, cb); }
    else { cb(); }
  }

  // 计算从中心到四角的位移与缩放
  function cornerTransforms(ps) {
    ps.forEach(function (p) {
      var lr = p.letter.getBoundingClientRect();
      var tr = p.target.getBoundingClientRect();
      p.dx = (tr.left + tr.width / 2) - (lr.left + lr.width / 2);
      p.dy = (tr.top + tr.height / 2) - (lr.top + lr.height / 2);
      p.scale = tr.width / lr.width;
    });
  }

  // 从中心飞向四角（进入新页 / 加载完成）
  function scatter(onDone) {
    var ps = pairs();
    if (ps.length === 0) { setTimeout(onDone, 600); return; }
    loader.classList.remove('done');
    loader.classList.remove('hide-progress');
    stopFall();
    whenFontsReady(function () {
      resetCenter();
      cornerTransforms(ps);
      setTimeout(function () {
        ps.forEach(function (p, i) {
          p.letter.style.transition =
            'transform ' + FLY_MS + 'ms cubic-bezier(.22,.61,.36,1), opacity ' + FLY_MS + 'ms ease';
          p.letter.style.transitionDelay = (i * 0.06) + 's';
          p.letter.style.transform =
            'translate(' + p.dx + 'px,' + p.dy + 'px) scale(' + (p.flip * p.scale) + ',' + p.scale + ')';
        });
        setTimeout(onDone, LAND_MS);
      }, BEAT_MS);
    });
  }

  // 从四角飞回中心（离开当前页）
  function gather(onDone) {
    var ps = pairs();
    if (ps.length === 0) { setTimeout(onDone, 600); return; }
    loader.classList.remove('done');
    stopFall();
    whenFontsReady(function () {
      resetCenter();
      cornerTransforms(ps);
      // 先把字母放到四角（不动画），随后飞回中心
      ps.forEach(function (p) {
        p.letter.style.transition = 'none';
        p.letter.style.transform =
          'translate(' + p.dx + 'px,' + p.dy + 'px) scale(' + (p.flip * p.scale) + ',' + p.scale + ')';
        p.letter.style.opacity = '1';
      });
      void loader.offsetWidth;
      setTimeout(function () {
        ps.forEach(function (p, i) {
          p.letter.style.transition =
            'transform ' + FLY_MS + 'ms cubic-bezier(.22,.61,.36,1), opacity ' + FLY_MS + 'ms ease';
          p.letter.style.transitionDelay = (i * 0.06) + 's';
          p.letter.style.transform = 'none';
        });
        setTimeout(onDone, LAND_MS);
      }, BEAT_MS);
    });
  }

  if (reduce) { loader.classList.add('done'); return; }

  // 判断是页面转换还是直接进入
  var isTransition = sessionStorage.getItem('frey-transition') === '1';
  sessionStorage.removeItem('frey-transition');

  if (isTransition) {
    // 页面转换进入：进度条先走到 100%，再飞向四角（只显示这一次）
    resetProgress();
    startProgress(100, ENTRY_FILL_MS);
    setTimeout(function () {
      finishProgress();
      scatter(function () { finishProgress(); loader.classList.add('done'); });
    }, ENTRY_FILL_MS);
  } else {
    // 进入页面：先下落（至少两轮；一直没加载好就继续落），进度到 100% 后再飞四角
    resetProgress();
    var falls = 0;
    (function nextFall() {
      // 这一轮结束就飞四角？→ 最后一轮进度走到 100%，落完直接飞
      var willEnd = (falls + 1 >= MIN_FALLS && loaded()) || (falls + 1 >= MAX_FALLS);
      if (willEnd) {
        startProgress(100, FALL_ROUND_MS);
        playFall(true);
        setTimeout(function () {
          finishProgress();
          scatter(function () { finishProgress(); loader.classList.add('done'); });
        }, FALL_ROUND_MS);
      } else {
        startProgress(HOLD_PROGRESS, FALL_ROUND_MS);
        playFall(false);
        setTimeout(function () {
          falls++;
          nextFall();
        }, FALL_ROUND_MS);
      }
    })();
  }

  // 页面转换：点站内链接 → 四角字母飞回中心（隐藏进度条）→ 跳转
  document.addEventListener('click', function (e) {
    var a = e.target.closest('a');
    if (!a) return;
    var href = a.getAttribute('href') || '';
    if (!href || href.charAt(0) === '#' || /^https?:/i.test(href) || href.indexOf('mailto:') === 0) return;
    e.preventDefault();
    loader.classList.add('hide-progress');
    sessionStorage.setItem('frey-transition', '1');
    gather(function () { window.location.href = href; });
  });
})();
