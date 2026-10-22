// Шрифты локально: по одному woff2 на начертание, только нужные знаки (Google Fonts API, параметр text=).
// Geologica остаётся вариативной по wght / CRSV / SHRP — на оси SHRP держится «хруст» заголовков.
// Пишет css/fonts.css.   node tools/fonts.mjs
import fs from 'node:fs';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const CHARS = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯәөүҗңһӘӨҮҖҢҺ' +
  'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789' +
  '  .,:;!?…—–-‑«»"\'„“()[]#/\\№₽·•●○▸→←↑↓×+−%&*@_=<>|';
const FACES = [
  // [семейство, параметры API, имя файла, style, weight]
  ['Geologica', 'wght,CRSV,SHRP@100..900,0..1,0..100', 'geologica', 'normal', '100 900'],
  ['Cormorant Garamond', 'ital,wght@1,400..500', 'cormorant-i', 'italic', '400 500'],
  ['IBM Plex Mono', 'wght@400', 'plex-mono', 'normal', '400'],
  ['IBM Plex Mono', 'wght@500', 'plex-mono-500', 'normal', '500'],
  ['Caveat', 'wght@500', 'caveat', 'normal', '500', '— Эльвина, владелица.'],
];
fs.mkdirSync('assets/fonts', { recursive: true });
for (const f of fs.readdirSync('assets/fonts')) fs.unlinkSync('assets/fonts/' + f);
const out = ['/* Шрифты лежат локально: одно начертание — один файл, только нужные знаки (tools/fonts.mjs) */'];
let total = 0;
for (const [fam, spec, name, style, weight, chars = CHARS] of FACES) {
  const url = `https://fonts.googleapis.com/css2?family=${fam.replace(/ /g, '+')}:${spec}&text=${encodeURIComponent(chars)}&display=swap`;
  const css = await (await fetch(url, { headers: { 'User-Agent': UA } })).text();
  const src = [...css.matchAll(/url\(([^)]+)\) format\('woff2'\)/g)].map((m) => m[1]);
  if (src.length !== 1) throw new Error(`${fam} ${spec}: файлов ${src.length}\n${css}`);
  const buf = Buffer.from(await (await fetch(src[0])).arrayBuffer());
  fs.writeFileSync(`assets/fonts/${name}.woff2`, buf);
  total += buf.length;
  console.log(name.padEnd(14), weight.padEnd(8), (buf.length / 1024).toFixed(1) + 'КБ');
  out.push(`@font-face { font-family: '${fam}'; font-style: ${style}; font-weight: ${weight}; font-display: swap; src: url(../assets/fonts/${name}.woff2) format('woff2'); }`);
}
fs.writeFileSync('css/fonts.css', out.join('\n') + '\n');
console.log('всего', (total / 1024).toFixed(0) + 'КБ');
