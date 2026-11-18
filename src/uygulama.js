import { h } from './ui.js';
import { SIRKETLER } from './cekirdek.js';
import { idbDepo } from './veri/depo.js';
import { kaynakOlustur } from './veri/index.js';
import { fiyatEkrani } from './ekranlar/fiyat.js';
import { satisEkrani } from './ekranlar/satis.js';
import { sayimEkrani } from './ekranlar/sayim.js';
import { ayarEkrani } from './ekranlar/ayar.js';

const EKRANLAR = { fiyat: fiyatEkrani, satis: satisEkrani, sayim: sayimEkrani, ayar: ayarEkrani };
const kok = document.getElementById('kok');
const ctx = { kaynak: null, sirket: localStorage.getItem('sirket') || '', get sirketAd() { return SIRKETLER[this.sirket]?.ad || ''; } };
let kapat = null; let aktif = localStorage.getItem('ekran') || 'fiyat';

function git(e) {
  aktif = e; localStorage.setItem('ekran', e);
  if (kapat) { try { kapat(); } catch {} kapat = null; }
  document.querySelectorAll('#alt button').forEach((b) => b.classList.toggle('sec', b.dataset.e === e));
  kapat = EKRANLAR[e](kok, ctx) || null;
}
function sirketCiz() {
  const k = document.getElementById('sirketler');
  k.replaceChildren(...Object.values(SIRKETLER).map((s) => h('button', { class: 'chip' + (ctx.sirket === s.kod ? ' sec' : ''), onclick: () => { ctx.sirket = ctx.sirket === s.kod ? '' : s.kod; localStorage.setItem('sirket', ctx.sirket); sirketCiz(); git(aktif); } }, s.kod === 'eraslan' ? 'Eraslan' : 'Kitapkafası')));
}
document.querySelectorAll('#alt button').forEach((b) => b.addEventListener('click', () => git(b.dataset.e)));
(async () => { ctx.kaynak = await kaynakOlustur(idbDepo()); sirketCiz(); git(aktif); })();
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
