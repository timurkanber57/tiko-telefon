// Depolama soyutlaması: tarayıcıda IndexedDB, testte bellek. Aynı arayüz: al/koy/sil/hepsi/temizle
export function bellekDepo() {
  const t = {};
  const s = (a) => (t[a] ||= new Map());
  return {
    async al(a, k) { return s(a).get(k); },
    async koy(a, k, v) { s(a).set(k, v); },
    async sil(a, k) { s(a).delete(k); },
    async hepsi(a) { return [...s(a).values()]; },
    async temizle(a) { s(a).clear(); },
  };
}

export function idbDepo(ad = 'tiko-telefon') {
  const ACIK = new Promise((coz, red) => {
    const r = indexedDB.open(ad, 1);
    r.onupgradeneeded = () => { for (const a of ['urun', 'barkod', 'kayit', 'ayar']) r.result.createObjectStore(a); };
    r.onsuccess = () => coz(r.result); r.onerror = () => red(r.error);
  });
  const islem = async (a, mod, f) => {
    const db = await ACIK;
    return new Promise((coz, red) => {
      const tx = db.transaction(a, mod); const o = tx.objectStore(a);
      let sonuc; const r = f(o); if (r) r.onsuccess = () => { sonuc = r.result; };
      tx.oncomplete = () => coz(sonuc); tx.onerror = () => red(tx.error);
    });
  };
  return {
    al: (a, k) => islem(a, 'readonly', (o) => o.get(k)),
    koy: (a, k, v) => islem(a, 'readwrite', (o) => o.put(v, k)),
    sil: (a, k) => islem(a, 'readwrite', (o) => o.delete(k)),
    hepsi: (a) => islem(a, 'readonly', (o) => o.getAll()),
    temizle: (a) => islem(a, 'readwrite', (o) => o.clear()),
  };
}
