'use strict';
/* PİKSEL ARENA — sunucu. Kurulum gerektirmez: `node server.js` */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const GD = require('./public/js/characters.js');

const PORT = Number(process.env.PORT) || 3000;
const PUB = path.join(__dirname, 'public');
const STEP = 1000 / 60;
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.woff2': 'font/woff2'
};

// ------------------------------------------------------------------ statik dosyalar
const server = http.createServer((req, res) => {
  let u;
  try { u = decodeURIComponent((req.url || '/').split('?')[0]); } catch { res.writeHead(400); return res.end(); }
  if (u === '/__pa') { res.writeHead(200, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' }); return res.end('ok'); }
  if (u === '/') u = '/index.html';
  const fp = path.normalize(path.join(PUB, u));
  if (!fp.startsWith(PUB + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(fp, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }); return res.end('Bulunamadı'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(data);
  });
});

// ------------------------------------------------------------------ minimal WebSocket
class Conn {
  constructor(socket) {
    this.socket = socket; this.buf = Buffer.alloc(0); this.frags = []; this.open = true;
    this.onmessage = null; this.onclose = null;
    socket.setNoDelay(true);
    socket.on('data', d => this.data(d));
    socket.on('close', () => this.closed());
    socket.on('error', () => this.closed());
  }
  data(d) {
    this.buf = this.buf.length ? Buffer.concat([this.buf, d]) : d;
    while (this.buf.length >= 2) {
      const b0 = this.buf[0], b1 = this.buf[1];
      const fin = (b0 & 0x80) !== 0, op = b0 & 0x0f, masked = (b1 & 0x80) !== 0;
      let len = b1 & 0x7f, off = 2;
      if (len === 126) { if (this.buf.length < 4) return; len = this.buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (this.buf.length < 10) return; len = Number(this.buf.readBigUInt64BE(2)); off = 10; }
      if (len > 65536) return this.close();
      const need = off + (masked ? 4 : 0) + len;
      if (this.buf.length < need) return;
      let payload = Buffer.from(this.buf.subarray(off + (masked ? 4 : 0), need));
      if (masked) {
        const mask = this.buf.subarray(off, off + 4);
        for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i & 3];
      }
      this.buf = this.buf.subarray(need);
      if (op === 0x8) return this.close();
      if (op === 0x9) { this.frame(0xA, payload); continue; }
      if (op === 0xA) continue;
      if (op === 0x1 || op === 0x2 || op === 0x0) {
        this.frags.push(payload);
        if (fin) {
          const msg = Buffer.concat(this.frags).toString('utf8'); this.frags = [];
          if (this.onmessage) { try { this.onmessage(msg); } catch (e) { console.error('Mesaj hatası:', e.message); } }
        }
      }
    }
  }
  frame(op, payload) {
    if (!this.open) return;
    const len = payload.length;
    let header;
    if (len < 126) { header = Buffer.from([0x80 | op, len]); }
    else if (len < 65536) { header = Buffer.alloc(4); header[0] = 0x80 | op; header[1] = 126; header.writeUInt16BE(len, 2); }
    else { header = Buffer.alloc(10); header[0] = 0x80 | op; header[1] = 127; header.writeBigUInt64BE(BigInt(len), 2); }
    try { this.socket.write(Buffer.concat([header, payload])); } catch { this.closed(); }
  }
  send(obj) { this.frame(0x1, Buffer.from(typeof obj === 'string' ? obj : JSON.stringify(obj))); }
  close() { if (this.open) { this.frame(0x8, Buffer.alloc(0)); this.socket.end(); } this.closed(); }
  closed() { if (!this.open) return; this.open = false; try { this.socket.destroy(); } catch { } if (this.onclose) this.onclose(); }
}

server.on('upgrade', (req, socket) => {
  const key = req.headers['sec-websocket-key'];
  if (!key || String(req.headers.upgrade).toLowerCase() !== 'websocket') return socket.destroy();
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  socket.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  onClient(new Conn(socket));
});

// ------------------------------------------------------------------ odalar ve maçlar (ortak kod)
const core = require('./public/js/roomcore.js').createCore(GD, require('./sim.js'));
const onClient = c => core.onClient(c);

// ------------------------------------------------------------------ oyun döngüsü
let last = performance.now(), acc = 0;
setInterval(() => {
  const now = performance.now();
  acc += now - last; last = now;
  let n = 0;
  while (acc >= STEP && n < 6) {
    core.tickAll();
    acc -= STEP; n++;
  }
  if (n >= 6) acc = 0;
}, 4);

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.log(`\n  HATA: Port ${PORT} kullanımda! Eski bir sunucu penceresi açık kalmış olabilir.\n  O pencereyi kapatıp bu dosyayı tekrar çalıştır, yoksa ESKİ sürüm açılır.\n`);
  } else console.error('Sunucu hatası:', e.message);
});
server.listen(PORT, '0.0.0.0', () => {
  const ips = [];
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === 'IPv4' && !i.internal) ips.push(i.address);
  console.log('\n  ╔══════════════════════════════════════╗');
  console.log('  ║     PİKSEL ARENA SUNUCUSU  v3.2      ║');
  console.log('  ╚══════════════════════════════════════╝\n');
  console.log(`  Bu bilgisayardan:  http://localhost:${PORT}`);
  for (const ip of ips) console.log(`  Aynı ağdan (LAN):  http://${ip}:${PORT}`);
  console.log('\n  İnternet üzerinden oynamak için README.md dosyasına bak.');
  console.log('  Kapatmak için: Ctrl + C\n');
});
