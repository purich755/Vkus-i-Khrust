/* Крошки: при клике в hero (и на рубежах калькулятора) из точки разлетаются неправильные
   многоугольники 2–6 px цветов желтка, мёда и корочки — с гравитацией и вращением, гаснут за 900 мс.
   rAF крутится только пока живы частицы. */
(function () {
  'use strict';
  const COLORS = ['#FBBD2E', '#D99A1E', '#A45A24', '#E6D5BA'];
  const LIFE = 900;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function make(canvas) {
    const ctx = canvas.getContext('2d');
    let parts = [];
    let raf = 0, last = 0, w = 0, h = 0, dpr = 1;

    function size() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function shape() {
      // неправильный многоугольник: 4–6 вершин на «рваном» радиусе
      const n = 4 + Math.floor(Math.random() * 3);
      const pts = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * .6;
        const rr = .55 + Math.random() * .45;
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      return pts;
    }

    function burst(x, y, count) {
      if (reduce) return;
      if (!w) size();
      const n = count || 18 + Math.floor(Math.random() * 9);
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + (Math.random() - .5) * Math.PI * 1.25;
        const sp = 3 + Math.random() * 6.5;
        parts.push({
          x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          r: 1 + Math.random() * 2, rot: Math.random() * 6, vr: (Math.random() - .5) * .5,
          c: COLORS[Math.floor(Math.random() * COLORS.length)], t: 0, pts: shape(),
        });
      }
      if (!raf) { last = performance.now(); raf = requestAnimationFrame(tick); }
    }

    function tick(now) {
      const dt = Math.min(48, now - last); last = now;
      const k = dt / 16.67;
      ctx.clearRect(0, 0, w, h);
      parts = parts.filter((p) => (p.t += dt) < LIFE);
      for (const p of parts) {
        p.vy += .38 * k; p.vx *= .985; p.x += p.vx * k; p.y += p.vy * k; p.rot += p.vr * k;
        ctx.globalAlpha = 1 - (p.t / LIFE) ** 2;
        ctx.fillStyle = p.c;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(p.r * 1.6, p.r * 1.6);
        ctx.beginPath();
        p.pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
      ctx.globalAlpha = 1;
      raf = parts.length ? requestAnimationFrame(tick) : 0;
      if (!raf) ctx.clearRect(0, 0, w, h);
    }

    addEventListener('resize', () => { w = 0; });
    return { burst, size };
  }

  window.Crumbs = { make };
})();
