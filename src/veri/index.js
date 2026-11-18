// Tek giriş noktası. Buluta geçiş = burada ayar okuyup BulutKaynak döndürmek; ekran kodu değişmez.
import { YerelKaynak } from './yerel.js';
import { BulutKaynak } from './bulut.js';
export async function kaynakOlustur(depo) {
  const yerel = new YerelKaynak(depo);
  const bulut = await yerel.ayarAl('bulut', null);
  if (bulut && bulut.url && bulut.anahtar) return new BulutKaynak(depo, bulut);
  return yerel;
}
