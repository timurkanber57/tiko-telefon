// Yerel deneme sunucusu: node tools/sunucu.js → http://localhost:8080 (kamera için telefonda HTTPS gerekir: docs/KURULUM.md)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const kok = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const tip = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png' };
http.createServer((q, s) => {
  let p = decodeURIComponent(q.url.split('?')[0]); if (p.endsWith('/')) p += 'index.html';
  const f = path.normalize(path.join(kok, p)); if (!f.startsWith(kok) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { s.writeHead(404); return s.end('yok'); }
  s.writeHead(200, { 'Content-Type': tip[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s);
}).listen(8080, () => console.log('http://localhost:8080'));
