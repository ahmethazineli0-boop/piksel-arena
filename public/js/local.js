/* PİKSEL ARENA — çevrimdışı mod.
   Sunucu olmadan (telefonda, ana ekrandan açılınca) oda ve maç mantığını
   telefonun içinde, ayrı bir iş parçacığında (localworker.js) çalıştırır.
   İstemciye gerçek bir WebSocket gibi görünür. */
(function () {
  'use strict';
  let worker = null, nextId = 1;
  const sockets = new Map();

  function getWorker() {
    if (worker) return worker;
    worker = new Worker('js/localworker.js');
    worker.onmessage = e => {
      const m = e.data, s = sockets.get(m.id);
      if (!s) return;
      if (m.k === 'open') { s.readyState = 1; if (s.onopen) s.onopen(); }
      else if (m.k === 'msg' && s.readyState === 1 && s.onmessage) s.onmessage({ data: m.data });
    };
    worker.onerror = e => console.error('Çevrimdışı mod hatası:', e.message);
    return worker;
  }

  class LocalSocket {
    constructor() {
      this.readyState = 0;
      this.onopen = this.onmessage = this.onclose = null;
      this.id = nextId++;
      sockets.set(this.id, this);
      getWorker().postMessage({ k: 'open', id: this.id });
    }
    send(str) { if (this.readyState === 1) worker.postMessage({ k: 'send', id: this.id, data: str }); }
    close() {
      if (this.readyState > 1) return;
      this.readyState = 3;
      sockets.delete(this.id);
      worker.postMessage({ k: 'close', id: this.id });
      setTimeout(() => { if (this.onclose) this.onclose(); }, 0);
    }
  }

  /** Bu sayfa Piksel Arena sunucusundan mı açıldı? (değilse çevrimdışı mod) */
  async function detectServer() {
    if (!/^https?:$/.test(location.protocol)) return false;
    try {
      const ctl = new AbortController();
      const t = setTimeout(() => ctl.abort(), 2500);
      const r = await fetch('__pa', { cache: 'no-store', signal: ctl.signal });
      clearTimeout(t);
      return r.ok && (await r.text()).trim() === 'ok';
    } catch { return false; }
  }

  window.Local = { LocalSocket, detectServer };
})();
