// Bağımsız EAN-13 / EAN-8 (UPC-A dahil) çözücü — kütüphane gerektirmez. iPhone Safari'de BarcodeDetector olmadığı için kullanılır.
// Girdi: gri görüntü {data: Uint8Array, width, height}. Çıktı: bulunan barkod metinleri.
const L = ['0001101', '0011001', '0010011', '0111101', '0100011', '0110001', '0101111', '0111011', '0110111', '0001011'];
const R = L.map((b) => [...b].map((c) => (c === '0' ? '1' : '0')).join(''));
const G = R.map((b) => [...b].reverse().join(''));
const runlar = (bits) => { const o = []; let s = 1; for (let i = 1; i <= bits.length; i++) { if (bits[i] === bits[i - 1]) s++; else { o.push(s); s = 1; } } return o; };
const TL = L.map(runlar); const TG = G.map(runlar); const TR = R.map(runlar);
const PARITE = ['LLLLLL', 'LLGLGG', 'LLGGLG', 'LLGGGL', 'LGLLGG', 'LGGLLG', 'LGGGLL', 'LGLGLG', 'LGLGGL', 'LGGLGL'];

function sagliama(k) {
  const d = k.split('').map(Number); const son = d.pop(); let t = 0;
  d.reverse().forEach((v, i) => { t += v * (i % 2 === 0 ? 3 : 1); });
  return (10 - (t % 10)) % 10 === son;
}

function rakam(w, tablolar) { // w: 4 run genişliği → [rakam, tablo indeksi, hata]
  const t = w[0] + w[1] + w[2] + w[3]; if (t < 4) return null; const u = t / 7;
  let en = null;
  tablolar.forEach((tb, ti) => tb.forEach((p, d) => {
    let e = 0; for (let i = 0; i < 4; i++) { const x = w[i] / u - p[i]; e += x * x; }
    if (!en || e < en[2]) en = [d, ti, e];
  }));
  return en && en[2] < 0.7 ? en : null;
}

// Tek satır: runs = ardışık çubuk/boşluk genişlikleri, ilk eleman BOŞLUK (sessiz bölge) olacak şekilde hizalanır
function runlardanCoz(r) {
  const bulunan = [];
  for (let s = 1; s + 3 <= r.length; s += 2) { // s: koruma çubuğunun ilk ÇUBUĞU (tek indeks → çubuk)
    const u = (r[s] + r[s + 1] + r[s + 2]) / 3; if (u < 1) continue;
    if (Math.abs(r[s] - u) > u * 0.6 || Math.abs(r[s + 1] - u) > u * 0.6 || Math.abs(r[s + 2] - u) > u * 0.6) continue;
    if (r[s - 1] < u * 3) continue; // sessiz bölge
    // EAN-13: 1+... start(3) + 6*4 + mid(5) + 6*4 + end(3) = 59 run ; EAN-8: 3 + 4*4 + 5 + 4*4 + 3 = 43
    for (const n of [6, 4]) {
      const toplam = 3 + n * 4 + 5 + n * 4 + 3; if (s + toplam > r.length) continue;
      let p = s + 3; const sol = []; let ok = true;
      for (let i = 0; i < n && ok; i++) { const x = rakam(r.slice(p, p + 4), [TL, TG]); if (!x) ok = false; else { sol.push(x); p += 4; } }
      if (!ok) continue;
      // orta koruma: 5 run ≈ 1 birim
      const orta = r.slice(p, p + 5); const ub = (r[s] + r[s + 1] + r[s + 2]) / 3;
      if (orta.some((x) => Math.abs(x - ub) > ub * 0.7)) continue; p += 5;
      const sag = []; for (let i = 0; i < n && ok; i++) { const x = rakam(r.slice(p, p + 4), [TR]); if (!x) ok = false; else { sag.push(x[0]); p += 4; } }
      if (!ok) continue;
      let kod;
      if (n === 6) { const par = sol.map((x) => (x[1] === 0 ? 'L' : 'G')).join(''); const ilk = PARITE.indexOf(par); if (ilk < 0) continue; kod = ilk + sol.map((x) => x[0]).join('') + sag.join(''); }
      else { if (sol.some((x) => x[1] !== 0)) continue; kod = sol.map((x) => x[0]).join('') + sag.join(''); }
      if (sagliama(kod)) bulunan.push(kod);
    }
  }
  return bulunan;
}

