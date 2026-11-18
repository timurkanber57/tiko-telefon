// BULUT kaynağı (şimdilik kullanılmıyor). Supabase REST (PostgREST) üzerinden aynı arayüz.
// Bağlarken: ayarlardaki {url, anahtar (SADECE anon/publishable), oturumToken} ile kurulur. Service key ASLA telefona konmaz.
// Tablo yapısı ve RLS: sema/supabase.sql. Ayrıntı: docs/SENKRON.md
import { YerelKaynak } from './yerel.js';

export class BulutKaynak extends YerelKaynak {
  constructor(depo, { url, anahtar, token, fetchFn = globalThis.fetch }) {
    super(depo); this.ad = 'bulut'; this.url = url.replace(/\/$/, ''); this.anahtar = anahtar; this.token = token; this.fetch = fetchFn;
  }
  _baslik() { return { apikey: this.anahtar, Authorization: `Bearer ${this.token || this.anahtar}`, 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal' }; }

  // Katalog + stok buluttan iner (stok_miktar şirket bazlı). Çevrimdışıyken yerel kopya kullanılır.
  async katalogGuncelle() {
    const r = await this.fetch(`${this.url}/rest/v1/telefon_katalog?select=*`, { headers: this._baslik() });
    if (!r.ok) throw new Error('Katalog alınamadı: ' + r.status);
    const urunler = await r.json();
    return this.katalogYukle({ surum: 1, olusturuldu: new Date().toISOString(), urunler: urunler.map((u) => ({ id: u.id, ad: u.ad, fiyat: u.fiyat, alis: u.alis, birim: u.birim, barkodlar: u.barkodlar, stok: u.stok })) });
  }

  // Outbox → bulut. id (UUID) birincil anahtar olduğundan tekrar gönderme çift kayıt YAPMAZ (idempotent).
  async senkronla() {
    const bekleyen = await this.bekleyenler(); let gonderilen = 0; const hatalar = [];
    for (const k of bekleyen) {
      const tablo = k.tur === 'satis' ? 'telefon_satis' : 'telefon_sayim';
      try {
        const r = await this.fetch(`${this.url}/rest/v1/${tablo}`, { method: 'POST', headers: this._baslik(), body: JSON.stringify({ id: k.id, cihaz_id: k.cihazId, sirket: k.sirket, veri: k, olusturuldu: k.olusturuldu }) });
        if (r.ok || r.status === 409) { await this.kaydet({ ...k, durum: 'gonderildi' }); gonderilen++; } else hatalar.push(k.id + ': ' + r.status);
      } catch (e) { hatalar.push(k.id + ': ağ yok'); break; }
    }
    return { gonderilen, bekleyen: bekleyen.length - gonderilen, hatalar, mesaj: hatalar.length ? 'Bazı kayıtlar gönderilemedi, sonra tekrar denenecek.' : 'Senkron tamam.' };
  }
}
