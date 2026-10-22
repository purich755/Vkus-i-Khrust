/* «Витрина»: три бесконечные полки в разные стороны с разной скоростью (GSAP-тикер, ряды
   продублированы), наведение замедляет ряд до 0.2. Клик — лайтбокс со «шторкой-слоем»,
   счётчиком, стрелками, свайпом, ←/→/Esc и фокус-ловушкой; Lenis на это время стоит. */
(function () {
  'use strict';

  function marquee(reduce) {
    const rows = [...document.querySelectorAll('.rowm')];
    if (reduce) { rows.forEach((r) => { r.style.overflowX = 'auto'; }); return; }
    rows.forEach((row) => {
      const inner = row.querySelector('.rowm__in');
      const orig = [...inner.children];
      orig.forEach((el) => { const c = el.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.tabIndex = -1; c.dataset.clone = '1'; inner.appendChild(c); });
      const dir = +row.dataset.dir || -1, speed = +row.dataset.speed || 50;
      let x = 0, half = 0, ts = 1, target = 1, visible = false;
      const measure = () => { half = inner.scrollWidth / 2; };
      measure();
      new ResizeObserver(measure).observe(inner);
      new IntersectionObserver(([e]) => { visible = e.isIntersecting; }).observe(row);
      row.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') target = .2; });
      row.addEventListener('pointerleave', () => { target = 1; });
      row.addEventListener('focusin', () => { target = 0; });
      row.addEventListener('focusout', () => { target = 1; });
      gsap.ticker.add((t, dt) => {
        if (!visible || !half) return;
        ts += (target - ts) * .08;
        x += dir * speed * ts * (dt / 1000);
        if (x <= -half) x += half;
        if (x > 0) x -= half;
        inner.style.transform = `translate3d(${x}px,0,0)`;
      });
    });
  }

  function lightbox(lenis) {
    const lb = document.getElementById('lb');
    const items = [...document.querySelectorAll('.rowm .g:not([data-clone])')];
    const imgA = lb.querySelector('.lb__img'), imgB = lb.querySelector('.lb__img--next');
    const shutter = lb.querySelector('.lb__shutter');
    const cat = lb.querySelector('.lb__cat'), num = lb.querySelector('.lb__n'), alt = lb.querySelector('.lb__alt');
    let i = 0, opener = null, busy = false;
    const pad = (n) => String(n).padStart(2, '0');
    const src = (b) => { const im = b.querySelector('img'); return { s: im.currentSrc && im.currentSrc.includes('-1600') ? im.currentSrc : im.src.replace('-800.webp', innerWidth > 900 ? '-1600.webp' : '-800.webp'), a: im.alt, c: b.closest('.rowm').dataset.cat }; };

    function fill(k) {
      const d = src(items[k]);
      imgA.src = d.s; imgA.alt = d.a;
      cat.textContent = d.c; num.textContent = `${pad(k + 1)} / ${pad(items.length)}`; alt.textContent = d.a;
    }
    function open(k, from) {
      opener = from; i = k; fill(i);
      lb.hidden = false; lenis && lenis.stop();
      document.body.style.overflow = 'hidden';
      gsap.fromTo(lb, { opacity: 0 }, { opacity: 1, duration: .35 });
      lb.querySelector('.lb__close').focus();
    }
    function close() {
      gsap.to(lb, { opacity: 0, duration: .25, onComplete: () => { lb.hidden = true; } });
      lenis && lenis.start(); document.body.style.overflow = '';
      opener && opener.focus({ preventScroll: true });
    }
    function go(d) {
      if (busy) return;
      busy = true;
      const k = (i + d + items.length) % items.length;
      // шторка-слой проезжает по кадру и открывает следующий
      shutter.style.transformOrigin = d > 0 ? '0 50%' : '100% 50%';
      gsap.timeline({ onComplete: () => { busy = false; } })
        .to(shutter, { scaleX: 1, duration: .32, ease: 'power3.in' })
        .add(() => { i = k; fill(i); shutter.style.transformOrigin = d > 0 ? '100% 50%' : '0 50%'; })
        .to(shutter, { scaleX: 0, duration: .42, ease: 'power3.out' }, '+=.04');
    }
    items.forEach((b, k) => b.addEventListener('click', () => open(k, b)));
    document.querySelector('.shelf-rows').addEventListener('click', (e) => {
      const b = e.target.closest('.g[data-clone]');
      if (!b) return;
      const idx = [...b.parentElement.children].indexOf(b) - b.parentElement.children.length / 2;
      const orig = b.parentElement.children[idx];
      open(items.indexOf(orig), orig);
    });
    lb.querySelector('.lb__close').addEventListener('click', close);
    lb.querySelector('.lb__prev').addEventListener('click', () => go(-1));
    lb.querySelector('.lb__next').addEventListener('click', () => go(1));
    lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb__stage')) close(); });
    lb.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Tab') {
        const f = [...lb.querySelectorAll('button')];
        const a = f.indexOf(document.activeElement);
        e.preventDefault();
        f[(a + (e.shiftKey ? f.length - 1 : 1)) % f.length].focus();
      }
    });
    let sx = 0, sy = 0;
    lb.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; sy = e.touches[0].clientY; }, { passive: true });
    lb.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx, dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1);
    });
  }

  window.Gallery = { init(lenis, reduce) { marquee(reduce); lightbox(lenis); } };
})();
