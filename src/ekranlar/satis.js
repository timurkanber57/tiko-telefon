import { h, bildir } from '../ui.js';
import { para, sepetHesapla, odemeKontrol, satisKaydiOlustur, iskontoYuzde, SIRKETLER } from '../cekirdek.js';
import { taramaBileseni } from './tarama.js';
import { stokSatiri } from './fiyat.js';

export function satisEkrani(kok, ctx) {
  if (!ctx.sirket) { kok.replaceChildren(h('div', { class: 'uyari' }, 'Üstten şirket seç (Eraslan / Kitapkafası). Karışmasın diye zorunlu.')); return; }
  let sepet = []; let sepetIsk = 0;
  const liste = h('div'); const ozet = h('div'); const bulunan = h('div');

  const ciz = () => {
    const hs = sepetHesapla(sepet, sepetIsk);
    liste.replaceChildren(...hs.satirlar.map((s, i) => h('div', { class: 'kart' },
      h('div', { class: 'ad' }, s.ad), s.barkod ? h('div', { class: 'kucuk' }, s.barkod) : null,
      h('div', { class: 'satir' },
        h('input', { type: 'number', inputmode: 'decimal', value: s.miktar, step: 'any', onchange: (e) => { sepet[i].miktar = Number(e.target.value) || 0; ciz(); } }),
        h('input', { type: 'number', inputmode: 'decimal', value: s.birimFiyat, step: 'any', onchange: (e) => { sepet[i].birimFiyat = Number(e.target.value) || 0; ciz(); } }),
        h('input', { type: 'text', placeholder: 'isk % (10+5)', value: s.iskonto || '', onchange: (e) => { if (Number.isNaN(iskontoYuzde(e.target.value))) { bildir('İskonto hatalı', true); e.target.value = ''; sepet[i].iskonto = ''; } else sepet[i].iskonto = e.target.value; ciz(); } }),
        h('button', { class: 'b kirmizi dar', onclick: () => { sepet.splice(i, 1); ciz(); } }, '✕')),
      h('div', { class: 'kucuk' }, 'Tutar: ₺' + para(s.tutar)))));
    ozet.replaceChildren(h('div', { class: 'toplam' }, 'Toplam ₺' + para(hs.toplam)), sepet.length ? h('button', { class: 'b yesil', style: 'width:100%;margin-top:8px', onclick: ode }, 'ÖDEME') : null);
  };

  const ekle = async (barkod) => {
    const u = await ctx.kaynak.urunBul(barkod);
    if (!u) { bildir('Ürün yok: ' + barkod, true); return; }
    const var_ = sepet.find((s) => s.urunId === u.id);
    if (var_) var_.miktar += 1; else sepet.push({ urunId: u.id, barkod, ad: u.ad, miktar: 1, birimFiyat: u.fiyat, iskonto: '' });
    bulunan.replaceChildren(); navigator.vibrate?.(30); ciz();
  };
  const t = taramaBileseni(async (m) => {
    const b = await ctx.kaynak.urunBul(m);
    if (b) return ekle(m);
    const sonuc = await ctx.kaynak.urunAra(m, 8);
    bulunan.replaceChildren(...sonuc.map((u) => h('div', { class: 'kart', onclick: () => ekle(u.barkodlar[0] || '') }, h('div', { class: 'ad' }, u.ad), h('div', {}, '₺' + para(u.fiyat)), stokSatiri(ctx, u))));
    if (!sonuc.length) bildir('Bulunamadı', true);
  }, { yer: 'Barkod okut / ürün adı yaz' });

  const ode = () => {
    const hs = sepetHesapla(sepet, sepetIsk);
    const nakit = h('input', { type: 'number', inputmode: 'decimal', placeholder: 'Nakit' }); const kart = h('input', { type: 'number', inputmode: 'decimal', placeholder: 'Kredi kartı' });
    const durum = h('div', { class: 'kucuk' }); const hesapla = () => { const o = odemeKontrol(hs.toplam, [{ tip: 'nakit', tutar: nakit.value }, { tip: 'kart', tutar: kart.value }]); durum.textContent = o.tamam ? 'Para üstü: ₺' + para(o.paraUstu) : 'Kalan: ₺' + para(o.kalan); };
    nakit.oninput = hesapla; kart.oninput = hesapla;
    const hizli = h('div', { class: 'satir' }, h('button', { class: 'b ikinci', onclick: () => { nakit.value = hs.toplam; kart.value = ''; hesapla(); } }, 'Tamamı nakit'), h('button', { class: 'b ikinci', onclick: () => { kart.value = hs.toplam; nakit.value = ''; hesapla(); } }, 'Tamamı kart'));
    const kaydet = h('button', { class: 'b yesil', onclick: async () => {
      try {
        const odemeler = [{ tip: 'nakit', tutar: nakit.value }, { tip: 'kart', tutar: kart.value }];
        const k = satisKaydiOlustur({ cihazId: await ctx.kaynak.cihazId(), sirket: ctx.sirket, satirlar: sepet, odemeler, sepetIsk });
        await ctx.kaynak.kaydet(k); sepet = []; sepetIsk = 0; bildir('Satış kaydedildi ✔ (bekleyen)'); ciz(); kok.querySelector('.odeme')?.remove();
      } catch (e) { bildir(e.message, true); }
    } }, 'SATIŞI KAYDET');
    const kutu = h('div', { class: 'kart odeme' }, h('div', { class: 'toplam' }, '₺' + para(hs.toplam)), hizli, nakit, kart, durum, kaydet, h('button', { class: 'b ikinci', onclick: () => kutu.remove() }, 'Vazgeç'));
    kok.prepend(kutu); hesapla();
  };
  kok.replaceChildren(h('div', { class: 'kucuk' }, 'Satış: ' + ctx.sirketAd + ' · mali fiş değildir, bulut/TİKO’ya aktarılana dek "bekleyen"'), t, bulunan, liste, ozet);
  ciz();
  return () => t.kapat();
}
