// Ortak barkod giriş bileşeni: kamera + elle/el terminali. onBarkod(kod) çağrılır.
import { h } from '../ui.js';
import { kameraDestegi, kameraBaslat, bip } from '../barkod.js';
import { barkodNormalize } from '../cekirdek.js';

export function taramaBileseni(onBarkod, { yer = 'Barkod okut / yaz', otoOdak = true, otoKamera = false } = {}) {
  const giris = h('input', { type: 'text', inputmode: 'numeric', placeholder: yer, autocomplete: 'off', enterkeyhint: 'search' });
  const gonder = () => { const k = barkodNormalize(giris.value); if (k) { onBarkod(k); giris.value = ''; giris.focus(); } };
  giris.addEventListener('keydown', (e) => { if (e.key === 'Enter') gonder(); });
  const video = h('video', { playsinline: true, muted: true, hidden: true });
  let durdur = null;
  const ac = async (sessiz) => {
    try { video.hidden = false; durdur = await kameraBaslat(video, (k) => { bip(true); onBarkod(k); }); kamBtn.textContent = '✖'; localStorage.setItem('kamera', '1'); }
    catch (e) { video.hidden = true; if (!sessiz) alert('Kamera açılamadı: ' + e.message); }
  };
  const kamBtn = h('button', { class: 'b dar', onclick: async () => {
    if (durdur) { durdur(); durdur = null; video.hidden = true; kamBtn.textContent = '📷'; localStorage.setItem('kamera', '0'); return; }
    await ac(false);
  } }, '📷');
  // Kamera daha önce açıldıysa ekran açılınca kendiliğinden başlar (izin bir kez verildikten sonra)
  if (otoKamera && kameraDestegi() && localStorage.getItem('kamera') === '1') setTimeout(() => ac(true), 100);
  const kok = h('div', {}, h('div', { class: 'satir' }, giris, kameraDestegi() ? kamBtn : null, h('button', { class: 'b dar', onclick: gonder }, 'Ara')), video,
    kameraDestegi() ? null : h('div', { class: 'kucuk' }, 'Bu tarayıcıda kamera okuma yok; barkodu yazın veya el terminali kullanın. (Android Chrome önerilir)'));
  if (otoOdak) setTimeout(() => giris.focus(), 50);
  kok.kapat = () => { if (durdur) { durdur(); durdur = null; } };
  kok.odak = () => giris.focus();
  return kok;
}
