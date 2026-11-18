# TİKO Telefon — bulut mimarisi (hazır altyapı)

Telefon uygulaması **bugün çevrimdışı** çalışır; bulut geldiğinde ekranlar değişmez, yalnızca veri kaynağı değişir.

```
Ekranlar (fiyat/satis/sayim/ayar)
        │  hep aynı arayüz
        ▼
 VeriKaynagi ── YerelKaynak (şimdi)  : katalog JSON + IndexedDB + "bekleyen" kayıtlar
              └ BulutKaynak (sonra)  : Supabase/Neon REST; katalog+stok iner, kayıtlar yüklenir
```

## Arayüz (yerel.js'teki sınıf; bulut.js bunu genişletir)
`urunBul(barkod)`, `urunAra(metin)`, `stokGoster(urun, sirket)`, `kaydet(kayit)`, `bekleyenler()`, `senkronla()`, `katalogYukle()` / `katalogGuncelle()`.

## Çakışmasız birleşme kuralları
1. Her satış/sayım telefonda **UUID** ile doğar (çevrimdışı çakışmaz). Bulutta `id` birincil anahtar → aynı kayıt iki kez gönderilse de **tek** kalır.
2. Kayıt **değişmez** (immutable): sonradan düzenlenmez, düzeltme yeni kayıtla yapılır.
3. Her kayıtta `sirket` zorunlu (`eraslan` | `kitapkafasi`): şirketler karışmaz.
4. `durum`: `bekliyor` → `gonderildi` (buluta indi) → TİKO işleyince bulutta `tiko_isledi=true`.
5. Stok **telefonda hesaplanmaz**; katalog/buluttan gelen değer gösterilir. Yoksa "bulut bağlanınca görünür" yazar.

## Bulut açılınca yapılacaklar (sırayla)
1. Supabase/Neon projesi + `sema/supabase.sql` çalıştır. Auth'ta kayıt (signup) kapat, personel kullanıcılarını elle ekle. 2FA aç.
2. TİKO masaüstü: katalog+stok'u `telefon_katalog`'a yazan senkron (service_role **yalnız masaüstünde**).
3. TİKO masaüstü: `telefon_satis/sayim` içinde `tiko_isledi=false` kayıtları çekip işler (satış → şirkete göre stok düş/ciro; sayım → sayım fişi).
4. Telefonda Ayar'dan `bulut` ayarı: `{url, anahtar(anon), token}` → `kaynakOlustur` otomatik BulutKaynak seçer.

## Şimdilik elle köprü
- TİKO → Envanter → **📱 Telefon kataloğu** → JSON → telefonda Ayar → dosya seç.
- Sayım → **CSV indir** → TİKO Hızlı stok girişi'nde içe aktar (Barkod;Adet).
- Telefon satışları şimdilik "bekleyen" kalır; bulut gelince otomatik akar. (Mali fiş değildir.)
