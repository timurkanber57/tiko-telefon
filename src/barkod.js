// Kamera ile barkod okuma. Destek yoksa (iOS Safari vb.) elle giriş / USB-Bluetooth el terminali (klavye gibi yazar) çalışır.
export const kameraDestegi = () => typeof globalThis.BarcodeDetector === 'function' && !!navigator.mediaDevices?.getUserMedia;

export function bip(tamam = true) {
  try { const a = new (globalThis.AudioContext || globalThis.webkitAudioContext)(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = tamam ? 1100 : 300; g.gain.value = 0.15; o.start(); o.stop(a.currentTime + (tamam ? 0.08 : 0.25)); setTimeout(() => a.close(), 400); } catch {}
}

export async function kameraBaslat(videoEl, onBarkod, bekleme = 1800) {
  const det = new BarcodeDetector({ formats: ['ean_13', 'ean_8', 'upc_a', 'code_128', 'code_39', 'qr_code'] });
  const akim = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
  videoEl.srcObject = akim; await videoEl.play();
  let dur = false; let son = ''; let sonZaman = 0;
  const dongu = async () => {
    if (dur) return;
    try {
      const r = await det.detect(videoEl);
      if (r.length) { const k = r[0].rawValue; const t = Date.now(); if (k !== son || t - sonZaman > bekleme) { son = k; sonZaman = t; navigator.vibrate?.(40); onBarkod(k); } }
    } catch (e) { /* kare okunamadı */ }
    setTimeout(dongu, 120);
  };
  dongu();
  return () => { dur = true; akim.getTracks().forEach((t) => t.stop()); videoEl.srcObject = null; };
}
