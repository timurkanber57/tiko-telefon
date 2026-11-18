// Çevrimdışı çalışma: uygulama kabuğu önbelleğe alınır. Sürüm artınca eski önbellek silinir.
const S = 'tiko-telefon-v4';
const DOSYALAR = ['./', 'index.html', 'style.css', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'src/uygulama.js', 'src/ui.js', 'src/cekirdek.js', 'src/barkod.js', 'src/ean-okuyucu.js', 'src/veri/depo.js', 'src/veri/yerel.js', 'src/veri/bulut.js', 'src/veri/index.js', 'src/ekranlar/tarama.js', 'src/ekranlar/fiyat.js', 'src/ekranlar/satis.js', 'src/ekranlar/sayim.js', 'src/ekranlar/ayar.js', 'src/xlsx.js'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(S).then((c) => c.addAll(DOSYALAR)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((k) => Promise.all(k.filter((x) => x !== S).map((x) => caches.delete(x)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return; // bulut istekleri önbelleğe girmez
  e.respondWith(fetch(e.request).then((r) => { const k = r.clone(); caches.open(S).then((c) => c.put(e.request, k)); return r; }).catch(() => caches.match(e.request)));
});
