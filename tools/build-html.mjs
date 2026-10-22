// Собирает index.html из src/index.src.html: разворачивает {{img путь | alt | sizes | класс | eager}}
// в <img> с srcset 800/1600 и реальными размерами из raw/manifest.json.
//   node tools/build-html.mjs
import fs from 'node:fs';
const man = JSON.parse(fs.readFileSync('raw/manifest.json', 'utf8'));
const src = fs.readFileSync('src/index.src.html', 'utf8');
let n = 0;
const html = src.replace(/\{\{img ([^}]+)\}\}/g, (_, body) => {
  const [key, alt = '', sizes = '50vw', cls = '', eager = ''] = body.split('|').map((s) => s.trim());
  const m = man[key];
  if (!m) throw new Error('нет фото ' + key);
  n++;
  const base = `assets/photos/${key}`;
  const one = m.w === m.w8; // исходник меньше 1600 — второй размер совпадает с первым
  const srcset = one ? '' : ` srcset="${base}-800.webp ${m.w8}w, ${base}-1600.webp ${m.w}w" sizes="${sizes}"`;
  const load = eager ? ' fetchpriority="high"' : ' loading="lazy" decoding="async"';
  return `<img src="${base}-800.webp"${srcset} width="${m.w}" height="${m.h}" alt="${alt}"${cls ? ` class="${cls}"` : ''}${load}>`;
});
fs.writeFileSync('index.html', html);
console.log('index.html', (html.length / 1024).toFixed(1) + 'КБ', 'картинок', n);
