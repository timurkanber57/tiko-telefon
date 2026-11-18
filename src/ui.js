export function h(etiket, ozn = {}, ...cocuklar) {
  const e = document.createElement(etiket);
  for (const [k, v] of Object.entries(ozn)) {
    if (k === 'class') e.className = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (v !== false && v != null) e.setAttribute(k, v === true ? '' : v);
  }
  for (const c of cocuklar.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(String(c)));
  return e;
}
export function bildir(metin, hata = false) {
  const b = document.getElementById('bildirim'); b.textContent = metin; b.className = hata ? 'hata' : ''; b.hidden = false;
  clearTimeout(bildir._t); bildir._t = setTimeout(() => { b.hidden = true; }, 2500);
}