// Tek gri satırı çubuk/boşluk run'larına çevirir: eşik yerine KENAR (gradyan uç noktaları) kullanır → bulanıklıkta ve düşük kontrastta da çalışır.
// Kenar konumu alt-piksel (parabol); ardışık aynı yönlü kenarlardan güçlüsü kalır. r[0] = ilk çubuğa kadar boşluk, sonra sırayla çubuk/boşluk genişlikleri.
function satirRunlar(g) {
  const n = g.length; if (n < 20) return [];
  const d = new Float32Array(n);
  for (let i = 2; i < n - 2; i++) d[i] = (g[i + 1] + g[i + 2] - g[i - 1] - g[i - 2]) / 4; // yumuşatılmış türev
  const mutlak = Array.from(d, Math.abs).sort((a, b) => a - b); const esik = Math.max(8, mutlak[Math.floor(n * 0.98)] * 0.22);
  const kenar = []; // {k: konum, y: -1 (koyuya iniş=çubuk başı) | +1 (açığa çıkış=çubuk sonu), g: güç}
  for (let i = 2; i < n - 2; i++) {
    const v = d[i]; if (Math.abs(v) < esik) continue;
    if (Math.abs(v) < Math.abs(d[i - 1]) || Math.abs(v) <= Math.abs(d[i + 1]) || Math.sign(d[i - 1]) !== Math.sign(v) && d[i - 1] !== 0 && false) continue;
    const a = Math.abs(d[i - 1]); const b = Math.abs(v); const c = Math.abs(d[i + 1]); const den = a - 2 * b + c; const ofs = den === 0 ? 0 : (0.5 * (a - c)) / den;
    const e = { k: i + ofs, y: v < 0 ? -1 : 1, g: b };
    const son = kenar[kenar.length - 1];
    if (son && son.y === e.y) { if (e.g > son.g) kenar[kenar.length - 1] = e; } else kenar.push(e);
  }
  while (kenar.length && kenar[0].y !== -1) kenar.shift(); // ilk kenar: çubuk başı
  if (kenar.length < 40) return [];
  const r = [kenar[0].k]; for (let i = 1; i < kenar.length; i++) r.push(kenar[i].k - kenar[i - 1].k);
  return r;
}

export function satirCoz(g) {
  const r = satirRunlar(g); if (r.length < 40) return [];
  const bul = new Set(runlardanCoz(r)); // soldan sağa
  // baş aşağı okuma: ters çevirip başa boşluk (sessiz bölge) koy
  const ters = r.slice().reverse(); const hizali = r.length % 2 === 1 ? ters : [r[r.length - 1] * 0 + 1e9, ...ters];
  for (const k of runlardanCoz(r.length % 2 === 1 ? ters : [1e9, ...ters])) bul.add(k);
  return [...bul];
}

// Görüntüden: orta bölgedeki birçok yatay satır + dikey (döndürülmüş barkod) satırlar. Oy sayar.
export function goruntuCoz(img, { satirAdet = 21 } = {}) {
  const { data, width: w, height: h } = img; const oy = new Map();
  const ekle = (k) => oy.set(k, (oy.get(k) || 0) + 1);
  const y0 = Math.floor(h * 0.15); const y1 = Math.floor(h * 0.85);
  for (let i = 0; i < satirAdet; i++) {
    const y = Math.floor(y0 + ((y1 - y0) * i) / (satirAdet - 1));
    const g = new Float32Array(w); for (let x = 0; x < w; x++) g[x] = (data[y * w + x] + data[Math.min(h - 1, y + 1) * w + x] + data[Math.max(0, y - 1) * w + x]) / 3;
    satirCoz(g).forEach(ekle);
  }
  const x0 = Math.floor(w * 0.15); const x1 = Math.floor(w * 0.85);
  for (let i = 0; i < satirAdet; i++) {
    const x = Math.floor(x0 + ((x1 - x0) * i) / (satirAdet - 1));
    const g = new Float32Array(h); for (let y = 0; y < h; y++) g[y] = (data[y * w + x] + data[y * w + Math.min(w - 1, x + 1)] + data[y * w + Math.max(0, x - 1)]) / 3;
    satirCoz(g).forEach(ekle);
  }
  return [...oy.entries()].sort((a, b) => b[1] - a[1]).map(([kod, oy2]) => ({ kod, oy: oy2 }));
}
