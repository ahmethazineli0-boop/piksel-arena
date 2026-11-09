/* PİKSEL ARENA — çevrimdışı modun "sunucusu".
   Ayrı bir iş parçacığında çalışır; 3D çizim ne kadar ağır olursa olsun
   maç 60 kare/sn hızında akar. */
importScripts('characters.js', 'sim.js', 'roomcore.js');

const STEP = 1000 / 60;
const core = self.RoomCore.createCore(self.GameData, self.Sim);
const conns = new Map();

self.onmessage = e => {
  const m = e.data;
  if (m.k === 'open') {
    const conn = {
      onmessage: null, onclose: null,
      send(obj) { self.postMessage({ k: 'msg', id: m.id, data: typeof obj === 'string' ? obj : JSON.stringify(obj) }); }
    };
    conns.set(m.id, conn);
    core.onClient(conn);
    self.postMessage({ k: 'open', id: m.id });
  } else if (m.k === 'send') {
    const c = conns.get(m.id);
    if (c && c.onmessage) c.onmessage(m.data);
  } else if (m.k === 'close') {
    const c = conns.get(m.id);
    conns.delete(m.id);
    if (c && c.onclose) c.onclose();
  }
};

let last = performance.now(), acc = 0;
setInterval(() => {
  const now = performance.now();
  acc += now - last; last = now;
  let n = 0;
  while (acc >= STEP && n < 6) { core.tickAll(); acc -= STEP; n++; }
  if (n >= 6) acc = 0;
}, 4);
