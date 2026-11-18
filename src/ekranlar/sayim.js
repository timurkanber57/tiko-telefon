import { h, bildir } from '../ui.js';
import { sayimKaydiOlustur, sayimCsv, sayimExcelSatirlari } from '../cekirdek.js';
import { xlsxYaz } from '../xlsx.js';
import { taramaBileseni } from './tarama.js';
import { bip } from '../barkod.js';

function indir(ad, veri, tip) {
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([veri], { type: tip })); a.download = ad; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
export const excelIndir = (k) => indir(`sayim-${k.sirket}-${k.olusturuldu.slice(0, 10)}-${k.ad.replace(/[^\w-]+/g, '_')}.xlsx`, xlsxYaz(sayimExcelSatirlari(k)), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
export const csvIndir = (k) => indir(`sayim-${k.sirket}-${k.olusturuldu.slice(0, 10)}.csv`, '﻿' + sayimCsv(k), 'text/csv;charset=utf-8');

// Önce Excel iner (program hatasına karşı yedek), sonra sisteme aktarım denenir.
export async function excelVeAktar(ctx, k) {
  excelIndir(k);
  const r = await ctx.kaynak.senkronla();
  if (ctx.kaynak.ad === 'yerel') bildir('Excel indirildi ✔ — bulut bağlı değil, TİKO’da "📱 Telefon sayımı yükle" ile içeri al', false);
  else bildir(r.mesaj, r.hatalar && r.hatalar.length > 0);
  return r;
}

export function sayimEkrani(kok, ctx) {
  if (!ctx.sirket) { kok.replaceChildren(h('div', { class: 'uyari' }, 'Üstten şirket seç. Sayım şirkete özel.')); return; }
  let taslak = { ad: '', satirlar: [] }; let mod = localStorage.getItem('sayimMod') || 'say'; // say: her okutuşta +1 · adet: okut, adedi yaz
  const liste = h('div'); const son = h('div'); const adetKutu = h('div'); let t;
  const kaydetTaslak = () => ctx.kaynak.taslakYaz(ctx.sirket, taslak);

  const ciz = () => {
    const top = taslak.satirlar.reduce((a, s) => a + s.sayilan, 0);
    liste.replaceChildren(h('div', { class: 'satir' }, h('div', { class: 'kucuk' }, `${taslak.satirlar.length} çeşit · ${Math.round(top * 1000) / 1000} adet · telefona kayıtlı ✔`),
      taslak.satirlar.length ? h('button', { class: 'b ikinci dar', onclick: async () => { if (confirm('Bu sayım listesi tamamen silinsin mi?')) { taslak = { ad: '', satirlar: [] }; await kaydetTaslak(); ciz(); } } }, '🗑 Listeyi sil') : null),
      ...taslak.satirlar.map((s, i) => h('div', { class: 'kart satir' },
        h('div', {}, h('div', { class: 'ad' }, s.ad || '(katalogda yok)'), h('div', { class: 'kucuk' }, s.barkod + (s.satis != null ? ' · ₺' + s.satis : ''))),
        h('input', { type: 'number', inputmode: 'decimal', value: s.sayilan, step: 'any', style: 'max-width:90px', onchange: async (e) => { s.sayilan = Number(e.target.value) || 0; await kaydetTaslak(); ciz(); } }),
        h('button', { class: 'b kirmizi dar', onclick: async () => { taslak.satirlar.splice(i, 1); await kaydetTaslak(); ciz(); } }, '✕'))));
  };

  const satirEkle = async (u, barkod, adet) => {
    let s = taslak.satirlar.find((x) => x.barkod === barkod);
    if (s) { s.sayilan = Math.round((s.sayilan + adet) * 1000) / 1000; taslak.satirlar = [s, ...taslak.satirlar.filter((x) => x !== s)]; }
    else taslak.satirlar.unshift({ barkod, ad: u ? u.ad : '', urunId: u ? u.id : null, sayilan: adet, alis: u ? u.alis : null, satis: u ? u.fiyat : null });
    await kaydetTaslak(); ciz();
  };

  const okundu = async (barkod) => {
    const u = await ctx.kaynak.urunBul(barkod);
    if (!u) bildir('Katalogda yok, yine de eklendi: ' + barkod, true);
    if (mod === 'say') { await satirEkle(u, barkod, 1); bildir((u ? u.ad : barkod) + ' → ' + taslak.satirlar.find((x) => x.barkod === barkod).sayilan); return; }
    // adet modu: ürünü göster, adedi yazdır
    const gir = h('input', { type: 'number', inputmode: 'decimal', step: 'any', placeholder: 'Adet' });
    const tamam = async () => { const n = Number(gir.value); if (!n) return; await satirEkle(u, barkod, n); adetKutu.replaceChildren(); bip(true); t.odak(); };
    gir.addEventListener('keydown', (e) => { if (e.key === 'Enter') tamam(); });
    adetKutu.replaceChildren(h('div', { class: 'kart' }, h('div', { class: 'ad' }, u ? u.ad : '(katalogda yok)'), h('div', { class: 'kucuk' }, barkod), h('div', { class: 'satir' }, gir, h('button', { class: 'b yesil dar', onclick: tamam }, 'EKLE'), h('button', { class: 'b ikinci dar', onclick: () => adetKutu.replaceChildren() }, '✕'))));
    gir.focus();
  };
  t = taramaBileseni(okundu, { yer: 'Barkod okut / yaz', otoKamera: true });

  const modDugme = h('div', { class: 'satir' });
  const modCiz = () => modDugme.replaceChildren(
    h('button', { class: 'b ' + (mod === 'say' ? '' : 'ikinci'), onclick: () => { mod = 'say'; localStorage.setItem('sayimMod', mod); adetKutu.replaceChildren(); modCiz(); } }, 'Say (+1)'),
    h('button', { class: 'b ' + (mod === 'adet' ? '' : 'ikinci'), onclick: () => { mod = 'adet'; localStorage.setItem('sayimMod', mod); modCiz(); } }, 'Adet yaz'));

  const bitir = async () => {
    if (!taslak.satirlar.length) return bildir('Liste boş', true);
    const ad = prompt('Sayım adı (ör. Raf 3 - Kalemler)', taslak.ad || 'Sayım ' + new Date().toLocaleDateString('tr-TR')); if (ad === null) return;
    const k = sayimKaydiOlustur({ cihazId: await ctx.kaynak.cihazId(), sirket: ctx.sirket, ad, satirlar: taslak.satirlar });
    await ctx.kaynak.kaydet(k); taslak = { ad: '', satirlar: [] }; await kaydetTaslak(); ciz(); bildir('Sayım kaydedildi ✔'); gecmis();
  };
  const gecmis = async () => {
    const kayitlar = (await ctx.kaynak.kayitlar('sayim')).filter((k) => k.sirket === ctx.sirket);
    son.replaceChildren(h('h3', {}, 'Kayıtlı sayımlar'), ...kayitlar.map((k) => h('div', { class: 'kart' },
      h('div', { class: 'ad' }, k.ad), h('div', { class: 'kucuk' }, `${k.satirlar.length} çeşit · ${new Date(k.olusturuldu).toLocaleString('tr-TR')} · ${k.durum}`),
      h('button', { class: 'b yesil', style: 'width:100%;margin:6px 0', onclick: async () => { await excelVeAktar(ctx, k); gecmis(); } }, '⬇ Excel indir + sisteme aktar'),
      h('div', { class: 'satir' }, h('button', { class: 'b ikinci', onclick: () => excelIndir(k) }, 'Sadece Excel'), h('button', { class: 'b ikinci', onclick: () => csvIndir(k) }, 'CSV'),
        h('button', { class: 'b ikinci dar', onclick: async () => { taslak = { ad: k.ad, satirlar: k.satirlar.map((s) => ({ ...s })) }; await kaydetTaslak(); await ctx.kaynak.kayitSil(k.id); ciz(); gecmis(); bildir('Sayım düzenlemeye geri açıldı'); } }, '✏️'),
        h('button', { class: 'b kirmizi dar', onclick: async () => { if (confirm('Bu sayım kaydı silinsin mi?')) { await ctx.kaynak.kayitSil(k.id); gecmis(); } } }, '🗑')))));
  };
  kok.replaceChildren(t, modDugme, adetKutu, liste, h('button', { class: 'b yesil', style: 'width:100%', onclick: bitir }, 'SAYIMI KAYDET'), son);
  modCiz(); ctx.kaynak.taslakAl(ctx.sirket).then((x) => { taslak = x; ciz(); }); gecmis();
  return () => t.kapat();
}
