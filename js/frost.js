/* «Иней» над фото морозилки: процедурный узор (шум + ветвящиеся кристаллы) рисуется один раз
   во внеэкранный канвас и копируется на каждую карточку. Курсор стирает иней мягкой кистью
   (destination-out + радиальный градиент), через 3 с покоя иней медленно нарастает обратно.
   На тач-экранах тап оттаивает карточку целиком за 600 мс. Вне вьюпорта rAF не крутится. */
(function () {
  'use strict';
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const coarse = matchMedia('(hover: none), (pointer: coarse)').matches;
  const TEX = 512;
  let texture = null;

  function rand(seed) { return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646; }

  function makeTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = TEX;
    const g = c.getContext('2d');
    const r = rand(7);
    // молочная подложка с пятнами
    g.fillStyle = 'rgba(232, 240, 244, .74)';
    g.fillRect(0, 0, TEX, TEX);
    for (let i = 0; i < 260; i++) {
      const x = r() * TEX, y = r() * TEX, s = 6 + r() * 46;
      const gr = g.createRadialGradient(x, y, 0, x, y, s);
      gr.addColorStop(0, `rgba(255,255,255,${.12 + r() * .22})`);
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2);
    }
    // кристаллы: ветки с отростками под 60°
    g.lineCap = 'round';
    function branch(x, y, a, len, w, depth) {
      if (depth > 4 || len < 3) return;
      const x2 = x + Math.cos(a) * len, y2 = y + Math.sin(a) * len;
      g.strokeStyle = `rgba(255,255,255,${.5 + r() * .4})`;
      g.lineWidth = w;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x2, y2); g.stroke();
      const n = 2 + Math.floor(r() * 3);
      for (let i = 1; i <= n; i++) {
        const t = i / (n + 1);
        const bx = x + (x2 - x) * t, by = y + (y2 - y) * t;
        const l2 = len * (.25 + r() * .3);
        branch(bx, by, a + Math.PI / 3, l2, w * .65, depth + 1);
        branch(bx, by, a - Math.PI / 3, l2, w * .65, depth + 1);
      }
    }
    for (let i = 0; i < 26; i++) {
      const x = r() * TEX, y = r() * TEX;
      const arms = 6;
      const base = r() * Math.PI;
      for (let k = 0; k < arms; k++) branch(x, y, base + (k / arms) * Math.PI * 2, 14 + r() * 30, 1.4, 1);
    }
    // редкий длинный «папоротник» от края
    for (let i = 0; i < 7; i++) branch(r() * TEX, TEX, -Math.PI / 2 + (r() - .5) * .9, 60 + r() * 70, 1.6, 0);
    return c;
  }

  function card(fig) {
    const cv = fig.querySelector('canvas');
    const ctx = cv.getContext('2d');
    // маска «оттаявших» мест: в ней копится только альфа, поэтому цвет инея не плывёт
    const dmg = document.createElement('canvas');
    const dctx = dmg.getContext('2d');
    let w = 0, h = 0, dpr = 1, visible = false, raf = 0;
    let lastTouch = 0, regrow = 0, thawing = 0, dirty = false;

    function render() {
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);
      const s = Math.max(w, h);
      ctx.drawImage(texture, 0, 0, TEX, TEX, 0, 0, s, s);
      if (dirty) { ctx.globalCompositeOperation = 'destination-out'; ctx.drawImage(dmg, 0, 0, w, h); ctx.globalCompositeOperation = 'source-over'; }
    }
    function size() {
      const r = fig.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      cv.width = dmg.width = Math.round(w * dpr); cv.height = dmg.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirty = false; render();
    }
    function erase(x, y, rad) {
      const gr = dctx.createRadialGradient(x, y, 0, x, y, rad);
      gr.addColorStop(0, 'rgba(0,0,0,.9)');
      gr.addColorStop(.6, 'rgba(0,0,0,.45)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      dctx.globalCompositeOperation = 'source-over';
      dctx.fillStyle = gr;
      dctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
      lastTouch = performance.now(); regrow = 0; dirty = true;
      kick();
    }
    function kick() { if (!raf && visible) raf = requestAnimationFrame(loop); }
    function loop(now) {
      raf = 0;
      if (!dirty && !thawing) return;
      if (thawing) {
        const t = Math.min(1, (now - thawing) / 600);
        dctx.globalCompositeOperation = 'source-over';
        dctx.fillStyle = `rgba(0,0,0,${.08 + t * .3})`;
        dctx.fillRect(0, 0, w, h);
        dirty = true;
        if (t >= 1) { dctx.fillStyle = '#000'; dctx.fillRect(0, 0, w, h); thawing = 0; lastTouch = now; }
      } else if (now - lastTouch > 3000) {
        // иней нарастает обратно: маска медленно гаснет, ~4 с до полного
        dctx.globalCompositeOperation = 'destination-out';
        dctx.fillStyle = 'rgba(0,0,0,.025)';
        dctx.fillRect(0, 0, w, h);
        if (++regrow > 240) { dctx.clearRect(0, 0, w, h); dirty = false; }
      }
      render();
      kick();
    }

    if (!coarse) {
      fig.addEventListener('pointermove', (e) => {
        const r = cv.getBoundingClientRect();
        erase(e.clientX - r.left, e.clientY - r.top, Math.max(46, w * .17));
      });
    }
    fig.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse') return;
      thawing = performance.now();
      kick();
    });
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      if (visible) { if (!w) size(); kick(); }
    }).observe(fig);
    new ResizeObserver(() => { if (w && Math.abs(fig.getBoundingClientRect().width - w) > 2) size(); }).observe(fig);
  }

  function init() {
    const figs = document.querySelectorAll('.fc');
    if (!figs.length) return;
    if (reduce) { figs.forEach((f) => f.querySelector('canvas')?.remove()); document.querySelector('.frost__hint')?.remove(); return; }
    if (coarse) document.querySelector('.frost__hint').textContent = 'коснитесь — оттает';
    // текстуру строим, только когда секция близко
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      texture = makeTexture();
      figs.forEach(card);
    }, { rootMargin: '600px 0px' });
    io.observe(document.querySelector('.frost'));
  }
  window.Frost = { init };
})();
