// Самопроверка в headless Chrome: прокрутка шагами, снимки разделов, ошибки, переполнение по X.
//   node tools/shots.mjs [ширина=1440] [--only hero,century] [--reduced] [--pre] [--h 900]
import { chromium } from 'playwright-core';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf('--' + n); return i > -1 ? args[i + 1] : d; };
const W = +(args.find((a) => /^\d+$/.test(a)) || 1440);
const H = +opt('h', W < 700 ? 812 : W < 1000 ? 1024 : 900);
const only = opt('only', '').split(',').filter(Boolean);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
fs.mkdirSync('raw/shots', { recursive: true });

const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'vh-shots-' + W), {
  channel: 'chrome', headless: true, viewport: { width: W, height: H }, isMobile: W < 700, hasTouch: W < 700, deviceScaleFactor: 1,
  locale: 'ru-RU', reducedMotion: args.includes('--reduced') ? 'reduce' : 'no-preference',
});
const page = ctx.pages()[0];
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message));
page.on('requestfailed', (r) => errors.push('REQFAIL ' + r.url()));
if (!args.includes('--pre')) await page.addInitScript(() => { try { sessionStorage.setItem('vh-pre', '1'); } catch (e) {} });
else await page.addInitScript(() => { try { sessionStorage.clear(); } catch (e) {} });
await page.goto((process.env.URL || 'http://localhost:8287/') + (opt('q', '') ? '?' + opt('q', '') : ''), { waitUntil: 'load' });
await sleep(args.includes('--pre') ? 250 : 2500);
const go = (y) => page.evaluate((y) => { if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); }, y);
const top = (s) => page.evaluate((s) => { const e = document.querySelector(s); if (!e) return null; const t = e.parentElement.classList.contains('pin-spacer') ? e.parentElement : e; return t.getBoundingClientRect().top + scrollY; }, s);
const pinLen = (s) => page.evaluate((s) => { const st = ScrollTrigger.getAll().find((x) => x.pin && x.trigger === document.querySelector(s) && x.vars.pinSpacing !== false); return st ? st.end - st.start : 0; }, s);
let cur = 0;
async function travel(to) { const step = to > cur ? 300 : -300; for (let y = cur; step > 0 ? y < to : y > to; y += step) { await go(y); await sleep(60); } await go(to); cur = to; await sleep(700); }
const shot = async (name) => { await page.screenshot({ path: `raw/shots/${W}-${name}.png` }); console.log('📸', name); };

const plan = [
  ['hero', '#top', 0], ['about', '#about', 0], ['about-b', '#about', 'h.5'],
  ['century-1', '#century', 'p.18'], ['century-2', '#century', 'p.5'], ['century-3', '#century', 'p.78'], ['century-4', '#century', 'p1'],
  ['shelves', '#shelves', 60], ['bakery-1', '#bakery', 'p.05'], ['bakery-2', '#bakery', 'p.5'], ['bakery-3', '#bakery', 'p.95'],
  ['tatar', '#tatar', 0], ['tatar-b', '#tatar', 'h.55'], ['frozen', '#frozen', 0], ['frozen-b', '#frozen', 'h.62'],
  ['feast', '#feast', 0], ['feast-b', '#feast', 'h.4'], ['gallery', '#gallery', 0], ['reviews', '#reviews', 0], ['order', '#order', 0], ['order-b', '#order', 'h.55'],
  ['where', '#where', 0], ['foot', 'END', 0],
];
if (args.includes('--pre')) { await shot('pre-a'); await sleep(450); await shot('pre-b'); await sleep(500); await shot('pre-c'); await sleep(1400); await shot('pre-d'); }
for (const [name, sel, mode] of plan) {
  if (only.length && !only.some((o) => name.startsWith(o))) continue;
  if (sel === 'END') { const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight); await travel(max); await sleep(1800); await shot(name); continue; }
  let y = await top(sel);
  if (y === null) continue;
  if (typeof mode === 'string' && mode[0] === 'p') { y += (await pinLen(sel)) * +mode.slice(1); await travel(y); await sleep(1500); await shot(name); continue; }
  if (typeof mode === 'string' && mode[0] === 'h') { const h = await page.evaluate((s) => document.querySelector(s).offsetHeight, sel); y += h * +mode.slice(1); }
  else y += mode;
  await travel(y); await sleep(900); await shot(name);
}
const over = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, wide: [...document.querySelectorAll('body *')].filter((e) => { const r = e.getBoundingClientRect(); return r.right > innerWidth + 2 && r.width > 0 && !e.closest('.track, .rowm, .hero__word, .ftr__word, .lb, .thread, .century'); }).slice(0, 8).map((e) => e.className + ' ' + Math.round(e.getBoundingClientRect().right)) }));
console.log('overflow', JSON.stringify(over));
console.log(errors.length ? 'ОШИБКИ:\n' + [...new Set(errors)].join('\n') : 'ошибок нет');
await ctx.close();
