import { h, bildir } from '../ui.js';
import { csvIndir, excelIndir } from './sayim.js';

export function ayarEkrani(kok, ctx) {
  const bilgi = h('div', { class: 'kart' }); const bek = h('div', { class: 'kart' });
  const yenile = async () => {
    const b = await ctx.kaynak.katalogBilgi(); const bk = await ctx.kaynak.bekleyenler();
    bilgi.replaceChildren(h('div', { class: 'ad' }, 'Ürün kataloğu'), h('div', {}, `${b.adet} ürün`), h('div', { class: 'kucuk' }, b.tarih ? 'Katalog tarihi: ' + new Date(b.tarih).toLocaleString('tr-TR') : 'Henüz katalog yüklenmedi'),
      h('div', { class: 'kucuk' }, 'TİKO’da: Envanter → 📱 Telefon kataloğu. Çıkan dosyayı buraya seç.'),
      h('input', { type: 'file', accept: '.json,application/json', onchange: async (e) => { try { const f = e.target.files[0]; if (!f) return; const r = await ctx.kaynak.katalogYukle(await f.text()); bildir(r.adet + ' ürün yüklendi ✔'); yenile(); } catch (x) { bildir(x.message, true); } } }));
    bek.replaceChildren(h('div', { class: 'ad' }, 'Bekleyen kayıtlar: ' + bk.length), h('div', { class: 'kucuk' }, 'Kaynak: ' + ctx.kaynak.ad + (ctx.kaynak.ad === 'yerel' ? ' (bulut bağlı değil)' : '')),
      h('button', { class: 'b', onclick: async () => { const r = await ctx.kaynak.senkronla(); bildir(r.mesaj); yenile(); } }, 'Senkronla'),
      ...bk.filter((k) => k.tur === 'sayim').map((k) => h('button', { class: 'b ikinci', style: 'margin-top:6px', onclick: () => excelIndir(k) }, 'Excel: ' + k.ad)),
      h('div', { class: 'kucuk', style: 'margin-top:8px' }, 'Satışlar: ' + bk.filter((k) => k.tur === 'satis').length + ' adet bekliyor'));
  };
  kok.replaceChildren(bilgi, bek, h('div', { class: 'kart kucuk' }, 'TİKO Telefon v0.1 · Çevrimdışı çalışır · Bulut: docs/SENKRON.md'));
  yenile();
}
