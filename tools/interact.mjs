// Проверка интерактива реальными событиями мыши и клавиатуры.
//   node tools/interact.mjs [ширина=1440] [--reduced]
import { chromium } from 'playwright-core';
import os from 'node:os'; import path from 'node:path';
const args = process.argv.slice(2);
const W = +(args.find((a) => /^\d+$/.test(a)) || 1440);
const reduced = args.includes('--reduced');
const BASE = process.env.URL || 'http://localhost:8287/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ctx = await chromium.launchPersistentContext(path.join(os.tmpdir(), 'vh-int-' + W + (reduced ? 'r' : '')), {
  channel: 'chrome', headless: true, viewport: { width: W, height: W < 700 ? 812 : 900 }, isMobile: W < 700, hasTouch: W < 700,
  locale: 'ru-RU', reducedMotion: reduced ? 'reduce' : 'no-preference',
});
const page = ctx.pages()[0];
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
await page.addInitScript(() => { try { sessionStorage.setItem('vh-pre', '1'); } catch (e) {} });
let ok = 0, bad = 0;
const t = (name, cond, extra = '') => { cond ? ok++ : bad++; console.log(cond ? '✓' : '✗', name, extra); };
const go = async (sel, off = -100) => { await page.evaluate(([s, o]) => { const e = document.querySelector(s); const sp = e.closest('.pin-spacer'); const sec = sp && sp.firstElementChild; const y = sp ? sp.getBoundingClientRect().top + scrollY + (e.getBoundingClientRect().top - sec.getBoundingClientRect().top) + o : e.getBoundingClientRect().top + scrollY + o; if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); }, [sel, off]); await sleep(800); };
const clickEl = async (sel) => { const b = await page.locator(sel).first().boundingBox(); if (process.env.DBG) console.log("   ", sel, Math.round(b.y), await page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? e.tagName + "." + e.className : null; }, [b.x + b.width / 2, b.y + b.height / 2])); await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2); };

// статус по времени
for (const [q, st] of [['05:10', 'baking'], ['12:00', 'open'], ['19:59', 'open'], ['20:00', 'closed'], ['03:59', 'closed']]) {
  await page.goto(BASE + '?now=' + q, { waitUntil: 'load' });
  const s = await page.$eval('.hdr [data-status]', (e) => e.dataset.state + ' | ' + e.textContent.trim());
  t('статус ' + q, s.startsWith(st), s);
}
await page.goto(BASE, { waitUntil: 'load' });
await sleep(1800);
t('шрифт Geologica загружен', await page.evaluate(() => document.fonts.check('800 20px Geologica')));
const vw = await page.evaluate(() => [document.documentElement.scrollWidth, innerWidth]);
t('нет горизонтального скролла', vw[0] <= vw[1] && vw[1] === W, vw.join(' / '));

// навигация
if (W >= 1100) {
  await clickEl('.hdr__nav a[href="#feast"]');
  await sleep(2200);
  const d = await page.evaluate(() => Math.round(document.querySelector('#feast').getBoundingClientRect().top));
  t('якорь «Праздник» доезжает', Math.abs(d) < 30, 'top=' + d);
} else {
  await clickEl('.burger');
  await sleep(700);
  t('меню открылось', await page.evaluate(() => !document.getElementById('menu').hidden));
  await clickEl('#menu a[href="#order"]');
  await sleep(2200);
  const d = await page.evaluate(() => Math.round(document.querySelector('#order').getBoundingClientRect().top));
  t('меню закрылось и доехало до «Как заказать»', await page.evaluate(() => document.getElementById('menu').hidden) && Math.abs(d) < 30, 'top=' + d);
}

