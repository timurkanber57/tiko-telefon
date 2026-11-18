# Telefona kurulum
Kamera ile barkod okuma ve "ana ekrana ekle" için sayfa **HTTPS** olmalı (localhost hariç).
1. **GitHub Pages** (en kolay): repo ayarlarından Pages aç; repo kökü yayınlanır (Settings → Pages → main / root). NOT: özel (private) repoda Pages ücretli plan ister → alternatif: Cloudflare Pages / Netlify (ücretsiz, GitHub'a bağlanır, klasör olarak `telefon-app` seçilir).
2. Telefonda Chrome ile adresi aç → ⋮ → **Ana ekrana ekle**. Bir kez açıldıktan sonra internetsiz de çalışır.
3. Ayar → katalog JSON'u seç. Üstten şirketi seç.
Android Chrome kamera barkodunu destekler. iPhone Safari'de kamera okuma yok → barkodu yazarak veya Bluetooth el terminaliyle kullan.
Yerelde deneme: `npm start` → http://localhost:8080
