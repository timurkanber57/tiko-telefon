import test from 'node:test'; import assert from 'node:assert/strict';
import { eanGecerli, iskontoYuzde, sepetHesapla, odemeKontrol, satisKaydiOlustur, sayimKaydiOlustur, sayimCsv, adAra, turkceKucuk, yeniId } from '../src/cekirdek.js';

test('EAN sağlama', () => { assert.ok(eanGecerli('8690504010109') === eanGecerli('8690504010109')); assert.ok(eanGecerli('4006381333931')); assert.ok(!eanGecerli('4006381333932')); assert.ok(!eanGecerli('ABC')); });
test('iskonto birleşik', () => { assert.equal(iskontoYuzde('10+5'), 14.5); assert.equal(iskontoYuzde('%10'), 10); assert.equal(iskontoYuzde('10,5'), 10.5); assert.ok(Number.isNaN(iskontoYuzde('abc'))); assert.ok(Number.isNaN(iskontoYuzde('120'))); assert.equal(iskontoYuzde(''), 0); });
test('sepet hesabı', () => {
  const h = sepetHesapla([{ miktar: 2, birimFiyat: 10 }, { miktar: 1, birimFiyat: 100, iskonto: '10' }]);
  assert.equal(h.ara, 120); assert.equal(h.toplam, 110); assert.equal(h.indirim, 10); assert.equal(h.adet, 3);
  assert.equal(sepetHesapla([{ miktar: 1, birimFiyat: 50 }], 20).toplam, 30);
});
test('ödeme kontrol', () => {
  assert.equal(odemeKontrol(100, [{ tip: 'nakit', tutar: 120 }]).paraUstu, 20);
  assert.equal(odemeKontrol(100, [{ tip: 'nakit', tutar: 30 }, { tip: 'kart', tutar: 70 }]).tamam, true);
  assert.equal(odemeKontrol(100, [{ tip: 'kart', tutar: 40 }]).kalan, 60);
});
test('satış kaydı: şirket zorunlu, ödeme eksikse hata, id benzersiz', () => {
  const s = [{ urunId: '1', ad: 'Kalem', miktar: 2, birimFiyat: 5 }];
  assert.throws(() => satisKaydiOlustur({ cihazId: 'c', sirket: '', satirlar: s, odemeler: [] }), /Şirket/);
  assert.throws(() => satisKaydiOlustur({ cihazId: 'c', sirket: 'eraslan', satirlar: [], odemeler: [] }), /boş/);
  assert.throws(() => satisKaydiOlustur({ cihazId: 'c', sirket: 'eraslan', satirlar: s, odemeler: [{ tip: 'nakit', tutar: 5 }] }), /eksik/);
  const k = satisKaydiOlustur({ cihazId: 'c', sirket: 'kitapkafasi', satirlar: s, odemeler: [{ tip: 'nakit', tutar: 20 }] });
  assert.equal(k.toplam, 10); assert.equal(k.paraUstu, 10); assert.equal(k.durum, 'bekliyor'); assert.equal(k.sirket, 'kitapkafasi');
  assert.notEqual(k.id, satisKaydiOlustur({ cihazId: 'c', sirket: 'eraslan', satirlar: s, odemeler: [{ tip: 'nakit', tutar: 10 }] }).id);
  assert.match(yeniId(), /^[0-9a-f-]{36}$/);
});
test('sayım CSV TİKO uyumlu', () => {
  const k = sayimKaydiOlustur({ cihazId: 'c', sirket: 'eraslan', satirlar: [{ barkod: '123', sayilan: 3 }, { barkod: '456', sayilan: 2.5 }] });
  assert.equal(sayimCsv(k), 'Barkod;Adet\r\n123;3\r\n456;2,5\r\n');
  assert.throws(() => sayimKaydiOlustur({ cihazId: 'c', sirket: 'x', satirlar: [] }));
});
test('Türkçe arama', () => {
  const u = [{ ad: 'ŞEKER Pembe Kalem' }, { ad: 'Defter A4' }];
  assert.equal(adAra(u, 'seker kalem').length, 1); assert.equal(adAra(u, 'ŞEKER')[0].ad, 'ŞEKER Pembe Kalem'); assert.equal(turkceKucuk('IĞDIR'), 'igdir');
});
import { xlsxYaz } from '../src/xlsx.js'; import { sayimExcelSatirlari } from '../src/cekirdek.js'; import fs from 'node:fs';
test('sayım excel satırları ve xlsx dosyası', () => {
  const k = sayimKaydiOlustur({ cihazId: 'c', sirket: 'eraslan', satirlar: [{ barkod: '8690000000017', ad: 'Kalem & "Pilot"', sayilan: 3, alis: 5.5, satis: 12.5 }, { barkod: '1', sayilan: 1 }] });
  const r = sayimExcelSatirlari(k); assert.deepEqual(r[0], ['Barkod', 'Ürün Adı', 'Adet', 'Alış Fiyatı', 'Satış Fiyatı']); assert.deepEqual(r[1], ['8690000000017', 'Kalem & "Pilot"', 3, 5.5, 12.5]); assert.deepEqual(r[2], ['1', '', 1, '', '']);
  const b = xlsxYaz(r); assert.equal(b[0], 0x50); assert.equal(b[1], 0x4b); fs.writeFileSync('/tmp/telefon-test.xlsx', b);
});

test('satır iskonto: yüzde / ₺ düş / yeni fiyat; toplam iskonto: yüzde / ₺ / hedef', () => {
  const sat = (x) => ({ miktar: 2, birimFiyat: 50, ...x });
  assert.equal(sepetHesapla([sat({ iskonto: '10' })]).toplam, 90);
  assert.equal(sepetHesapla([sat({ iskTutar: 15 })]).toplam, 85);
  assert.equal(sepetHesapla([sat({ netFiyat: 40 })]).toplam, 80);
  assert.equal(sepetHesapla([sat({ netFiyat: 40, miktar: 3 })]).toplam, 120, 'yeni fiyat adetle çarpılır');
  const a = [sat({ iskonto: '10' }), { miktar: 1, birimFiyat: 10 }]; // net 100
  assert.equal(sepetHesapla(a, { tip: 'yuzde', deger: 10 }).toplam, 90);
  assert.equal(sepetHesapla(a, { tip: 'tutar', deger: 7 }).toplam, 93);
  assert.equal(sepetHesapla(a, { tip: 'hedef', deger: 95 }).toplam, 95);
  assert.equal(sepetHesapla(a, { tip: 'hedef', deger: 500 }).toplam, 100, 'hedef toplamdan büyükse artış yok');
  assert.equal(sepetHesapla(a, 500).toplam, 0, 'iskonto toplamı aşamaz');
  const k = satisKaydiOlustur({ cihazId: 'c', sirket: 'eraslan', satirlar: a, odemeler: [{ tip: 'nakit', tutar: 95 }], sepetIsk: { tip: 'hedef', deger: 95 } });
  assert.equal(k.toplam, 95); assert.equal(k.sepetIsk, 5); assert.equal(k.satirlar[0].iskYuzde, 10);
});
