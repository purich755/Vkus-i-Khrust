/* «Вкус и Хруст» — сцены страницы: Lenis ↔ ScrollTrigger, прелоадер «Нить», шапка со статусом,
   hero «ХРУСТ», «О нас», «Сто лет в разрезе», трек выпечки, «Татарский стол», «Морозилка»,
   ламинация секций, отзывы, «Как заказать», золотая нить, подвал. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mqMobile = matchMedia('(max-width: 760px)');
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGsap = !!(window.gsap && window.ScrollTrigger);
  if (reduce) html.classList.add('no-motion');

  /* ── шрифт: если ось SHRP не пришла — фолбэк на wght ─────────────── */
  document.fonts && document.fonts.load('800 20px Geologica').then((l) => { if (!l.length) html.classList.add('no-shrp'); });

  /* статус «Открыто / Печём / Закрыто» считает встроенный скрипт в index.html — до загрузки GSAP */

  if (!hasGsap) { html.classList.add('no-gsap'); $$('[data-rise]').forEach((e) => (e.style.opacity = 1)); return; }

  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ── Lenis ─────────────────────────────────────────────────────────── */
  let lenis = null;
  if (!reduce && window.Lenis) {
    lenis = new Lenis({ lerp: .1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    ScrollTrigger.addEventListener('refresh', () => lenis.resize());
    window.__lenis = lenis;
  }
  const scrollToEl = (el) => {
    const target = el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el;
    const y = target.getBoundingClientRect().top + scrollY - (el.id === 'top' ? 0 : 0);
    lenis ? lenis.scrollTo(y, { duration: 1.4 }) : scrollTo({ top: y, behavior: reduce ? 'auto' : 'smooth' });
  };
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const el = document.getElementById(a.getAttribute('href').slice(1));
    if (!el) return;
    e.preventDefault();
    closeMenu();
    scrollToEl(el);
  });

  /* ── прелоадер «Нить» ─────────────────────────────────────────────── */
  /* прелоадер «Нить» целиком на CSS (см. .pre в style.css) — скрипты подключаются после load */

  /* ── шапка: прячется вниз, появляется вверх ──────────────────────── */
  const hdr = $('#hdr');
  let lastY = 0;
  function onScrollHdr(y) {
    const hero = $('#top');
    const past = y > (hero ? hero.offsetHeight * .6 : 300);
    hdr.classList.toggle('is-solid', y > 40);
    if (!$('#menu').hidden) return;
    if (past && y > lastY + 4) hdr.classList.add('is-hidden');
    else if (y < lastY - 4 || !past) hdr.classList.remove('is-hidden');
    lastY = y;
  }
  if (lenis) lenis.on('scroll', ({ scroll }) => onScrollHdr(scroll));
  else addEventListener('scroll', () => onScrollHdr(scrollY), { passive: true });

  /* ── мобильное меню: пункты «слоями» снизу ────────────────────────── */
  const burger = $('.burger'), menu = $('#menu');
  function openMenu() {
    menu.hidden = false; burger.setAttribute('aria-expanded', 'true'); burger.setAttribute('aria-label', 'Закрыть меню');
    hdr.classList.remove('is-hidden'); hdr.classList.add('is-solid');
    lenis && lenis.stop();
    gsap.fromTo($$('nav a, .menu__foot > *', menu), { yPercent: 60, opacity: 0 }, { yPercent: 0, opacity: 1, duration: .6, ease: 'power3.out', stagger: .05 });
    $('nav a', menu).focus();
  }
  function closeMenu() {
    if (menu.hidden) return;
    menu.hidden = true; burger.setAttribute('aria-expanded', 'false'); burger.setAttribute('aria-label', 'Открыть меню');
    lenis && lenis.start();
  }
  burger.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { closeMenu(); burger.focus(); } });

  /* ── курсор ─────────────────────────────────────────────────────────── */
  if (fine && !reduce) {
    html.classList.add('has-cursor');
    const cur = $('.cursor'), lbl = $('.cursor__label');
    let mx = -100, my = -100, cx = -100, cy = -100;
    addEventListener('pointermove', (e) => {
      mx = e.clientX; my = e.clientY;
      const t = e.target.closest ? e.target : null;
      const zone = t && t.closest('[data-cursor]');
      const link = t && t.closest('a, button, input, [role="radio"]');
      cur.classList.toggle('is-big', !!zone && !(link && !link.matches('[data-cursor], .g')));
      cur.classList.toggle('is-link', !!link && !zone);
      if (zone) lbl.textContent = zone.dataset.cursor;
    }, { passive: true });
    gsap.ticker.add(() => { cx += (mx - cx) * .25; cy += (my - cy) * .25; cur.style.transform = `translate3d(${cx}px,${cy}px,0)`; });
  }

  /* ── hero: слои слова «ХРУСТ» + крошки ───────────────────────────── */
  (function hero() {
    const sec = $('#top');
    const layers = $$('.hero__l', sec);
    const amp = [4, -9, 14, -18, 11, -6];
    const cur = layers.map(() => 0);
    let tx = 0, active = true;
    new IntersectionObserver(([e]) => { active = e.isIntersecting; }).observe(sec);
    if (!reduce) {
      if (fine) sec.addEventListener('pointermove', (e) => { tx = (e.clientX / innerWidth - .5) * 2; });
      sec.addEventListener('pointerleave', () => { tx = 0; });
      gsap.ticker.add(() => {
        if (!active) return;
        if (!fine) tx = Math.min(1, scrollY / (innerHeight * .8)) * 1.4;
        layers.forEach((l, i) => {
          const target = tx * amp[i];
          cur[i] += (target - cur[i]) * .08;
          l.style.transform = `translate3d(${cur[i].toFixed(2)}px,0,0)`;
        });
      });
      const cv = $('.crumbs', sec);
      const cr = Crumbs.make(cv);
      sec.addEventListener('click', (e) => {
        if (e.target.closest('a, button')) return;
        const r = cv.getBoundingClientRect();
        cr.burst(e.clientX - r.left, e.clientY - r.top);
      });
    }
    // срез внизу: линии сходятся при уходе со сцены
    const cut = $$('.cut--hero i', sec);
    if (!reduce) gsap.fromTo(cut, { scaleX: 1 }, { scaleX: (i) => .06 + (i % 3) * .05, transformOrigin: (i) => (i % 2 ? '100% 50%' : '0% 50%'), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: 'bottom top', scrub: true } });
  })();

  /* ── ламинация: секция закрепляется, следующая наезжает на неё ─────── */
  const laminate = (el) => {
    if (reduce) return;
    const shade = document.createElement('div');
    shade.className = 'lam-shade';
    el.appendChild(shade);
    ScrollTrigger.create({
      trigger: el, start: () => (el.offsetHeight > innerHeight ? 'bottom bottom' : 'top top'), end: '+=100%',
      pin: true, pinSpacing: false, anticipatePin: 1,
    });
    gsap.to(shade, { opacity: .55, ease: 'none', scrollTrigger: { trigger: el, start: () => (el.offsetHeight > innerHeight ? 'bottom bottom' : 'top top'), end: '+=100%', scrub: true } });
  };

  /* Пины создаём сверху вниз — тогда триггеры ниже учитывают их длину */
  laminate($('#top'));

  /* ── 04 Сто лет в разрезе ─────────────────────────────────────────── */
  (function century() {
    const sec = $('#century');
    if (reduce) return;
    const layers = $$('.layer', sec);
    const word = $('.century__word', sec);
    const count = $('.century__count b', sec);
    const shrp = { v: 0 };
    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    layers.forEach((l, i) => {
      tl.fromTo(l, { y: () => -innerHeight * 1.05 }, { y: 0, duration: 1, ease: 'power2.in' }, i * 1.15);
      // нижние слои проседают под новым, как тесто под ладонью
      const below = layers.slice(0, i);
      if (below.length) tl.to(below, { scaleY: .96, duration: .12, ease: 'power1.out' }, i * 1.15 + 1).to(below, { scaleY: 1, duration: .3, ease: 'power2.out' }, '>');
    });
    const T = layers.length * 1.15 + .5;
    const cutY = [0, 5, 13, 17, 28];
    tl.to($$('.layer > *', sec), { opacity: 0, duration: .4 }, T)
      // полосы сжимаются в тонкие линии «среза» у основания
      .to(layers, { y: (i, el) => parseFloat(getComputedStyle(el).bottom) - cutY[i], scaleY: .022, duration: 1.1, ease: 'power3.inOut', stagger: .05 }, T + .1)
      .fromTo(word, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: .8, ease: 'power3.out' }, T + .9)
      .to(shrp, { v: 100, duration: 1, onUpdate: () => { word.style.fontVariationSettings = `"CRSV" 0, "SHRP" ${shrp.v.toFixed(1)}`; } }, T + 1.3)
      .to({}, { duration: .5 });
    const st = ScrollTrigger.create({
      trigger: sec, start: 'top top', end: () => '+=' + (mqMobile.matches ? 220 : 320) + '%', pin: true, scrub: 1, animation: tl, invalidateOnRefresh: true,
      onUpdate: (s) => {
        const t = s.progress * tl.duration();
        const n = Math.max(1, Math.min(5, Math.floor(t / 1.15 + .15)));
        if (count.textContent !== String(n)) count.textContent = n;
      },
    });
    void st;
  })();

  /* ── 06 трек выпечки ─────────────────────────────────────────────── */
  (function bakery() {
    const sec = $('#bakery');
    const row = $('.track__row', sec);
    const frames = $$('.frame', sec);
    const titles = (f) => $('.frame__t', f);
    const mm = gsap.matchMedia();
    mm.add('(min-width: 761px) and (prefers-reduced-motion: no-preference)', () => {
      const dist = () => row.scrollWidth - innerWidth;
      const tw = gsap.to(row, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: sec, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true } });
      gsap.set(frames, { scale: .92 });
      frames.forEach((f) => ScrollTrigger.create({
        trigger: f, containerAnimation: tw, start: 'left 72%', end: 'right 28%',
        onToggle: (s) => { gsap.to(f, { scale: s.isActive ? 1 : .92, duration: .7, ease: 'power3.out', overwrite: true }); titles(f)?.classList.toggle('is-crisp', s.isActive); },
      }));
      return () => gsap.set(frames, { clearProps: 'transform' });
    });
    mm.add('(max-width: 760px)', () => {
      // нативный свайп: «хруст» заголовка у кадра, который встал в центр
      const io = new IntersectionObserver((es) => es.forEach((e) => titles(e.target)?.classList.toggle('is-crisp', e.isIntersecting)), { root: $('.track', sec), threshold: .7 });
      frames.forEach((f) => io.observe(f));
      return () => io.disconnect();
    });
  })();

  laminate($('#tatar'));
  laminate($('#feast'));
  laminate($('#order'));
  laminate($('#where'));

  /* ── 03 «О нас»: построчное появление + подчёркивания-нити ─────────── */
  function splitLines(el) {
    const orig = el.innerHTML;
    const words = [];
    [...el.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/([ \t\n]+)/).forEach((part) => {
          if (!part) return;
          if (/^[ \t\n]+$/.test(part)) { words.push(document.createTextNode(' ')); return; }
          const s = document.createElement('span'); s.textContent = part; words.push(s);
        });
      } else { const s = document.createElement('span'); s.appendChild(n.cloneNode(true)); words.push(s); }
    });
    el.textContent = '';
    words.forEach((w) => el.appendChild(w));
    const spans = words.filter((w) => w.nodeType === 1);
    const lines = [];
    let top = null;
    spans.forEach((s) => { const t = s.offsetTop; if (top === null || Math.abs(t - top) > 4) { lines.push([]); top = t; } lines[lines.length - 1].push(s); });
    el.textContent = '';
    const inners = lines.map((ws) => {
      const line = document.createElement('span'); line.className = 'sline';
      const inner = document.createElement('span');
      ws.forEach((w, i) => { inner.appendChild(w); if (i < ws.length - 1) inner.appendChild(document.createTextNode(' ')); });
      line.appendChild(inner); el.appendChild(line);
      return inner;
    });
    return { inners, restore: () => { el.innerHTML = orig; } };
  }
  (function about() {
    const els = $$('[data-lines]');
    const draw = (root) => $$('mark[data-u]', root).forEach((m) => m.classList.add('is-drawn'));
    if (reduce) { els.forEach(draw); return; }
    els.forEach((el) => {
      gsap.set(el, { visibility: 'hidden' });
      ScrollTrigger.create({
        trigger: el, start: 'top 86%', once: true,
        onEnter: () => {
          const sp = splitLines(el);
          gsap.set(el, { visibility: 'visible' });
          gsap.fromTo(sp.inners, { yPercent: 110 }, { yPercent: 0, duration: 1, ease: 'power4.out', stagger: .08, onComplete: () => { sp.restore(); draw(el); } });
        },
      });
    });
    gsap.fromTo('.sign', { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.sign', start: 'top 92%', once: true } });
    // фото зала двигается внутри маски
    gsap.fromTo('.about__photo .mask img', { yPercent: -12 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.about__photo', start: 'top bottom', end: 'bottom top', scrub: true } });
    gsap.fromTo('.about__photo .mask', { clipPath: 'inset(30% 0 0 0 round 160px 160px 4px 4px)' }, { clipPath: 'inset(0% 0 0 0 round 160px 160px 4px 4px)', duration: 1.4, ease: 'power3.out', scrollTrigger: { trigger: '.about__photo', start: 'top 80%', once: true } });
  })();

  /* ── 05 «Три полки»: плитки встают с разным запаздыванием ──────────── */
  if (!reduce) {
    gsap.from('.shelf', { y: (i) => 80 + i * 40, opacity: 0, duration: 1.2, ease: 'power3.out', stagger: .12, scrollTrigger: { trigger: '.shelves__row', start: 'top 85%', once: true } });
    gsap.from('.shelves .h2', { opacity: 0, y: 30, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: '.shelves .h2', start: 'top 88%', once: true } });
  }

  /* ── 07 «Татарский стол»: фото раскрываются полосами, цены отсчитываются ─ */
  (function tatar() {
    const fmt = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
    $$('.reveal-strips').forEach((box) => {
      if (reduce) return;
      const cover = document.createElement('div');
      cover.className = 'strips-cover';
      cover.innerHTML = '<i></i>'.repeat(6);
      box.appendChild(cover);
      const strips = $$('i', cover);
      ScrollTrigger.create({
        trigger: box, start: 'top 82%', once: true,
        onEnter: () => gsap.to(strips, { scaleX: 0, transformOrigin: (i) => (i % 2 ? '100% 50%' : '0% 50%'), duration: 1.1, ease: 'power4.out', stagger: .07, onComplete: () => cover.remove() }),
      });
    });
    $$('[data-count]').forEach((b) => {
      const to = +b.dataset.count;
      if (reduce) return;
      const o = { v: 0 };
      b.textContent = '0';
      ScrollTrigger.create({ trigger: b, start: 'top 92%', once: true, onEnter: () => gsap.to(o, { v: to, duration: 1.4, ease: 'power2.out', onUpdate: () => { b.textContent = fmt(o.v); } }) });
    });
    if (!reduce) {
      gsap.fromTo('.tulip--2', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: '.rv', start: 'top 75%', once: true } });
      gsap.fromTo('.tulip--1', { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.8, ease: 'power2.out', scrollTrigger: { trigger: '.tatar__mag', start: 'top 80%', once: true } });
      gsap.from('.tatar__h > *', { yPercent: 60, opacity: 0, duration: 1.1, ease: 'power4.out', stagger: .15, scrollTrigger: { trigger: '.tatar__h', start: 'top 85%', once: true } });
    }
  })();

  /* ── 08 «Морозилка»: фон теплеет, строки ложатся на «весы» ─────────── */
  if (!reduce) {
    gsap.fromTo('#frozen', { backgroundColor: '#DCE6EA' }, { backgroundColor: '#F2EDE5', ease: 'none', scrollTrigger: { trigger: '#frozen', start: 'top 40%', end: 'bottom 70%', scrub: true } });
    gsap.from('.scale li', { x: 40, opacity: 0, duration: .8, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: '.scale', start: 'top 85%', once: true } });
  }
  window.Frost && Frost.init();

  /* ── 09 калькулятор, 10 витрина ───────────────────────────────────── */
  window.Table && Table.init({ reduce });
  window.Gallery && Gallery.init(lenis, reduce);

  /* ── 11 отзывы: автосмена 6 с, прогресс — одна из линий «среза» ───── */
  (function reviews() {
    const slides = $$('.rv__s');
    const linesBox = $('.rv__lines');
    linesBox.innerHTML = slides.map(() => '<i><b></b></i>').join('');
    const lines = $$('i', linesBox);
    const num = $('.rv__n');
    let i = 0, tw = null, inView = false;
    const pad = (n) => String(n).padStart(2, '0');
    function show(k) {
      slides[i].classList.remove('is-on');
      i = (k + slides.length) % slides.length;
      slides[i].classList.add('is-on');
      num.textContent = `${pad(i + 1)} / ${pad(slides.length)}`;
      lines.forEach((l, j) => { l.classList.toggle('is-done', j < i); gsap.set($('b', l), { scaleX: j < i ? 1 : 0 }); });
      if (!reduce) gsap.fromTo($('blockquote', slides[i]), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: .7, ease: 'power3.out' });
      run();
    }
    function run() {
      tw && tw.kill();
      if (reduce || !inView) return;
      tw = gsap.fromTo($('b', lines[i]), { scaleX: 0 }, { scaleX: 1, duration: 6, ease: 'none', onComplete: () => show(i + 1) });
    }
    $$('.rv__btn').forEach((b) => b.addEventListener('click', () => show(i + +b.dataset.dir)));
    new IntersectionObserver(([e]) => { inView = e.isIntersecting; inView ? run() : tw && tw.pause(); }).observe($('.rv'));
    $('.rv').addEventListener('pointerenter', () => tw && tw.pause());
    $('.rv').addEventListener('pointerleave', () => tw && inView && tw.resume());
  })();

  /* ── 12 «Как заказать»: нить между шагами, ценники качаются ──────── */
  if (!reduce) {
    gsap.to('.steps__thread path', { strokeDashoffset: 0, ease: 'none', scrollTrigger: { trigger: '.steps', start: 'top 80%', end: 'bottom 55%', scrub: true } });
    gsap.from('.steps__n', { scale: 0, duration: .6, ease: 'back.out(2)', stagger: .25, scrollTrigger: { trigger: '.steps', start: 'top 70%', once: true } });
    gsap.from('.facts li', { y: 24, opacity: 0, duration: .7, ease: 'power3.out', stagger: .06, scrollTrigger: { trigger: '.facts', start: 'top 88%', once: true } });
    gsap.from('.pricetag', { rotation: (i) => (i % 2 ? 6 : -6), y: -20, opacity: 0, duration: 1.4, ease: 'elastic.out(1, .4)', stagger: .08, scrollTrigger: { trigger: '.tags', start: 'top 88%', once: true } });
    $$('.pricetag').forEach((t) => t.addEventListener('pointerenter', () => gsap.fromTo(t, { rotation: 2.5 }, { rotation: 0, duration: 1.4, ease: 'elastic.out(1.2, .22)', overwrite: true })));
  } else { gsap.set('.steps__thread path', { strokeDashoffset: 0 }); }

  /* ── 13 «Где мы» ──────────────────────────────────────────────────── */
  if (!reduce) {
    gsap.from('.amen li', { x: -20, opacity: 0, duration: .7, stagger: .07, ease: 'power3.out', scrollTrigger: { trigger: '.amen', start: 'top 88%', once: true } });
    gsap.from('.where__card', { rotation: -14, y: 60, opacity: 0, duration: 1.2, ease: 'power3.out', scrollTrigger: { trigger: '.where__map', start: 'top 75%', once: true } });
  }

  /* ── 14 подвал: буквы расслаиваются и становятся острыми ──────────── */
  (function footer() {
    if (reduce) return;
    const ls = $$('.ftr__layers > span');
    const offs = [-26, 18, -10, 30, -16];
    const word = $('.ftr__word');
    const o = { p: 0 };
    gsap.to(o, {
      p: 1, ease: 'none',
      scrollTrigger: { trigger: '.ftr', start: 'top 70%', end: 'clamp(bottom bottom)', scrub: 1 },
      onUpdate: () => {
        ls.forEach((l, i) => { l.style.transform = `translate3d(${(offs[i] * Math.sin(o.p * Math.PI)).toFixed(1)}px,0,0)`; });
        word.style.fontVariationSettings = `"CRSV" 0, "SHRP" ${(o.p * 100).toFixed(1)}`;
      },
    });
  })();

  /* ── «срезы» раскатываются ─────────────────────────────────────────── */
  $$('.cut:not(.cut--sm):not(.cut--hero)').forEach((c) => {
    c.dataset.roll = '';
    if (reduce) return;
    gsap.to($$('i', c), { scaleX: 1, duration: 1.2, ease: 'power3.out', stagger: .05, scrollTrigger: { trigger: c, start: 'top 90%', once: true } });
  });

  /* ── золотая нить ─────────────────────────────────────────────────── */
  const thread = (function () {
    const svg = $('#thread');
    const path = $('.thread__path', svg);
    const NS = 'http://www.w3.org/2000/svg';
    const mark = document.createElementNS(NS, 'path');
    mark.setAttribute('class', 'thread__mark');
    svg.appendChild(mark);
    const MARK = 'M125,290 C100,262 45,290 35,355 C25,430 80,478 150,470 C220,462 290,330 290,250 C290,205 262,195 240,225 C205,275 170,380 190,425 C205,460 280,440 330,400 C400,330 470,170 500,90 C520,35 495,20 470,60 C415,150 355,330 385,410 C410,460 490,440 540,400 C600,340 655,230 660,160 C662,110 630,100 610,140 C580,200 545,330 580,400 C610,450 730,440 785,350 C810,305 812,250 795,215';
    let total = 1, samples = [], markLen = 1;
    const docTop = (el) => { const t = el.parentElement.classList.contains('pin-spacer') ? el.parentElement : el; return t.getBoundingClientRect().top + scrollY; };

    function build() {
      if (reduce) return;
      const H = document.documentElement.scrollHeight;
      svg.setAttribute('height', H); svg.setAttribute('viewBox', `0 0 ${innerWidth} ${H}`);
      svg.style.height = H + 'px';
      const W = innerWidth, mob = mqMobile.matches;
      const secs = $$('[data-th]');
      const groups = [];
      let prev = null;
      secs.forEach((s) => {
        const top = docTop(s), h = s.offsetHeight;
        const toks = s.dataset.th.split(/\s+/);
        const pts = [];
        let loop = false;
        toks.forEach((t) => {
          if (t === 'loop') { loop = true; return; }
          let [x, y] = t.split(',').map(Number);
          // на телефоне нить идёт по самому краю, без петель — поля всего 16 px
          if (mob) { x = x < 50 ? 1.4 : 98.6; loop = false; }
          pts.push({ x: (x / 100) * W, y: top + (y / 100) * h, loop });
          loop = false;
        });
        // соседние секции сшиваем в одну линию, через сцены-пины нить «уходит за слой»
        const adjacent = prev && (prev.nextElementSibling === s || prev.parentElement.nextElementSibling === s || prev.nextElementSibling === s.parentElement);
        if (adjacent) groups[groups.length - 1].push(...pts); else groups.push(pts);
        prev = s;
      });
      // хвост — в знак логотипа в подвале
      const box = $('.ftr__mark').getBoundingClientRect();
      const bx = box.left + scrollX, by = box.top + scrollY, sc = box.width / 820;
      const mp = (x, y) => ({ x: bx + (x - 10) * sc, y: by + (y - 10) * sc });
      const start = mp(125, 290);
      groups[groups.length - 1].push({ x: start.x - 30 * sc, y: start.y - 120, loop: false }, { x: start.x, y: start.y, loop: false });
      const r = mob ? 26 : 42;
      const d = groups.map((g) => {
        const P = [];
        g.forEach((p, i) => {
          if (!p.loop) return P.push(p);
          const nx = g[i + 1] ? g[i + 1].x : p.x + 1;
          const sx = nx >= p.x ? 1 : -1;
          // петля в манере логотипа: вверх-вперёд, через верх назад, вниз и дальше
          P.push({ x: p.x - sx * r * .3, y: p.y + r * .5 }, { x: p.x + sx * r * .9, y: p.y - r * .9 }, { x: p.x, y: p.y - r * 2 }, { x: p.x - sx * r * .7, y: p.y - r * 1 }, { x: p.x + sx * r * .6, y: p.y + r * .3 });
        });
        return catmull(P);
      }).join(' ');
      path.setAttribute('d', d);
      total = path.getTotalLength();
      path.style.strokeDasharray = `${total} ${total}`;
      samples = [];
      const N = 360;
      for (let i = 0; i <= N; i++) { const L = (i / N) * total; samples.push([path.getPointAtLength(L).y, L]); }
      const md = MARK.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_, x, y) => { const q = mp(+x, +y); return `${q.x.toFixed(1)},${q.y.toFixed(1)}`; });
      mark.setAttribute('d', md);
      markLen = mark.getTotalLength();
      mark.style.strokeDasharray = `${markLen} ${markLen}`;
      mark.style.strokeWidth = Math.max(3, 34 * sc) + 'px';
      update();
    }
    function catmull(P) {
      if (P.length < 2) return '';
      let s = `M${P[0].x.toFixed(1)},${P[0].y.toFixed(1)}`;
      for (let i = 0; i < P.length - 1; i++) {
        const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2;
        const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 };
        const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 };
        s += ` C${c1.x.toFixed(1)},${c1.y.toFixed(1)} ${c2.x.toFixed(1)},${c2.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
      }
      return s;
    }
    function update() {
      if (!samples.length) return;
      const target = scrollY + innerHeight * .62;
      let L = 0;
      for (let i = 0; i < samples.length; i++) { if (samples[i][0] <= target) L = samples[i][1]; else if (samples[i][0] > target + innerHeight) break; }
      path.style.strokeDashoffset = total - L;
      const fb = $('.ftr__mark').getBoundingClientRect();
      const k = Math.min(1, Math.max(0, (innerHeight * .95 - fb.top) / (innerHeight * .5)));
      mark.style.strokeDashoffset = markLen * (1 - k);
    }
    if (reduce) { svg.remove(); return { build() {}, update() {} }; }
    return { build, update };
  })();
  // нить пересчитывается в простое после refresh — не в одной задаче с пересчётом сцен
  let tb = 0;
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 60));
  ScrollTrigger.addEventListener('refresh', () => { if (!tb) tb = idle(() => { tb = 0; thread.build(); }, { timeout: 800 }); });
  if (lenis) lenis.on('scroll', thread.update); else addEventListener('scroll', thread.update, { passive: true });

  /* ── reveal остального ─────────────────────────────────────────────── */
  if (!reduce) {
    $$('.label, .frozen__plate, .zabava, .rv__direct, .where__addr, .ftr__slogan').forEach((el) => {
      gsap.from(el, { y: 24, opacity: 0, duration: .9, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'clamp(top 92%)', once: true } });
    });
  }

  /* пересчёт после шрифтов и картинок */
  let rh = document.body.scrollHeight;
  new ResizeObserver(() => { const h = document.body.scrollHeight; if (Math.abs(h - rh) > 40) { rh = h; ScrollTrigger.refresh(); } }).observe(document.body);
})();
