// Saf (tarayıcıdan bağımsız) iş kuralları: barkod, para, sepet hesabı, kimlik. Node'da test edilir.

export const SIRKETLER = {
  eraslan: { kod: 'eraslan', ad: 'Eraslan Kırtasiye', renk: '#F47920' },
  kitapkafasi: { kod: 'kitapkafasi', ad: 'Kitapkafası', renk: '#1F2937' },
};

export const yuvarla = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export const para = (n) => new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

// Çevrimdışı üretilen, bulutta çakışmayan kimlik (UUID v4)
export function yeniId() {
  const c = globalThis.crypto;
  if (c && c.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16); (c || { getRandomValues: (x) => x.map(() => Math.floor(Math.random() * 256)) }).getRandomValues(b);
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

// EAN-13 / EAN-8 / UPC-A sağlama basamağı. Harfli / farklı uzunluktaki kodlar (iç stok kodu) geçerli sayılır: sadece normalize edilir.
export function barkodNormalize(x) { return String(x == null ? '' : x).trim().replace(/\s+/g, ''); }
export function eanGecerli(kod) {
  const k = barkodNormalize(kod);
  if (!/^\d+$/.test(k) || ![8, 12, 13].includes(k.length)) return false;
  const d = k.split('').map(Number); const son = d.pop();
  let t = 0; d.reverse().forEach((v, i) => { t += v * (i % 2 === 0 ? 3 : 1); });
  return (10 - (t % 10)) % 10 === son;
}

// "10", "10+5", "%10", "10,5" → birleşik yüzde (ardışık iskonto: 10+5 → 14,5)
export function iskontoYuzde(metin) {
  if (metin == null || metin === '') return 0;
  const parcalar = String(metin).replace(/%/g, '').split('+').map((p) => Number(String(p).trim().replace(',', '.')));
  if (parcalar.some((p) => Number.isNaN(p) || p < 0 || p > 100)) return NaN;
  let kalan = 1; for (const p of parcalar) kalan *= 1 - p / 100;
  return yuvarla((1 - kalan) * 100);
}

// Sepet: satirlar [{miktar, birimFiyat, iskonto:'10+5'|number}] → {satirlar:[{tutar,iskYuzde}], ara, indirim, toplam, adet}
export function sepetHesapla(satirlar, sepetIsk = 0) {
  let ara = 0; let net = 0; let adet = 0;
  const cikti = (satirlar || []).map((s) => {
    const m = Number(s.miktar) || 0; const f = Number(s.birimFiyat) || 0;
    const y = iskontoYuzde(s.iskonto); const iy = Number.isNaN(y) ? 0 : y;
    const brut = yuvarla(m * f); const tutar = yuvarla(brut * (1 - iy / 100));
    ara += brut; net += tutar; adet += m;
    return { ...s, iskYuzde: iy, brut, tutar };
  });
  const sepetTutar = Math.min(Math.max(Number(sepetIsk) || 0, 0), net);
  const toplam = yuvarla(net - sepetTutar);
  return { satirlar: cikti, ara: yuvarla(ara), indirim: yuvarla(ara - toplam), toplam, adet };
}

// Ödemeler toplamı sepet toplamını karşılamalı (nakitte para üstü ayrı hesaplanır)
export function odemeKontrol(toplam, odemeler) {
  const alinan = yuvarla((odemeler || []).reduce((a, o) => a + (Number(o.tutar) || 0), 0));
  const nakit = yuvarla((odemeler || []).filter((o) => o.tip === 'nakit').reduce((a, o) => a + (Number(o.tutar) || 0), 0));
  const digerler = yuvarla(alinan - nakit);
  const nakitGereken = yuvarla(Math.max(toplam - digerler, 0));
  const paraUstu = yuvarla(Math.max(nakit - nakitGereken, 0));
  return { tamam: alinan + 0.001 >= toplam, kalan: yuvarla(Math.max(toplam - alinan, 0)), paraUstu };
}

// ---- Bulutla birleşecek kayıtlar (outbox). Hepsi: id (UUID), cihazId, sirket, olusturuldu (ISO), durum ----
export function satisKaydiOlustur({ cihazId, sirket, satirlar, odemeler, sepetIsk = 0, kasiyer = '' }) {
  if (!SIRKETLER[sirket]) throw new Error('Şirket seçilmeden satış yapılamaz');
  if (!satirlar || !satirlar.length) throw new Error('Sepet boş');
  const h = sepetHesapla(satirlar, sepetIsk);
  const o = odemeKontrol(h.toplam, odemeler);
  if (!o.tamam) throw new Error('Ödeme tutarı eksik (kalan ₺' + para(o.kalan) + ')');
  return {
    tur: 'satis', id: yeniId(), cihazId, sirket, kasiyer, olusturuldu: new Date().toISOString(), durum: 'bekliyor',
    satirlar: h.satirlar.map((s) => ({ urunId: s.urunId || null, barkod: s.barkod || '', ad: s.ad, miktar: s.miktar, birimFiyat: s.birimFiyat, iskonto: s.iskonto || '', iskYuzde: s.iskYuzde, tutar: s.tutar })),
    sepetIsk: yuvarla(Number(sepetIsk) || 0), ara: h.ara, toplam: h.toplam,
    odemeler: (odemeler || []).filter((x) => Number(x.tutar) > 0).map((x) => ({ tip: x.tip, tutar: yuvarla(x.tutar) })), paraUstu: o.paraUstu,
  };
}

export function sayimKaydiOlustur({ cihazId, sirket, ad, satirlar }) {
  if (!SIRKETLER[sirket]) throw new Error('Şirket seçilmeden sayım yapılamaz');
  return { tur: 'sayim', id: yeniId(), cihazId, sirket, ad: ad || 'Sayım', olusturuldu: new Date().toISOString(), durum: 'bekliyor', satirlar: (satirlar || []).map((s) => ({ urunId: s.urunId || null, barkod: s.barkod, ad: s.ad || '', sayilan: Number(s.sayilan) || 0, alis: s.alis == null ? null : Number(s.alis), satis: s.satis == null ? null : Number(s.satis) })) };
}

// TİKO "Hızlı stok girişi → içe aktar" ile uyumlu CSV (Barkod;Adet)
export function sayimCsv(kayit) {
  const satir = (kayit.satirlar || []).map((s) => `${s.barkod};${String(s.sayilan).replace('.', ',')}`);
  return ['Barkod;Adet', ...satir].join('\r\n') + '\r\n';
}

// Excel satırları: Barkod | Ürün Adı | Adet | Alış Fiyatı | Satış Fiyatı (TİKO sayım yükleme bu başlıkları tanır)
export function sayimExcelSatirlari(kayit) {
  return [['Barkod', 'Ürün Adı', 'Adet', 'Alış Fiyatı', 'Satış Fiyatı'], ...(kayit.satirlar || []).map((s) => [s.barkod, s.ad || '', Number(s.sayilan) || 0, s.alis == null ? '' : s.alis, s.satis == null ? '' : s.satis])];
}

// Katalog arama: barkod tam eşleşme > ad içinde (Türkçe duyarsız, tüm kelimeler)
export const turkceKucuk = (s) => String(s || '').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i').normalize('NFD').replace(/[̀-ͯ]/g, '');
export function adAra(urunler, metin, limit = 30) {
  const kelimeler = turkceKucuk(metin).split(/\s+/).filter(Boolean);
  if (!kelimeler.length) return [];
  const sonuc = [];
  for (const u of urunler) {
    const ad = u._arama || turkceKucuk(u.ad);
    if (kelimeler.every((k) => ad.includes(k))) { sonuc.push(u); if (sonuc.length >= limit) break; }
  }
  return sonuc;
}
