import test from 'node:test'; import assert from 'node:assert/strict';
import { goruntuCoz } from '../src/ean-okuyucu.js';
// Sentetik EAN-13 görüntüsü (alt-piksel kenarlı, hafif bulanık, gölgeli, gürültülü) üretip çözer
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const R = L.map((b) => [...b].map((c) => (c === '0' ? '1' : '0')).join('')); const G = R.map((b) => [...b].reverse().join(''));
const P = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];
const bits = (k) => { const d = k.split('').map(Number); let s = '101'; for (let i = 0; i < 6; i++) s += (P[d[0]][i] === 'L' ? L : G)[d[i + 1]]; s += '01010'; for (let i = 7; i < 13; i++) s += R[d[i]]; return s + '101'; };
const chk = (b) => { let t = 0; b.split('').reverse().forEach((c, i) => { t += Number(c) * (i % 2 === 0 ? 3 : 1); }); return (10 - (t % 10)) % 10; };
function resim(kod, mw, W = 640, H = 480, bulanik = 1) {
  const b = bits(kod); const img = new Float32Array(W * H).fill(235); const x0 = (W - b.length * mw) / 2;
  for (let x = 0; x < W; x++) { let c = 0; for (let q = 0; q < 8; q++) { const m = Math.floor((x + (q + 0.5) / 8 - x0) / mw); if (m >= 0 && m < b.length && b[m] === '1') c++; } for (let y = Math.round(H * 0.25); y < H * 0.75; y++) img[y * W + x] = 235 - (210 * c) / 8; }
  const o = new Uint8Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let s = 0; let n = 0; for (let d = -bulanik; d <= bulanik; d++) { const xx = x + d; if (xx >= 0 && xx < W) { s += img[y * W + xx]; n++; } } o[y * W + x] = Math.max(0, Math.min(255, (s / n) * (0.6 + 0.4 * (x / W)) + ((x * 7 + y * 13) % 11) - 5)); }
  return { data: o, width: W, height: H };
}
test('EAN-13 farklı boyut/bulanıklıkta doğru çözülür, yanlış okuma yok', () => {
  for (const b12 of ['869050401010', '978975000123', '400638133393', '869000002001', '012345678905']) {
    const kod = b12 + chk(b12);
    for (const mw of [3, 4, 5.5]) { const r = goruntuCoz(resim(kod, mw)).filter((x) => x.oy >= 3); assert.equal(r[0] && r[0].kod, kod, `${kod} mw=${mw}`); }
  }
});
test('boş görüntüde okuma çıkmaz', () => { assert.equal(goruntuCoz({ data: new Uint8Array(640 * 480).fill(200), width: 640, height: 480 }).length, 0); });
