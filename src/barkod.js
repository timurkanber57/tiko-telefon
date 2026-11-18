// Kamera ile barkod okuma. Destek yoksa (iOS Safari vb.) elle giriş / USB-Bluetooth el terminali (klavye gibi yazar) çalışır.
import { goruntuCoz } from './ean-okuyucu.js';

// iPhone Safari'de BarcodeDetector yok → kendi EAN çözücümüz (ean-okuyucu.js) devreye girer. İkisinde de getUserMedia (HTTPS) gerekir.
export const kameraDestegi = () => !!navigator.mediaDevices?.getUserMedia;
const yerlesikDestek = () => typeof globalThis.BarcodeDetector === 'function';

export function bip(tamam = true) {
  try { const a = new (globalThis.AudioContext || globalThis.webkitAudioContext)(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = tamam ? 1100 : 300; g.gain.value = 0.15; o.start(); o.stop(a.currentTime + (tamam ? 0.08 : 0.25)); setTimeout(() => a.close(), 400); } catch {}
}

export async function kameraBaslat(videoEl, onBarkod, bekleme = 1800) {
  const akim = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
  videoEl.muted = true; videoEl.setAttribute('playsinline', ''); videoEl.srcObject = akim; await videoEl.play();
  const det = yerlesikDestek() ? new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39', 'qr_code'] }) : null;
  const tuval = document.createElement('canvas'); const bag = tuval.getContext('2d', { willReadFrequently: true });
  let dur = false; let son = ''; let sonZaman = 0; let aday = ''; let adayZaman = 0;
  const bildir = (k) => { const t = Date.now(); if (k !== son || t - sonZaman > bekleme) { son = k; sonZaman = t; navigator.vibrate?.(40); onBarkod(k); } };
  const dongu = async () => {
    if (dur) return;
    try {
      if (det) { const r = await det.detect(videoEl); if (r.length) bildir(r[0].rawValue); }
      else if (videoEl.videoWidth) {
        const en = Math.min(960, videoEl.videoWidth); const boy = Math.round(videoEl.videoHeight * en / videoEl.videoWidth);
        tuval.width = en; tuval.height = boy; bag.drawImage(videoEl, 0, 0, en, boy);
        const px = bag.getImageData(0, 0, en, boy).data; const gri = new Uint8Array(en * boy);
        for (let i = 0, j = 0; i < gri.length; i++, j += 4) gri[i] = (px[j] * 77 + px[j + 1] * 150 + px[j + 2] * 29) >> 8;
        const r = goruntuCoz({ data: gri, width: en, height: boy });
        // Yanlış okumaya karşı: bir karede ≥3 satır aynı kodu bulmalı VEYA 1 sn içinde iki ayrı karede ≥2 satır
        const e = r[0];
        if (e) {
          const t = Date.now();
          if (e.oy >= 3 || (e.oy >= 2 && aday === e.kod && t - adayZaman < 1000)) bildir(e.kod);
          else if (e.oy >= 2) { aday = e.kod; adayZaman = t; }
        }
      }
    } catch (e) { /* kare okunamadı */ }
    setTimeout(dongu, det ? 120 : 90);
  };
  dongu();
  return () => { dur = true; akim.getTracks().forEach((t) => t.stop()); videoEl.srcObject = null; };
}
