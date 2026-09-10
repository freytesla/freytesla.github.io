/* slogan 单词语循环：词淡入 → 停 → 向上消失 → 下一个词同位置 */
(function () {
  'use strict';
  var el = document.getElementById('slogan-word');
  if (!el) return;
  var words = ['Coder', 'Creator', 'Explorer'];
  var idx = 0;

  function show() {
    el.textContent = words[idx];
    el.classList.remove('out');
    el.classList.remove('in');
    void el.offsetWidth;
    el.classList.add('in');
    setTimeout(function () {
      el.classList.remove('in');
      el.classList.add('out');
      setTimeout(function () {
        idx = (idx + 1) % words.length;
        show();
      }, 520);
    }, 1800);
  }
  show();
})();