// калькулятор
await go('.calc', -80);
const tot = async () => page.evaluate(() => +document.getElementById('total').textContent.replace(/\s/g, ''));
await sleep(900);
const t0 = await tot();
t('итог посчитан', t0 > 0, t0 + ' ₽');
await clickEl('.chips [data-occ="ash"]');
await sleep(900);
const names = await page.$$eval('.calc__list .calc__name', (n) => n.map((x) => x.firstChild.textContent.trim()));
t('«Аш» собирает губадию, бэлеш и кыстыбый', names.some((n) => n.startsWith('Губадия')) && names.some((n) => n.startsWith('Зур')) && names.some((n) => n.startsWith('Кыстыбый')), names.join(' / '));
const t1 = await tot();
await clickEl('.calc__list li:first-child [data-a="+"]');
await sleep(900);
const t2 = await tot();
t('«+» увеличивает итог на цену губадии', t2 - t1 === 370, `${t1} → ${t2}`);
await page.focus('#guests');
for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowRight');
await sleep(900);
t('слайдер гостей с клавиатуры', (await page.$eval('#guestsOut', (e) => e.textContent)) === '50');
const cnt0 = await page.$$eval('.calc__list li', (l) => l.length);
await clickEl('.calc__list li:nth-child(2) .calc__del');
await sleep(400);
t('строку можно удалить', (await page.$$eval('.calc__list li', (l) => l.length)) === cnt0 - 1);
const wa = await page.$eval('.calc__wa', (a) => decodeURIComponent(a.href));
t('WhatsApp со списком', wa.startsWith('https://wa.me/79247292094?text=') && wa.includes('аш, гостей — 50') && wa.includes('Ориентировочно'), wa.slice(0, 90));
t('рубежи 3000/5000 отмечены', await page.$$eval('.goal__mark.is-hit', (m) => m.length) === 2);

// иней
if (W >= 1100 && !reduced) {
  await go('.frost__row', -200);
  const fc = await page.locator('.fc').first().boundingBox();
  const alpha = () => page.evaluate(() => { const c = document.querySelector('.fc canvas'); const x = c.getContext('2d'); const d = x.getImageData(Math.round(c.width / 2), Math.round(c.height / 2), 1, 1).data; return d[3]; });
  const a0 = await alpha();
  await page.mouse.move(fc.x + fc.width / 2 - 30, fc.y + fc.height / 2);
  for (let i = 0; i < 6; i++) { await page.mouse.move(fc.x + fc.width / 2 - 20 + i * 8, fc.y + fc.height / 2); await sleep(30); }
  await sleep(200);
  const a1 = await alpha();
  t('иней стирается курсором', a1 < a0 - 60, `${a0} → ${a1}`);
  await page.mouse.move(5, 5);
  await sleep(7600);
  const a2 = await alpha();
  t('иней нарастает обратно', a2 > a0 - 20, `→ ${a2}`);
}

// витрина + лайтбокс
await go('#gallery', 0);
await page.evaluate(() => document.querySelector('.rowm .g').focus());
await page.keyboard.press('Enter');
await sleep(600);
t('лайтбокс открылся', await page.evaluate(() => !document.getElementById('lb').hidden));
t('счётчик 01 / NN', /^01 \/ \d\d$/.test(await page.$eval('.lb__n', (e) => e.textContent)), await page.$eval('.lb__n', (e) => e.textContent));
await page.keyboard.press('ArrowRight');
await sleep(1000);
t('стрелка вправо листает', (await page.$eval('.lb__n', (e) => e.textContent)).startsWith('02'));
await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab'); await page.keyboard.press('Tab');
t('фокус остаётся в лайтбоксе', await page.evaluate(() => !!document.activeElement.closest('#lb')));
await page.keyboard.press('Escape');
await sleep(500);
t('Esc закрывает', await page.evaluate(() => document.getElementById('lb').hidden));

// отзывы
await go('.rv', -200);
await clickEl('.rv__btn[data-dir="1"]');
await sleep(500);
t('отзывы листаются', (await page.$eval('.rv__n', (e) => e.textContent)) === '02 / 10');

// ссылки
const links = await page.$$eval('a[href]', (as) => as.map((a) => a.getAttribute('href')));
t('нет пустых ссылок', links.every((h) => h && h !== '#'), links.filter((h) => !h || h === '#').join(','));
t('tel везде один', links.filter((h) => h.startsWith('tel:')).every((h) => h === 'tel:+79520436544'));
const imgs = await page.$$eval('img', (i) => i.filter((x) => !x.alt && !x.closest('[aria-hidden="true"]') && x.getAttribute('alt') === null).length);
t('у всех фото есть alt', imgs === 0);
// в конец страницы — подвал виден
await page.evaluate(() => { const y = document.documentElement.scrollHeight; if (window.__lenis) window.__lenis.scrollTo(y, { immediate: true, force: true }); else scrollTo(0, y); });
await sleep(1500);
t('подвал виден в конце', await page.evaluate(() => { const r = document.querySelector('.ftr__slogan').getBoundingClientRect(); return r.top < innerHeight && getComputedStyle(document.querySelector('.ftr__slogan')).opacity === '1'; }));

console.log(`\n${ok} ✓ / ${bad} ✗`);
console.log(errors.length ? 'ОШИБКИ:\n' + [...new Set(errors)].join('\n') : 'ошибок нет');
await ctx.close();
