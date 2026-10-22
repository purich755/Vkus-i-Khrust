// Собирает WebP для сайта из raw/: по два размера (800 и 1600 по длинной стороне), q 78.
// Раскладка по папкам — как в брифе: bakery / pies / frozen / hall / outside.
//   node tools/build-assets.mjs
import sharp from 'sharp';
import fs from 'node:fs';

const OUT = 'assets/photos';
const manifest = {};

// [папка, имя, исходник, кроп {left, top, width, height} в пикселях оригинала]
const LIST = [
  ['bakery', 'ring', 'ya104', { left: 0, top: 1250, width: 3024, height: 2782 }],
  ['bakery', 'rings', 'ya101'],
  ['bakery', 'palmiers', 'ya21'],
  ['bakery', 'tarts-heart', 'ya63'],
  ['bakery', 'basket', 'ya29'],
  ['bakery', 'sausage', 'ya103'],
  ['bakery', 'bagels', 'ya111'],
  ['bakery', 'tartlets', 'ya90'],
  ['bakery', 'buns', 'ya20'],
  ['pies', 'gubadia', 'ya84'],
  ['pies', 'chakchak', 'ya68'],
  ['pies', 'bigpie', 'ya37'],
  ['pies', 'bigpie-raw', 'ya57'],
  ['pies', 'pie-star', 'ya39'],
  ['pies', 'pie-jam', 'ya73'],
  ['pies', 'pie-rice', 'ya70'],
  ['pies', 'pie-apricot', 'ya53'],
  ['pies', 'pie-cut', 'ya79'],
  ['pies', 'pie-onion', 'ya62'],
  ['pies', 'pie-lattice', 'ya36'],
  ['pies', 'pie-cherry', 'ya23'],
  ['pies', 'pie-mushroom', 'ya04'],
  ['pies', 'crumble', 'ya83'],
  ['pies', 'echpochmak', 'ya91'],
  ['pies', 'rack-pies', 'ya60'],
  ['pies', 'pie-hearts', 'ya94'],
  ['pies', 'party-box', 'ya109'],
  ['frozen', 'hands', 'ya06'],
  ['frozen', 'pelmeni-board', 'ya41'],
  ['frozen', 'pelmeni-rows', 'ya25'],
  ['frozen', 'zabava', 'ya110'],
  ['frozen', 'zabava-scale', 'p012-0'],
  ['frozen', 'meatballs', 'ya40'],
  ['frozen', 'meatballs-cheese', 'ya72'],
  ['frozen', 'cutlets', 'ya92', { left: 0, top: 300, width: 1320, height: 1400 }],
  ['frozen', 'vareniki-hands', 'ya59'],
  ['frozen', 'filling', 'ya55'],
  ['frozen', 'dough-hands', 'ya33'],
  ['frozen', 'flour-hand', 'ya77'],
  ['frozen', 'rack', 'ya24'],
  ['frozen', 'syrniki-raw', 'ya82'],
  ['hall', 'counter', 'ya12'],
  ['hall', 'vitrine', 'ya93'],
  ['hall', 'vitrine-2', 'ya11'],
  ['hall', 'coffee', 'ya09'],
  ['outside', 'facade', 'ya05', { left: 0, top: 820, width: 3750, height: 4180 }],
  ['outside', 'facade-front', 'ya30'],
  ['outside', 'facade-evening', 'ya51', { left: 0, top: 600, width: 3750, height: 4400 }],
  ['outside', 'window', 'ya19'],
];

// Лёгкая тёплая подтонировка — кадры с телефона часто холодные под лампами
const warm = (s) => s.recomb([[1.03, 0.02, 0], [0, 1.0, 0], [0, 0.015, 0.94]]).modulate({ saturation: 1.03 });

for (const [dir, name, id, crop] of LIST) {
  fs.mkdirSync(`${OUT}/${dir}`, { recursive: true });
  const src = id.startsWith('p') ? `raw/tg/img/${id}.jpg` : `raw/ya/${id}.jpg`;
  const sizes = [];
  for (const long of [800, 1600]) {
    let s = sharp(src).rotate();
    if (crop) s = s.extract(crop);
    s = warm(s.resize({ width: long, height: long, fit: 'inside', withoutEnlargement: true }));
    const file = `${OUT}/${dir}/${name}-${long}.webp`;
    const info = await s.webp({ quality: 78, effort: 6 }).toFile(file);
    sizes.push({ w: info.width, h: info.height, kb: Math.round(info.size / 1024) });
  }
  manifest[`${dir}/${name}`] = { src: id, w: sizes[1].w, h: sizes[1].h, w8: sizes[0].w };
  console.log(`${dir}/${name}`.padEnd(26), id.padEnd(7), sizes.map((o) => `${o.w}x${o.h} ${o.kb}KB`).join(' · '));
}
fs.writeFileSync('raw/manifest.json', JSON.stringify(manifest, null, 1));

// OG-картинка 1200×630: кольцо из бриоши на тёмном фоне
await sharp('raw/ya/ya104.jpg').rotate().extract({ left: 0, top: 1500, width: 3024, height: 1588 })
  .resize(1200, 630).modulate({ brightness: 0.96 }).jpeg({ quality: 80, mozjpeg: true }).toFile('assets/og.jpg');
console.log('og ok');
