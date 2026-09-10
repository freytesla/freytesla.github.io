/* Infinite Text Passage — Originkit ZoomTextTunnel 纯 JS 移植 */
window.TextTunnel = function (el, opts) {
  'use strict';
  if (!el) return;
  var o = opts || {};
  var texts = (o.texts || ['EXPLORE', 'CREATE', 'INNOVATE', 'FUTURE'])
    .map(String).filter(function (t) { return t.trim().length > 0; });
  if (texts.length === 0) texts = ['FREY'];
  var fontFamily = o.fontFamily || 'inherit';
  var fontWeight = o.fontWeight || 400;
  var fontSize = o.fontSize || 120;
  var color = o.color || '#FFFFFF';
  var letterSpacing = o.letterSpacing || '-0.02em';
  var maxScale = Number.isFinite(+o.maxScale) ? Math.max(1, +o.maxScale) : 35;
  var hold = Number.isFinite(+o.hold) ? Math.max(0, +o.hold) : 600;
  var duration = Number.isFinite(+o.duration) ? +o.duration : 1.2;
  var ease = 'cubic-bezier(.7,0,.25,1)';

  el.style.position = 'relative';
  el.style.overflow = 'hidden';
  el.style.display = 'flex';
  el.style.alignItems = 'center';
  el.style.justifyContent = 'center';
  el.style.width = '100%';
  el.style.height = '100%';

  function fontStyles(s) {
    s.style.fontFamily = fontFamily;
    s.style.fontWeight = fontWeight;
    s.style.fontSize = typeof fontSize === 'number' ? fontSize + 'px' : fontSize;
    s.style.letterSpacing = letterSpacing;
  }

  // 隐藏测量元素（占位最长词，保持宽度）
  var measurer = document.createElement('span');
  measurer.style.visibility = 'hidden';
  measurer.style.whiteSpace = 'pre';
  measurer.style.color = color;
  fontStyles(measurer);
  measurer.textContent = texts.reduce(function (a, b) { return b.length > a.length ? b : a; }, texts[0]);
  el.appendChild(measurer);

  function makeSlot() {
    var s = document.createElement('span');
    s.style.position = 'absolute';
    s.style.inset = '0';
    s.style.display = 'flex';
    s.style.alignItems = 'center';
    s.style.justifyContent = 'center';
    s.style.whiteSpace = 'pre';
    s.style.color = color;
    fontStyles(s);
    s.style.transformOrigin = 'center center';
    s.style.willChange = 'transform, opacity';
    return s;
  }
  var s0 = makeSlot(), s1 = makeSlot();
  s0.className = 'slot-0'; s1.className = 'slot-1';
  el.appendChild(s0); el.appendChild(s1);

  if (texts.length === 1) { s0.textContent = texts[0]; s0.style.opacity = '1'; return; }

  var active = 0, idx = 0;
  s0.textContent = texts[0];
  s0.style.transform = 'scale(1)'; s0.style.opacity = '1';
  s1.style.transform = 'scale(.05)'; s1.style.opacity = '0';

  var timer = null;
  function go(s, transform, opacity) {
    s.style.transition = 'transform ' + duration + 's ' + ease + ', opacity ' + duration + 's ' + ease;
    s.style.transform = transform;
    s.style.opacity = opacity;
  }
  function showNext() {
    var inc = 1 - active;
    var nextIdx = (idx + 1) % texts.length;
    var enter = inc === 0 ? s0 : s1;
    var exit = active === 0 ? s0 : s1;

    enter.textContent = texts[nextIdx];
    enter.style.transition = 'none';
    enter.style.transform = 'scale(.05)';
    enter.style.opacity = '0';
    void enter.offsetWidth;

    go(enter, 'scale(1)', '1');
    go(exit, 'scale(' + maxScale + ')', '0');

    timer = setTimeout(function () {
      exit.style.transition = 'none';
      exit.style.transform = 'scale(.05)';
      exit.style.opacity = '0';
      active = inc;
      idx = nextIdx;
      timer = setTimeout(showNext, hold);
    }, duration * 1000 + 60);
  }
  timer = setTimeout(showNext, hold);
};
