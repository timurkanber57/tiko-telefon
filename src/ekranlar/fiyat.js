import { h } from '../ui.js';
import { para } from '../cekirdek.js';
import { taramaBileseni } from './tarama.js';

export function stokSatiri(ctx, u) {
  const s = ctx.kaynak.stokGoster(u, ctx.sirket);
  if (s === null) return h('div', { class: 'stok' }, '📦 Stok: ', h('span', { class: 'rozet' }, 'bulut bağlanınca görünür'));
  return h('div', { class: 'stok ' + (s > 0 ? 'var' : 'yok') }, `📦 Stok (${ctx.sirketAd}): ${s} ${u.birim}`);
}

export function fiyatEkrani(kok, ctx) {
  const sonuc = h('div');
  const goster = (liste) => {
    sonuc.replaceChildren(...(liste.length ? liste.map((u) => h('div', { class: 'kart' }, h('div', { class: 'ad' }, u.ad), h('div', { class: 'fiyat' }, '₺' + para(u.fiyat)), stokSatiri(ctx, u), h('div', { class: 'kucuk' }, u.barkodlar.join(' · ')))) : [h('div', { class: 'kart' }, 'Bulunamadı')]));
  };
  const sorgu = async (m) => {
    const bark = await ctx.kaynak.urunBul(m);
    goster(bark ? [bark] : await ctx.kaynak.urunAra(m));
  };
  const t = taramaBileseni(sorgu, { yer: 'Barkod veya ürün adı' });
  const ara = t.querySelector('input'); let z;
  ara.addEventListener('input', () => { clearTimeout(z); z = setTimeout(async () => { if (ara.value.trim().length >= 2) goster(await ctx.kaynak.urunAra(ara.value)); else sonuc.replaceChildren(); }, 250); });
  ara.inputMode = 'search';
  kok.replaceChildren(t, sonuc);
  return () => t.kapat();
}
