// YEREL kaynak: katalog telefonda (TİKO'dan aktarılan JSON), satış/sayım kayıtları "bekleyen" olarak telefonda durur.
// Bulut kaynağı (bulut.js) AYNI arayüzü uygular; ekranlar hangisinin kullanıldığını bilmez.
import { barkodNormalize, adAra, turkceKucuk, yeniId } from '../cekirdek.js';

export const KATALOG_SURUM = 1;

export class YerelKaynak {
  constructor(depo) { this.depo = depo; this.ad = 'yerel'; this._cache = null; }

  async cihazId() {
    let id = await this.depo.al('ayar', 'cihazId');
    if (!id) { id = yeniId(); await this.depo.koy('ayar', 'cihazId', id); }
    return id;
  }
  async ayarAl(k, varsayilan) { const v = await this.depo.al('ayar', k); return v === undefined ? varsayilan : v; }
  async ayarYaz(k, v) { await this.depo.koy('ayar', k, v); }

  // TİKO katalog JSON: {surum, olusturuldu, urunler:[{id,ad,barkodlar:[],fiyat,birim,stok:{eraslan,kitapkafasi}|null}]}
  async katalogYukle(json) {
    const k = typeof json === 'string' ? JSON.parse(json) : json;
    if (!k || k.surum !== KATALOG_SURUM || !Array.isArray(k.urunler)) throw new Error('Geçersiz TİKO katalog dosyası');
    await this.depo.temizle('urun'); await this.depo.temizle('barkod');
    for (const u of k.urunler) {
      const kayit = { id: String(u.id), ad: u.ad, fiyat: Number(u.fiyat) || 0, alis: u.alis == null ? null : Number(u.alis), birim: u.birim || 'Adet', stok: u.stok || null, barkodlar: (u.barkodlar || []).map(barkodNormalize).filter(Boolean) };
      await this.depo.koy('urun', kayit.id, kayit);
      for (const b of kayit.barkodlar) await this.depo.koy('barkod', b, kayit.id);
    }
    await this.depo.koy('ayar', 'katalogTarih', k.olusturuldu || new Date().toISOString());
    this._cache = null;
    return { adet: k.urunler.length, tarih: k.olusturuldu };
  }
  async katalogBilgi() { return { tarih: await this.depo.al('ayar', 'katalogTarih') || null, adet: (await this.depo.hepsi('urun')).length }; }

  async urunBul(barkod) {
    const id = await this.depo.al('barkod', barkodNormalize(barkod));
    return id ? this.depo.al('urun', id) : null;
  }
  async urunAra(metin, limit = 30) {
    if (!this._cache) this._cache = (await this.depo.hepsi('urun')).map((u) => ({ ...u, _arama: turkceKucuk(u.ad) }));
    return adAra(this._cache, metin, limit);
  }
  // Stok: katalogda varsa sayı, yoksa null → ekran "bulut bağlanınca görünür" yazar
  stokGoster(urun, sirket) {
    if (!urun || !urun.stok) return null;
    const v = urun.stok[sirket]; return v === undefined ? null : v;
  }

  async kaydet(kayit) { await this.depo.koy('kayit', kayit.id, kayit); return kayit; }
  async kayitlar(tur) { const t = await this.depo.hepsi('kayit'); return t.filter((k) => !tur || k.tur === tur).sort((a, b) => b.olusturuldu.localeCompare(a.olusturuldu)); }
  async bekleyenler() { return (await this.kayitlar()).filter((k) => k.durum === 'bekliyor'); }
  async kayitSil(id) { await this.depo.sil('kayit', id); }

  // Bulut yok: gönderilecek yer yok. Kayıtlar korunur.
  async senkronla() { const b = await this.bekleyenler(); return { gonderilen: 0, bekleyen: b.length, mesaj: 'Bulut henüz bağlı değil — kayıtlar telefonda güvende bekliyor.' }; }
}

// Sayım taslağı: ekran kapansa / telefon yeniden başlasa bile kalır (şirket başına ayrı)
YerelKaynak.prototype.taslakAl = async function (sirket) { return (await this.depo.al('ayar', 'taslak_' + sirket)) || { ad: '', satirlar: [] }; };
YerelKaynak.prototype.taslakYaz = async function (sirket, t) { await this.depo.koy('ayar', 'taslak_' + sirket, t); };
