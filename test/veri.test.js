import test from 'node:test'; import assert from 'node:assert/strict';
import { bellekDepo } from '../src/veri/depo.js'; import { YerelKaynak } from '../src/veri/yerel.js'; import { BulutKaynak } from '../src/veri/bulut.js';
import { satisKaydiOlustur } from '../src/cekirdek.js';

const KAT = { surum: 1, olusturuldu: '2026-11-18T10:00:00Z', urunler: [
  { id: 1, ad: 'Pilot Kalem', fiyat: 25.5, birim: 'Adet', barkodlar: ['111', '222'], stok: { eraslan: 10, kitapkafasi: 0 } },
  { id: 2, ad: 'Roman Kitap', fiyat: 100, birim: 'Adet', barkodlar: ['333'], stok: null } ] };

test('katalog yükle, barkod/ad bul, stok yalnız varsa', async () => {
  const k = new YerelKaynak(bellekDepo()); await k.katalogYukle(KAT);
  assert.equal((await k.urunBul(' 222 ')).ad, 'Pilot Kalem'); assert.equal(await k.urunBul('999'), null);
  assert.equal((await k.urunAra('roman'))[0].id, '2');
  assert.equal(k.stokGoster(await k.urunBul('111'), 'eraslan'), 10); assert.equal(k.stokGoster(await k.urunBul('111'), 'kitapkafasi'), 0);
  assert.equal(k.stokGoster(await k.urunBul('333'), 'eraslan'), null);
  await assert.rejects(k.katalogYukle({ surum: 9, urunler: [] }));
});
test('yeniden katalog yükleme eskiyi siler; kayıtlar korunur', async () => {
  const k = new YerelKaynak(bellekDepo()); await k.katalogYukle(KAT);
  await k.kaydet(satisKaydiOlustur({ cihazId: 'c', sirket: 'eraslan', satirlar: [{ ad: 'x', miktar: 1, birimFiyat: 5 }], odemeler: [{ tip: 'nakit', tutar: 5 }] }));
  await k.katalogYukle({ ...KAT, urunler: [KAT.urunler[1]] });
  assert.equal(await k.urunBul('111'), null); assert.equal((await k.bekleyenler()).length, 1);
  assert.equal((await k.senkronla()).gonderilen, 0);
});
test('bulut senkron: idempotent, ağ yoksa bekleyen kalır', async () => {
  const depo = bellekDepo(); const cagrilar = [];
  const b = new BulutKaynak(depo, { url: 'https://x.supabase.co/', anahtar: 'a', fetchFn: async (u, o) => { cagrilar.push([u, o.body && JSON.parse(o.body).id]); return { ok: true, status: 201 }; } });
  const k = satisKaydiOlustur({ cihazId: 'c', sirket: 'eraslan', satirlar: [{ ad: 'x', miktar: 1, birimFiyat: 5 }], odemeler: [{ tip: 'nakit', tutar: 5 }] });
  await b.kaydet(k); const r = await b.senkronla();
  assert.equal(r.gonderilen, 1); assert.match(cagrilar[0][0], /telefon_satis$/); assert.equal((await b.bekleyenler()).length, 0);
  assert.equal((await b.senkronla()).gonderilen, 0);
  const yok = new BulutKaynak(bellekDepo(), { url: 'https://x', anahtar: 'a', fetchFn: async () => { throw new Error('ağ'); } });
  await yok.kaydet(k); const r2 = await yok.senkronla(); assert.equal(r2.gonderilen, 0); assert.equal((await yok.bekleyenler()).length, 1);
});
