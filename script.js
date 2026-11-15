(function () {
  'use strict';

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  /* ---------- Quemador: 12 llamas dibujadas ---------- */
  var NS = 'http://www.w3.org/2000/svg';
  var petals = $('#petals');
  for (var i = 0; i < 12; i++) {
    var g = document.createElementNS(NS, 'g');
    g.setAttribute('transform', 'rotate(' + i * 30 + ' 100 100)');
    var p = document.createElementNS(NS, 'path');
    p.setAttribute('class', 'fl');
    p.setAttribute('d', 'M100 30C96 40 94 48 100 56C106 48 104 40 100 30Z');
    p.style.animationDelay = (-(i * 137 % 1600)) + 'ms';
    g.appendChild(p);
    petals.appendChild(g);
  }

  /* ---------- Reloj del teléfono ---------- */
  var clock = $('#clock');
  function setClock() {
    var d = new Date();
    clock.textContent = d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  setClock();
  setInterval(setClock, 20000);

  /* ======================================================
     SONIDO — todo sintetizado, sin archivos de audio.
     Firma de marca: encendido de hornilla (clic, clic, clic),
     soplo de llama y un acorde ascendente de tres notas.
  ====================================================== */
  var ctx = null, master = null, bus = null, alarmTimer = null;

  function audioStart() {
    if (!ctx) {
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.9;
      var comp = ctx.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ctx.destination);

      // Eco corto para dar aire a las notas
      bus = ctx.createGain();
      var delay = ctx.createDelay(0.5);
      var fb = ctx.createGain();
      var wet = ctx.createGain();
      delay.delayTime.value = 0.19;
      fb.gain.value = 0.32;
      wet.gain.value = 0.28;
      bus.connect(master);
      bus.connect(delay);
      delay.connect(fb);
      fb.connect(delay);
      delay.connect(wet);
      wet.connect(master);
    }
    if (ctx.state === 'suspended') ctx.resume();
    return true;
  }

  function noiseBuffer(sec) {
    var len = Math.floor(ctx.sampleRate * sec);
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var n = 0; n < len; n++) d[n] = Math.random() * 2 - 1;
    return buf;
  }

  function tone(freq, t, dur, type, gain, out) {
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(out || bus);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function click(t) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuffer(0.02);
    var hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 2600;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.55, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.018);
    s.connect(hp); hp.connect(g); g.connect(master);
    s.start(t);
  }

  function whoosh(t) {
    var s = ctx.createBufferSource();
    s.buffer = noiseBuffer(0.7);
    var bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(350, t);
    bp.frequency.exponentialRampToValueAtTime(2200, t + 0.5);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.2, t + 0.18);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.62);
    s.connect(bp); bp.connect(g); g.connect(master);
    s.start(t);
  }

  // Firma de marca (~2 s)
  function sting() {
    if (!ctx) return;
    var t = ctx.currentTime + 0.03;
    click(t); click(t + 0.1); click(t + 0.2);
    whoosh(t + 0.28);
    // Base grave, cálida
    tone(110, t + 0.5, 1.9, 'sine', 0.2);
    tone(165, t + 0.5, 1.7, 'sine', 0.08);
    // Tres notas ascendentes (mi, si, mi)
    var notes = [[659.25, 0.52], [987.77, 0.7], [1318.5, 0.9]];
    notes.forEach(function (nt) {
      tone(nt[0], t + nt[1], 1.5, 'sine', 0.2);
      tone(nt[0] * 2, t + nt[1], 0.9, 'triangle', 0.035);
    });
  }

  function chimeOk() {
    if (!ctx) return;
    var t = ctx.currentTime + 0.02;
    tone(880, t, 0.7, 'sine', 0.16);
    tone(1318.5, t + 0.1, 0.8, 'sine', 0.09);
  }

  function dingWarn() {
    if (!ctx) return;
    var t = ctx.currentTime + 0.02;
    tone(784, t, 0.35, 'triangle', 0.2);
    tone(622.25, t + 0.22, 0.5, 'triangle', 0.2);
  }

  function pushPing() {
    if (!ctx) return;
    var t = ctx.currentTime + 0.9;
    tone(1318.5, t, 0.35, 'sine', 0.14);
    tone(1760, t + 0.12, 0.5, 'sine', 0.14);
  }

  function alarmBurst() {
    if (!ctx) return;
    var t = ctx.currentTime + 0.01;
    var lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    lp.connect(master);
    for (var b = 0; b < 3; b++) tone(1046.5, t + b * 0.2, 0.13, 'square', 0.09, lp);
  }

  function alarmStart() {
    alarmStop();
    if (!ctx || !soundOn()) return;
    alarmBurst();
    alarmTimer = setInterval(alarmBurst, 1000);
  }
  function alarmStop() {
    if (alarmTimer) { clearInterval(alarmTimer); alarmTimer = null; }
  }

  /* ---------- Estado de la simulación ---------- */
  var hero = $('#inicio');
  var soundBox = $('#sound');
  var wifiBox = $('#wifi');
  var muteBtn = $('#muteBtn');
  var themeColor = $('#themeColor');
  var muted = false;
  var current = 'ok';

  var COPY = {
    ok:   { title: 'Todo en calma', sub: 'El sensor no detecta gas.', alarm: 'Lista' },
    warn: { title: 'Nivel elevado', sub: 'Revisa la cocina y ventila el espacio.', alarm: 'Vigilando' },
    bad:  { title: 'Posible fuga de gas', sub: 'Ventila y no uses fuego. Cierra la llave del cilindro si es seguro.', alarm: 'Sonando' }
  };

  function soundOn() { return soundBox.checked; }

  function render(announce) {
    var online = wifiBox.checked;
    var c = COPY[current];
    hero.dataset.state = current;
    hero.classList.toggle('offline', !online);
    themeColor.setAttribute('content', current === 'bad' ? '#D63A06' : '#0B4DFF');

    $('#stateTitle').textContent = c.title;
    $('#stateSub').textContent = c.sub;
    $('#rowAlarm').textContent = current === 'bad' && muted ? 'Silenciada' : c.alarm;
    $('#rowNet').textContent = !online ? (current === 'bad' ? 'Solo alarma local' : 'Sin internet')
      : current === 'bad' ? 'Aviso enviado' : 'Conectado';

    muteBtn.disabled = !(current === 'bad' && !muted);

    $$('.seg button').forEach(function (b) {
      var on = b.dataset.level === current;
      b.setAttribute('aria-checked', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
    });

    if (!announce) return;

    // Sonido por estado
    alarmStop();
    if (!soundOn() || !audioStart()) return;
    if (current === 'ok') chimeOk();
    if (current === 'warn') dingWarn();
    if (current === 'bad') {
      if (!muted) alarmStart();
      if (online) pushPing();
    }
  }

  function setLevel(level) {
    if (level === current) return;
    current = level;
    muted = false;
    render(true);
  }

  $$('.seg button').forEach(function (b) {
    b.addEventListener('click', function () { setLevel(b.dataset.level); });
    b.addEventListener('keydown', function (e) {
      var order = ['ok', 'warn', 'bad'];
      var idx = order.indexOf(current);
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') idx = (idx + 1) % 3;
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') idx = (idx + 2) % 3;
      else return;
      e.preventDefault();
      setLevel(order[idx]);
      $('.seg button[data-level="' + order[idx] + '"]').focus();
    });
  });

  wifiBox.addEventListener('change', function () {
    render(false);
    if (current === 'bad' && wifiBox.checked && soundOn() && ctx) pushPing();
  });

  soundBox.addEventListener('change', function () {
    if (soundBox.checked) {
      if (!audioStart()) { soundBox.checked = false; return; }
      sting();
      if (current === 'bad' && !muted) setTimeout(function () { if (soundOn()) alarmStart(); }, 2300);
    } else {
      alarmStop();
    }
  });

  muteBtn.addEventListener('click', function () {
    muted = true;
    alarmStop();
    render(false);
  });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) alarmStop();
    else if (current === 'bad' && !muted && soundOn()) alarmStart();
  });

  render(false);
})();
