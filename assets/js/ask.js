/* ============================================================
   ASK — jump to your question box
   ============================================================ */
(function () {
  'use strict';

  /* ★ 把你的提问箱地址填在这里（问卷星 / 腾讯问卷 / 小纸条等） */
  var ASK_URL = 'https://forms.example.com/frey-ask';

  var btn = document.getElementById('ask-btn');
  if (btn) {
    btn.setAttribute('href', ASK_URL);
    btn.addEventListener('click', function () {
      if (ASK_URL.indexOf('example.com') !== -1) {
        console.warn('请先在 assets/js/ask.js 中把 ASK_URL 换成你的提问箱地址。');
      }
    });
  }
})();
