/* ============================================================
   HOBBY — generative record player
   ============================================================ */
(function () {
  'use strict';

  /* ============================================================
     RECORD PLAYER — WebAudio generative engine
     ============================================================ */
  var deck = document.getElementById('music');
  var playBtn = document.getElementById('deck-play');
  var genres = Array.prototype.slice.call(document.querySelectorAll('.genre'));
  var titleEl = document.getElementById('deck-title');
  var labelTitle = document.querySelector('.tt__label-title');
  var viz = document.getElementById('deck-viz');
  var vctx = viz ? viz.getContext('2d') : null;
  var vol = document.getElementById('deck-vol');

  var GENRES = {
    lofi:    { bpm: 72,  title: 'lo-fi rain',   root: 57 },
    ambient: { bpm: 64,  title: 'ambient drift', root: 60 },
    jazz:    { bpm: 96,  title: 'jazz nocturne', root: 55 },
    electro: { bpm: 118, title: 'electro pulse', root: 48 }
  };
  /* four-bar chord progressions (semitone offsets from root) */
  var PROG = {
    lofi:    [[0, 3, 7], [5, 9, 12], [0, 3, 7], [7, 11, 14]],
    ambient: [[0, 7, 12], [2, 9, 14], [5, 12, 16], [0, 7, 12]],
    jazz:    [[0, 3, 7, 10], [5, 8, 12, 15], [7, 10, 14, 17], [5, 9, 12, 15]],
    electro: [[0, 3, 7, 10], [0, 3, 7, 10], [2, 5, 9, 12], [2, 5, 9, 12]]
  };

  var ctx = null, master = null, analyser = null, noiseBuf = null;
  var playing = false, timer = null, step = 0, nextTime = 0;
  var current = 'lofi';
  var volume = 70;

  function ensureCtx() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume / 100;
    analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.82;
    master.connect(analyser);
    analyser.connect(ctx.destination);
    /* shared noise buffer */
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  var midi = function (m) { return 440 * Math.pow(2, (m - 69) / 12); };

  function tone(freq, t, dur, type, gain, fc) {
    if (!ctx) return;
    var o = ctx.createOscillator();
    o.type = type || 'sine';
    o.frequency.value = freq;
    var g = ctx.createGain();
    var a = Math.max(0.008, dur * 0.08);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(gain, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    if (fc) {
      var f = ctx.createBiquadFilter();
      f.type = 'lowpass'; f.frequency.value = fc;
      o.connect(f); f.connect(g);
    } else o.connect(g);
    g.connect(master);
    o.start(t); o.stop(t + dur + 0.05);
  }

  function noise(t, dur, gain, high) {
    if (!ctx) return;
    var src = ctx.createBufferSource();
    src.buffer = noiseBuf; src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = high ? 'highpass' : 'lowpass';
    f.frequency.value = high ? 6500 : 900;
    var g = ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(master);
    src.start(t); src.stop(t + dur + 0.05);
  }

  function kick(t, gain) {
    if (!ctx) return;
    var o = ctx.createOscillator(); o.type = 'sine';
    var g = ctx.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + 0.22);
  }

  function scheduleStep(st, t) {
    var g = GENRES[current];
    var stepDur = 60 / g.bpm / 4;
    var bar = Math.floor(st / 16) % 4;
    var s = st % 16;
    var chord = PROG[current][bar];

    /* pad chord — start of bar */
    if (s === 0) {
      for (var i = 0; i < chord.length; i++) {
        tone(midi(g.root + chord[i]), t, stepDur * 11, 'triangle', 0.042);
      }
      tone(midi(g.root - 12), t, stepDur * 15, 'sine', 0.05);
      if (current === 'ambient' || current === 'lofi') {
        tone(midi(g.root + chord[chord.length - 1] + 12), t, stepDur * 15, 'sine', 0.028);
      }
    }

    /* bass */
    if (s === 0 || s === 8) {
      var b = (s === 0) ? chord[0] : chord[Math.min(1, chord.length - 1)];
      tone(midi(g.root + b - 12), t, stepDur * 3.2, 'sine', 0.13);
    }

    /* melody / arp */
    if (current === 'electro') {
      if (s % 2 === 0) {
        var n = chord[Math.floor(s / 2) % chord.length] + 12;
        tone(midi(g.root + n), t, stepDur * 1.7, 'square', 0.045, 1600);
      }
    } else if (s === 2 || s === 6 || s === 10 || s === 14) {
      if (Math.random() < 0.45) {
        var pick = chord[Math.floor(Math.random() * chord.length)] + 12;
        if (Math.random() < 0.25) pick += 12;
        tone(midi(g.root + pick), t, stepDur * 2.4, 'triangle', 0.06);
      }
      if (current === 'ambient' && Math.random() < 0.25) {
        tone(midi(g.root + chord[Math.floor(Math.random() * chord.length)] + 24), t, stepDur * 8, 'sine', 0.03);
      }
    }

    /* drums */
    if (current === 'lofi') {
      if (s % 8 === 0) kick(t, 0.4);
      if (s === 4 || s === 12) noise(t, 0.14, 0.16, false);
      if (s % 2 === 1) noise(t, 0.045, 0.035, true);
    } else if (current === 'jazz') {
      if (s === 0) kick(t, 0.28);
      if (s === 6 || s === 14) noise(t, 0.06, 0.05, true);
    } else if (current === 'electro') {
      if (s % 4 === 0) kick(t, 0.55);
      if (s % 2 === 1) noise(t, 0.05, 0.09, true);
      if (s === 8) noise(t, 0.14, 0.14, false);
    }
  }

  function schedule() {
    if (!ctx) return;
    var stepDur = 60 / GENRES[current].bpm / 4;
    while (nextTime < ctx.currentTime + 0.3) {
      scheduleStep(step, nextTime);
      step = (step + 1) % 64;
      nextTime += stepDur;
    }
  }

  function start() {
    ensureCtx();
    if (!ctx || playing) return;
    ctx.resume();
    step = 0;
    nextTime = ctx.currentTime + 0.1;
    timer = setInterval(schedule, 80);
    playing = true;
    deck.classList.add('is-playing');
  }

  function stop() {
    playing = false;
    deck.classList.remove('is-playing');
    if (timer) { clearInterval(timer); timer = null; }
  }

  playBtn.addEventListener('click', function () { playing ? stop() : start(); });

  genres.forEach(function (b) {
    b.addEventListener('click', function () {
      current = b.dataset.genre;
      genres.forEach(function (x) { x.classList.toggle('is-on', x === b); });
      titleEl.textContent = GENRES[current].title;
      labelTitle.textContent = GENRES[current].title;
    });
  });

  vol.addEventListener('input', function () {
    volume = Number(this.value);
    if (master) master.gain.value = volume / 100;
  });

  /* ---------------- visualizer ---------------- */
  var freq = new Uint8Array(256);
  function draw() {
    requestAnimationFrame(draw);
    if (!vctx) return;
    var W = viz.width, H = viz.height;
    vctx.clearRect(0, 0, W, H);
    vctx.fillStyle = 'rgba(5,7,6,0.5)';
    vctx.fillRect(0, 0, W, H);
    var bars = 48, bw = W / bars;
    if (playing && analyser) {
      analyser.getByteFrequencyData(freq);
      for (var i = 0; i < bars; i++) {
        var v = freq[Math.floor(i * (freq.length * 0.6) / bars)] / 255;
        var h = Math.max(3, v * H * 0.92);
        var grad = vctx.createLinearGradient(0, H - h, 0, H);
        grad.addColorStop(0, '#2FC9BC');
        grad.addColorStop(1, 'rgba(1,132,127,0.15)');
        vctx.fillStyle = grad;
        vctx.fillRect(i * bw + bw * 0.2, H - h, bw * 0.6, h);
      }
    } else {
      /* idle heartbeat line */
      vctx.strokeStyle = 'rgba(47,201,188,0.35)';
      vctx.lineWidth = 1.5;
      vctx.beginPath();
      for (var x = 0; x < W; x += 2) {
        var y = H / 2 + Math.sin(x * 0.06) * 4 + Math.sin(x * 0.13) * 2;
        x === 0 ? vctx.moveTo(x, y) : vctx.lineTo(x, y);
      }
      vctx.stroke();
      vctx.fillStyle = 'rgba(245,246,241,0.35)';
      vctx.font = '10px monospace';
      vctx.fillText('▸ press play', 14, 20);
    }
  }
  draw();
})();
