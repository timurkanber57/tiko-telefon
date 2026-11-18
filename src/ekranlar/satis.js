import { h, bildir } from '../ui.js';
import { para, sepetHesapla, odemeKontrol, satisKaydiOlustur, iskontoYuzde } from '../cekirdek.js';
import { taramaBileseni } from './tarama.js';
import { stokSatiri } from './fiyat.js';

const sayi = (v) => Number(String(v).replace(',', '.'));

export function satisEkrani(kok, ctx) {
  if (!ctx.sirket) { kok.replaceChildren(h('div', { class: 'uyari' }, 'Üstten şirket seç (Eraslan / Kitapkafası). Karışmasın diye zorunlu.')); return; }
  let sepet = []; let sepetIsk = 0; let acikSatir = -1; // acikSatir: iskonto paneli açık satır
  const liste = h('div'); const ozet = h('div'); const bulunan = h('div');

  const iskEtiket = (s) => {
    if (s.netFiyat != null && s.netFiyat !== '') return 'Yeni fiyat ₺' + para(s.netFiyat);
    if (s.iskTutar > 0) return '-₺' + para(s.iskTutar);
    if (s.iskonto) return '-%' + s.iskonto;
    return '';
  };
  const iskTemizle = (s) => { s.iskonto = ''; s.iskTutar = 0; s.netFiyat = null; };

  // Satır iskonto paneli: %, ₺ tutar, yeni fiyat — dokunmatik hızlı seçimlerle
  const satirPaneli = (s, i) => {
    let tip = s.netFiyat != null && s.netFiyat !== '' ? 'fiyat' : s.iskTutar > 0 ? 'tutar' : 'yuzde';
    const gir = h('input', { type: 'text', inputmode: 'decimal', placeholder: '', value: tip === 'fiyat' ? s.netFiyat : tip === 'tutar' ? s.iskTutar : s.iskonto || '' });
    const seg = h('div', { class: 'satir' }); const hizli = h('div', { class: 'satir' });
    const uygula = (deger) => {
      const d = deger !== undefined ? deger : gir.value;
      if (String(d).trim() === '') { iskTemizle(s); acikSatir = -1; return ciz(); }
      if (tip === 'yuzde') { if (Number.isNaN(iskontoYuzde(d))) return bildir('İskonto hatalı (ör. 10 ya da 10+5)', true); iskTemizle(s); s.iskonto = String(d).replace('%', ''); }
      else if (tip === 'tutar') { const n = sayi(d); if (!(n > 0)) return bildir('Tutar hatalı', true); iskTemizle(s); s.iskTutar = n; }
      else { const n = sayi(d); if (!(n >= 0)) return bildir('Fiyat hatalı', true); iskTemizle(s); s.netFiyat = n; }
      acikSatir = -1; ciz();
    };
    const segCiz = () => {
      seg.replaceChildren(...[['yuzde', '%'], ['tutar', '₺ düş'], ['fiyat', 'Yeni fiyat']].map(([k, a]) => h('button', { class: 'b ' + (tip === k ? '' : 'ikinci'), onclick: () => { tip = k; gir.value = ''; segCiz(); gir.focus(); } }, a)));
      hizli.replaceChildren(...(tip === 'yuzde' ? [5, 10, 15, 20, 25, 50] : tip === 'tutar' ? [1, 2, 5, 10, 20] : []).map((v) => h('button', { class: 'b ikinci', onclick: () => uygula(v) }, tip === 'yuzde' ? '%' + v : '₺' + v)));
    };
    segCiz(); gir.addEventListener('keydown', (e) => { if (e.key === 'Enter') uygula(); });
    return h('div', { class: 'kart', style: 'background:#FFF7ED' }, h('div', { class: 'kucuk' }, 'İskonto: ' + s.ad + ' (liste ₺' + para(s.birimFiyat) + ')'), seg, hizli, h('div', { class: 'satir' }, gir, h('button', { class: 'b yesil dar', onclick: () => uygula() }, 'Uygula'), h('button', { class: 'b kirmizi dar', onclick: () => { iskTemizle(s); acikSatir = -1; ciz(); } }, 'Kaldır')));
  };

  const ciz = () => {
    const hs = sepetHesapla(sepet, sepetIsk);
    liste.replaceChildren(...hs.satirlar.map((s, i) => [h('div', { class: 'kart' },
      h('div', { class: 'ad' }, s.ad), s.barkod ? h('div', { class: 'kucuk' }, s.barkod) : null,
      h('div', { class: 'satir' },
        h('button', { class: 'b ikinci dar', onclick: () => { sepet[i].miktar = Math.max(0, (Number(sepet[i].miktar) || 0) - 1) || 1; ciz(); } }, '−'),
        h('input', { type: 'number', inputmode: 'decimal', value: s.miktar, step: 'any', style: 'text-align:center', onchange: (e) => { sepet[i].miktar = Number(e.target.value) || 1; ciz(); } }),
        h('button', { class: 'b ikinci dar', onclick: () => { sepet[i].miktar = (Number(sepet[i].miktar) || 0) + 1; ciz(); } }, '+'),
        h('input', { type: 'number', inputmode: 'decimal', value: s.birimFiyat, step: 'any', onchange: (e) => { sepet[i].birimFiyat = Number(e.target.value) || 0; ciz(); } }),
        h('button', { class: 'b kirmizi dar', onclick: () => { sepet.splice(i, 1); acikSatir = -1; ciz(); } }, '✕')),
      h('div', { class: 'satir' },
        h('button', { class: 'b ' + (iskEtiket(s) ? '' : 'ikinci'), onclick: () => { acikSatir = acikSatir === i ? -1 : i; ciz(); } }, iskEtiket(s) ? '🏷 ' + iskEtiket(s) : '🏷 İskonto'),
        h('div', { class: 'ad', style: 'text-align:right' }, (s.iskYuzde > 0 ? h('span', { class: 'kucuk', style: 'text-decoration:line-through;margin-right:6px' }, '₺' + para(s.brut)) : ''), '₺' + para(s.tutar))),
    ), acikSatir === i ? satirPaneli(sepet[i], i) : null]).flat());

    const toplamDugme = sepet.length ? h('button', { class: 'b ' + (hs.sepetIskTutar > 0 ? '' : 'ikinci'), style: 'width:100%;margin:6px 0', onclick: toplamPaneli }, hs.sepetIskTutar > 0 ? `🏷 Toplam iskonto: -₺${para(hs.sepetIskTutar)} (değiştir)` : '🏷 Toplam iskonto') : null;
    ozet.replaceChildren(
      hs.indirim > 0 ? h('div', { class: 'kucuk', style: 'text-align:right' }, 'Liste ₺' + para(hs.ara) + ' · İndirim -₺' + para(hs.indirim)) : null,
      h('div', { class: 'toplam' }, 'Toplam ₺' + para(hs.toplam)), toplamDugme,
      sepet.length ? h('button', { class: 'b yesil', style: 'width:100%', onclick: ode }, 'ÖDEME') : null);
  };

  // Toplam iskonto: yüzde, ₺ ya da "toplam şu olsun" (yuvarlama)
  const toplamPaneli = () => {
    const hs = sepetHesapla(sepet, 0); let tip = 'yuzde';
    const gir = h('input', { type: 'text', inputmode: 'decimal' }); const seg = h('div', { class: 'satir' }); const hizli = h('div', { class: 'satir' }); const sonuc = h('div', { class: 'kucuk' });
    const hesap = () => { const g = sayi(gir.value); if (!(g >= 0) || gir.value === '') { sonuc.textContent = ''; return; } sonuc.textContent = 'Yeni toplam: ₺' + para(sepetHesapla(sepet, { tip, deger: g }).toplam); };
    const uygula = (d) => { const g = d !== undefined ? d : sayi(gir.value); if (!(g >= 0)) return bildir('Değer hatalı', true); sepetIsk = { tip, deger: g }; kutu.remove(); ciz(); };
    const segCiz = () => {
      seg.replaceChildren(...[['yuzde', 'Yüzde %'], ['tutar', '₺ düş'], ['hedef', 'Toplam şu olsun']].map(([k, a]) => h('button', { class: 'b ' + (tip === k ? '' : 'ikinci'), onclick: () => { tip = k; gir.value = ''; gir.placeholder = k === 'hedef' ? 'Örn. ' + Math.floor(hs.net) : ''; segCiz(); hesap(); gir.focus(); } }, a)));
      hizli.replaceChildren(...(tip === 'yuzde' ? [5, 10, 15, 20] : tip === 'tutar' ? [1, 5, 10, 20] : []).map((v) => h('button', { class: 'b ikinci', onclick: () => uygula(v) }, tip === 'yuzde' ? '%' + v : '₺' + v)),
        ...(tip === 'hedef' ? [h('button', { class: 'b ikinci', onclick: () => uygula(Math.floor(hs.net)) }, 'Kuruşu at ₺' + para(Math.floor(hs.net))), h('button', { class: 'b ikinci', onclick: () => uygula(Math.floor(hs.net / 5) * 5) }, '5’e yuvarla ₺' + para(Math.floor(hs.net / 5) * 5))] : []));
    };
    gir.addEventListener('input', hesap); gir.addEventListener('keydown', (e) => { if (e.key === 'Enter') uygula(); });
    const kutu = h('div', { class: 'kart', style: 'background:#FFF7ED' }, h('div', { class: 'ad' }, 'Toplam iskonto (satır iskontoları sonrası ₺' + para(hs.net) + ')'), seg, hizli, gir, sonuc,
      h('div', { class: 'satir' }, h('button', { class: 'b yesil', onclick: () => uygula() }, 'Uygula'), h('button', { class: 'b kirmizi', onclick: () => { sepetIsk = 0; kutu.remove(); ciz(); } }, 'Kaldır'), h('button', { class: 'b ikinci', onclick: () => kutu.remove() }, 'Vazgeç')));
    segCiz(); ozet.prepend(kutu); gir.focus();
  };

  const ekle = async (barkod) => {
    const u = await ctx.kaynak.urunBul(barkod);
    if (!u) { bildir('Ürün yok: ' + barkod, true); return; }
    const var_ = sepet.find((s) => s.urunId === u.id);
    if (var_) var_.miktar += 1; else sepet.push({ urunId: u.id, barkod, ad: u.ad, miktar: 1, birimFiyat: u.fiyat, iskonto: '', iskTutar: 0, netFiyat: null });
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
        await ctx.kaynak.kaydet(k); sepet = []; sepetIsk = 0; acikSatir = -1; bildir('Satış kaydedildi ✔ (bekleyen)'); ciz(); kok.querySelector('.odeme')?.remove();
      } catch (e) { bildir(e.message, true); }
    } }, 'SATIŞI KAYDET');
    const kutu = h('div', { class: 'kart odeme' }, h('div', { class: 'toplam' }, '₺' + para(hs.toplam)), hizli, nakit, kart, durum, kaydet, h('button', { class: 'b ikinci', onclick: () => kutu.remove() }, 'Vazgeç'));
    kok.prepend(kutu); hesapla();
  };
  kok.replaceChildren(h('div', { class: 'kucuk' }, 'Satış: ' + ctx.sirketAd + ' · mali fiş değildir, bulut/TİKO’ya aktarılana dek "bekleyen"'), t, bulunan, liste, ozet);
  ciz();
  return () => t.kapat();
}
