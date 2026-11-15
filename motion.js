/* KitchenGuard — capa de movimiento.
   Todo es transform/opacity. Con "reducir movimiento" nada se oculta ni se mueve. */
(function () {
  'use strict';
  window.__kgMotion = true;

  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  var root = document.documentElement;
  var introOn = root.classList.contains('intro-on');

  if (reduce) root.classList.remove('js');

  /* ---------- Titulares: palabra por palabra ---------- */
  $$('[data-split]').forEach(function (el) {
    var text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.innerHTML = text.split(/\s+/).map(function (w, i) {
      return '<span class="w" aria-hidden="true"><span style="--i:' + i + '">' + w + '</span></span>';
    }).join(' ');
  });

  /* ---------- Cifras que cuentan ---------- */
  function fmt(v, dec, pre) { return (pre || '') + v.toFixed(dec).replace('.', ','); }
  function countUp(el) {
    if (el.__done) return;
    el.__done = true;
    var end = parseFloat(el.dataset.count), dec = +el.dataset.dec || 0, pre = el.dataset.pre || '';
    if (reduce) { el.textContent = fmt(end, dec, pre); return; }
    var t0 = null;
    function tick(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / 1300, 1);
      el.textContent = fmt(end * (1 - Math.pow(1 - p, 3)), dec, pre);
      if (p < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  /* ---------- Entradas al hacer scroll ---------- */
  var targets = $$('[data-split]:not([data-split="hero"]), .rv:not(.mega), .bars li, .stack, .weeks li');
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      var t = e.target;
      t.classList.add('in');
      $$('[data-count]', t).forEach(countUp);
      if (t.matches('[data-count]')) countUp(t);
      io.unobserve(t);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  targets.forEach(function (t, i) {
    if (t.classList.contains('rv')) t.style.setProperty('--rd', '0ms');
    io.observe(t);
  });

  // La marca gigante del pie se activa con el pie completo (su recorte la deja fuera del umbral)
  var mega = $('.mega'), foot = $('.foot');
  if (mega && foot) {
    new IntersectionObserver(function (es, o) {
      es.forEach(function (e) { if (e.isIntersecting) { mega.classList.add('in'); o.disconnect(); } });
    }, { threshold: 0.2 }).observe(foot);
  }

  // El titular del hero entra tras la intro
  var h1 = $('[data-split="hero"]');
  if (h1 && !introOn) setTimeout(function () { h1.classList.add('in'); }, 30);

  // El borde de llamas y cifras del hero ya visibles
  $$('[data-count]').forEach(function (el) {
    if (el.getBoundingClientRect().top < innerHeight && !el.closest('.bars,.stack')) countUp(el);
  });

  /* ---------- Borde de llamas del hero ---------- */
  var edge = $('#edge');
  var NS = 'http://www.w3.org/2000/svg';
  function buildEdge() {
    var w = edge.clientWidth || innerWidth, h = 54;
    var step = w < 700 ? 30 : 38;
    var n = Math.ceil(w / step) + 1;
    var svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    svg.setAttribute('preserveAspectRatio', 'none');
    var base = document.createElementNS(NS, 'rect');
    base.setAttribute('class', 'eb');
    base.setAttribute('x', 0); base.setAttribute('y', h - 6); base.setAttribute('width', w); base.setAttribute('height', 8);
    svg.appendChild(base);
    for (var i = 0; i < n; i++) {
      var tall = 16 + ((i * 53) % 7) * 5;           // alturas desiguales y estables
      var p = document.createElementNS(NS, 'path');
      var x = i * step - step / 2, bw = step * 0.9, top = h - 4 - tall;
      p.setAttribute('class', 'ef');
      p.setAttribute('d', 'M' + (x + bw / 2) + ' ' + top +
        'C' + (x + bw * 0.3) + ' ' + (top + tall * 0.35) + ' ' + x + ' ' + (top + tall * 0.55) + ' ' + x + ' ' + (h - 4) +
        'L' + (x + bw) + ' ' + (h - 4) +
        'C' + (x + bw) + ' ' + (top + tall * 0.55) + ' ' + (x + bw * 0.7) + ' ' + (top + tall * 0.35) + ' ' + (x + bw / 2) + ' ' + top + 'Z');
      p.style.animationDelay = (-(i * 211 % 2200)) + 'ms';
      svg.appendChild(p);
    }
    edge.innerHTML = '';
    edge.appendChild(svg);
  }
  buildEdge();
  var rt;
  addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(buildEdge, 200); });

  /* ---------- Escena del kit: se arma con el scroll ---------- */
  var stage = $('#stage');
  var steps = $$('#steps li');
  if (stage && steps.length) {
    var sio = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        steps.forEach(function (s) { s.classList.toggle('on', s === e.target); });
        stage.dataset.step = e.target.dataset.step;
      });
    }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
    steps.forEach(function (s) { sio.observe(s); });
    if (reduce) { stage.dataset.step = '3'; steps.forEach(function (s) { s.classList.add('on'); }); }
  }

  /* ---------- Menú flotante + progreso + banda ---------- */
  var dock = $('#dock');
  var prog = $('#progress');
  var band = $('#bandTrack');
  var heroEl = $('#inicio');
  var links = $$('.dock nav a');
  var ticking = false;

  function frame() {
    ticking = false;
    var y = scrollY;
    var max = document.documentElement.scrollHeight - innerHeight;
    prog.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    dock.classList.toggle('on', y > heroEl.offsetHeight * 0.8);
    if (band && !reduce) {
      var half = band.scrollWidth / 2;
      var off = (y * 0.55) % half;
      band.style.transform = 'translate3d(' + (-off) + 'px,0,0)';
    }
  }
  addEventListener('scroll', function () {
    if (!ticking) { ticking = true; requestAnimationFrame(frame); }
  }, { passive: true });
  frame();

  var secs = links.map(function (a) { return document.getElementById(a.dataset.sec); }).filter(Boolean);
  var aio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      links.forEach(function (a) { a.classList.toggle('act', a.dataset.sec === e.target.id); });
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(function (s) { aio.observe(s); });

  /* ---------- Teléfono: inclinación con resorte ---------- */
  var tilt = $('#tilt');
  if (tilt && fine && !reduce) {
    var tx = 0, ty = 0, cx = 0, cy = 0, raf = null;
    function loop() {
      cx += (tx - cx) * 0.09;
      cy += (ty - cy) * 0.09;
      tilt.style.setProperty('--rx', cx.toFixed(2) + 'deg');
      tilt.style.setProperty('--ry', cy.toFixed(2) + 'deg');
      if (Math.abs(tx - cx) > 0.02 || Math.abs(ty - cy) > 0.02) raf = requestAnimationFrame(loop);
      else raf = null;
    }
    function kick() { if (!raf) raf = requestAnimationFrame(loop); }
    heroEl.addEventListener('pointermove', function (e) {
      var r = tilt.getBoundingClientRect();
      var nx = (e.clientX - (r.left + r.width / 2)) / innerWidth;   // -.5 .. .5
      var ny = (e.clientY - (r.top + r.height / 2)) / innerHeight;
      ty = Math.max(-9, Math.min(9, nx * 22));
      tx = Math.max(-7, Math.min(7, -ny * 16));
      kick();
    });
    heroEl.addEventListener('pointerleave', function () { tx = 0; ty = 0; kick(); });
  }

  /* ---------- Botones magnéticos (hero) ---------- */
  if (fine && !reduce) {
    $$('.mag').forEach(function (b) {
      b.addEventListener('pointermove', function (e) {
        var r = b.getBoundingClientRect();
        b.style.setProperty('--mx', ((e.clientX - r.left - r.width / 2) * 0.18).toFixed(1) + 'px');
        b.style.setProperty('--my', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
      });
      b.addEventListener('pointerleave', function () {
        b.style.setProperty('--mx', '0px');
        b.style.setProperty('--my', '0px');
      });
    });
  }

  /* ---------- Fin de la intro ---------- */
  /* ---------- Puerta de entrada: el clic habilita el sonido ---------- */
  if (introOn) {
    var opened = false;
    var enterSound = $('#enterSound'), enterMute = $('#enterMute');
    function openSite(withSound) {
      if (opened) return;
      opened = true;
      if (withSound) {
        var box = $('#sound');
        box.checked = true;
        box.dispatchEvent(new Event('change'));   // arranca el audio y la firma de marca
      }
      root.classList.add('intro-open');
      setTimeout(function () { if (h1) h1.classList.add('in'); }, 350);
      setTimeout(function () { root.classList.remove('intro-on', 'intro-open'); }, 1100);
    }
    enterSound.addEventListener('click', function () { openSite(true); });
    enterMute.addEventListener('click', function () { openSite(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') openSite(false); });
    enterSound.focus({ preventScroll: true });
  }
})();
