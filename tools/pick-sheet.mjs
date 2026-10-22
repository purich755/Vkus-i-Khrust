// Крупный лист выбранных кадров: node tools/pick-sheet.mjs out.jpg ya21 ya104 ...
import sharp from 'sharp';
const [out, ...ids] = process.argv.slice(2);
const W = 520, H = 680, cols = 4;
const tiles = await Promise.all(ids.map(async (id, i) => {
  const f = id.startsWith('p') ? `raw/tg/img/${id}.jpg` : `raw/ya/${id}.jpg`;
  const img = await sharp(f).rotate().resize(W - 6, H - 30, { fit: 'contain', background: '#222' }).toBuffer();
  const label = Buffer.from(`<svg width="${W}" height="28"><rect width="100%" height="100%" fill="#000"/><text x="8" y="20" font-size="18" fill="#fff" font-family="Arial">${id}</text></svg>`);
  const x = (i % cols) * W, y = Math.floor(i / cols) * H;
  return [{ input: img, left: x + 3, top: y }, { input: label, left: x, top: y + H - 29 }];
}));
await sharp({ create: { width: W * cols, height: H * Math.ceil(ids.length / cols), channels: 3, background: '#111' } }).composite(tiles.flat()).jpeg({ quality: 80 }).toFile(out);
