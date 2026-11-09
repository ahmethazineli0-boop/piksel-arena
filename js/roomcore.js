/* PİKSEL ARENA — oda ve maç mantığı.
   Hem bilgisayardaki sunucuda (server.js) hem telefonda çevrimdışı modda (local.js) çalışır. */
(function (root) {
'use strict';
function createCore(GD, Sim) {
const { Game, botInput } = Sim;
// ------------------------------------------------------------------ doğrulama
const HEX = /^#[0-9a-fA-F]{6}$/;
const ACC = new Set(GD.ACCESSORIES.map(a => a.id));
const clean = (s, n) => String(s || '').replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, n);
function cleanCustom(c, charId) {
  const ch = GD.getChar(charId);
  c = c || {};
  return {
    primary: HEX.test(c.primary) ? c.primary : ch.defaults.primary,
    secondary: HEX.test(c.secondary) ? c.secondary : ch.defaults.secondary,
    aura: HEX.test(c.aura) ? c.aura : ch.look.glow,
    acc: ACC.has(c.acc) ? c.acc : 'none',
    title: clean(c.title, 18)
  };
}
const validChar = id => GD.CHARACTERS.some(c => c.id === id) ? id : 'kaan';
const MODE_IDS = GD.MODES.map(m => m.id);

// ------------------------------------------------------------------ odalar
const rooms = new Map();
let nextId = 1;
const BOT_NAMES = ['Robo Rıza', 'Tost Makinesi', 'Pikselbaz', 'Çaycı Bot', 'Lag Canavarı', 'Simit Bot', 'Dolmuş 3000'];

function makeCode() {
  const A = 'ABCDEFGHJKLMNPRSTUVYZ';
  let c;
  do { c = Array.from({ length: 4 }, () => A[Math.floor(Math.random() * A.length)]).join(''); } while (rooms.has(c));
  return c;
}

class Room {
  constructor(code) {
    this.code = code; this.clients = []; this.slots = [null, null, null]; this.host = null;
    this.settings = { mode: 'duel', wins: 2, time: 99, stage: 'istanbul', hp: 1, chapter: 1 };
    this.phase = 'lobby'; this.countdown = 0; this.game = null; this.history = [];
    this.botMem = {}; this.owners = []; this.wonMax = 0; this.chapterNow = 1;
  }
  broadcast(obj) { const s = JSON.stringify(obj); for (const c of this.clients) c.conn.send(s); }
  sys(text) { this.chat(null, text); }
  chat(from, text) {
    const msg = { t: 'chat', from: from ? from.name : null, slot: from ? this.slots.indexOf(from) : -1, text, ts: Date.now() };
    this.history.push(msg); if (this.history.length > 40) this.history.shift();
    this.broadcast(msg);
  }
  activeIdx() { return this.settings.mode === 'duel' ? [0, 1] : [0, 1, 2]; }
  maxChapter() {
    let m = this.wonMax + 1;
    for (const s of this.slots) if (s && !s.bot) m = Math.max(m, s.unlocked || 1);
    return Math.min(m, 999);
  }
  info() {
    const pub = p => p && { id: p.id, name: p.name, char: p.char, custom: p.custom, ready: !!p.ready, bot: !!p.bot, equip: p.bot ? null : (p.equip || null) };
    return {
      t: 'room', code: this.code, host: this.host, phase: this.phase, settings: this.settings,
      slots: this.slots.map(pub), countdown: Math.ceil(this.countdown / 60), maxChapter: this.maxChapter(),
      spectators: this.clients.filter(c => !this.slots.includes(c)).map(c => c.name)
    };
  }
  sync() { this.broadcast(this.info()); }

  // düelloda üçüncü koltuk yedektir: öndeki koltuk boşalırsa yedek öne geçer
  compact() {
    if (this.settings.mode !== 'duel') return;
    for (const i of [0, 1]) if (!this.slots[i] && this.slots[2]) { this.slots[i] = this.slots[2]; this.slots[2] = null; }
  }
  seatSpectators() {
    for (let i = 0; i < 3; i++) {
      if (this.slots[i]) continue;
      const spec = this.clients.find(x => !this.slots.includes(x));
      if (!spec) break;
      this.slots[i] = spec; spec.ready = false;
    }
    this.compact();
  }
  resetCountdown() { if (this.phase === 'countdown') { this.phase = 'lobby'; this.countdown = 0; } }

  join(c) {
    this.clients.push(c); c.room = this;
    if (!this.host) this.host = c.id;
    if (this.phase === 'lobby' || this.phase === 'countdown') {
      let idx = this.slots.findIndex(s => !s);
      if (idx < 0) idx = this.slots.findIndex(s => s && s.bot);
      if (idx >= 0) { this.slots[idx] = c; c.ready = false; this.resetCountdown(); }
      this.compact();
    }
    c.conn.send({ t: 'welcome', id: c.id, code: this.code, history: this.history });
    const seat = this.slots.indexOf(c);
    this.sys(`${c.name} odaya katıldı${seat < 0 ? ' (izleyici)' : (seat === 2 && this.settings.mode === 'duel' ? ' (yedek)' : '')}.`);
    this.sync();
  }
  leave(c) {
    this.clients = this.clients.filter(x => x !== c);
    const idx = this.slots.indexOf(c);
    if (idx >= 0) this.slots[idx] = null;
    if (this.host === c.id) this.host = this.clients[0] ? this.clients[0].id : null;
    if (!this.clients.length) { rooms.delete(this.code); return; }
    if (this.phase === 'fight' && this.game) {
      const fi = this.owners.indexOf(c);
      if (fi >= 0) {
        if (this.settings.mode === 'duel') this.endMatch(1 - fi, true);
        else {
          // ayrılan oyuncunun yerine bot devam etsin
          this.owners[fi] = { id: -100 - fi, bot: true, name: c.name };
          if (!this.owners.some(o => o && !o.bot)) this.endMatch(-1, true);
        }
      }
    }
    if (this.phase !== 'fight') this.seatSpectators();
    this.resetCountdown();
    this.sys(`${c.name} ayrıldı.`);
    this.sync();
  }
  checkStart() {
    const act = this.activeIdx().map(i => this.slots[i]);
    const filled = act.filter(Boolean);
    const humans = filled.filter(p => !p.bot);
    const allReady = filled.every(p => p.ready);
    const ok = humans.length >= 1 && allReady && (this.settings.mode === 'story' ? filled.length >= 1 : filled.length === act.length);
    if (this.phase === 'lobby' && ok) { this.phase = 'countdown'; this.countdown = 180; this.sync(); }
    else if (this.phase === 'countdown' && !ok) { this.resetCountdown(); this.sync(); }
  }
  startMatch() {
    const story = this.settings.mode === 'story';
    const seats = this.activeIdx().map(i => this.slots[i]).filter(Boolean);
    const cfgs = seats.map((p, i) => ({ char: p.char, team: story ? 0 : i, equip: story && !p.bot ? p.equip : (story ? botEquip(this.settings.chapter) : undefined) }));
    const gs = Object.assign({}, this.settings);
    const players = seats.map((p, i) => ({ id: p.id, name: p.name, char: p.char, custom: p.custom, bot: !!p.bot, slot: this.slots.indexOf(p), team: cfgs[i].team }));
    let info = null;
    if (story) {
      const ch = Math.min(this.settings.chapter, this.maxChapter());
      info = GD.chapterInfo(ch);
      this.chapterNow = ch;
      gs.stage = info.stage; gs.chapter = ch;
      const boss = GD.getBoss(info.boss);
      cfgs.push({ char: info.boss, team: 1, chapter: ch });
      players.push({ id: -999, name: boss.name, char: boss.id, custom: boss.custom, boss: true, level: ch, team: 1, slot: -1 });
    }
    this.game = new Game(cfgs, gs);
    this.owners = seats.slice();
    if (story) this.owners.push(null);
    this.phase = 'fight'; this.botMem = {};
    for (const s of seats) if (!s.bot) { s.held = 0; s.pressed = 0; }
    this.broadcast({ t: 'start', settings: gs, players, story: info });
    this.sync();
  }
  endMatch(winner, forfeit) {
    if (!this.game) return;
    const g = this.game;
    const res = g.results();
    const msg = {
      t: 'end', winner, forfeit: !!forfeit, wins: g.wins, stats: res, mode: this.settings.mode,
      fighters: this.owners.map((o, i) => o ? { id: o.id, name: o.name, bot: !!o.bot } : { boss: true, name: g.f[i].char.name })
    };
    if (this.settings.mode === 'story') {
      const info = GD.chapterInfo(this.chapterNow);
      const win = winner === 0 && !forfeit;
      msg.story = { win, chapter: this.chapterNow, gold: forfeit ? 0 : (win ? info.reward : Math.round(info.reward * 0.3)), outro: win ? info.outro : null, title: info.title };
      if (win) { this.wonMax = Math.max(this.wonMax, this.chapterNow); this.settings.chapter = this.chapterNow + 1; }
    }
    this.broadcast(msg);
    this.game = null; this.owners = [];
    this.phase = 'lobby';
    for (const s of this.slots) if (s && !s.bot) s.ready = false;
    this.seatSpectators();
    this.sync();
  }
  tick() {
    if (this.phase === 'countdown') {
      if (this.countdown % 60 === 0) this.sync();
      if (--this.countdown <= 0) this.startMatch();
      return;
    }
    if (this.phase !== 'fight' || !this.game) return;
    const g = this.game;
    const inputs = this.owners.map((p, i) => {
      if (!p) return null;
      if (p.bot) return botInput(g, i, this.botMem[i] || (this.botMem[i] = {}));
      const inp = { held: p.held | 0, pressed: p.pressed | 0 };
      p.pressed = 0;
      return inp;
    });
    g.step(inputs);
    this.broadcast({ t: 'st', s: g.snapshot() });
    if (g.phase === 'over') this.endMatch(g.winner, false);
  }
}

// bot takım arkadaşları bölüme göre ekipman alır
function botEquip(ch) {
  const l = Math.min(5, Math.floor((ch - 1) * 0.8));
  return GD.cleanEquip({ glove: l, armor: l, heart: l, boots: l, crystal: l, ring: l, feather: 0 });
}

// ------------------------------------------------------------------ istemciler
function onClient(conn) {
  const c = { id: nextId++, conn, name: 'Oyuncu', char: 'kaan', custom: cleanCustom({}, 'kaan'), ready: false, held: 0, pressed: 0, room: null, chatTimes: [], equip: GD.cleanEquip({}), unlocked: 1 };
  conn.onmessage = raw => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    if (!m || typeof m.t !== 'string') return;
    handle(c, m);
  };
  conn.onclose = () => { if (c.room) c.room.leave(c); };
}
function applyProfile(c, m) {
  c.char = validChar(m.char);
  c.custom = cleanCustom(m.custom, c.char);
  if (m.equip) c.equip = GD.cleanEquip(m.equip);
  if (m.unlocked != null) c.unlocked = Math.max(1, Math.min(999, m.unlocked | 0));
}

function handle(c, m) {
  const room = c.room;
  const lobby = room && room.phase !== 'fight';
  switch (m.t) {
    case 'ping': c.conn.send({ t: 'pong', ts: m.ts }); break;
    case 'hello': {
      if (room) return;
      c.name = clean(m.name, 14) || 'Oyuncu' + c.id;
      applyProfile(c, m);
      let code = clean(m.room, 6).toUpperCase().replace(/[^A-Z0-9]/g, '');
      let r = code && rooms.get(code);
      if (!r) {
        if (rooms.size > 300) return c.conn.send({ t: 'error', text: 'Sunucu dolu.' });
        code = code || makeCode();
        r = new Room(code); rooms.set(code, r);
      }
      if (r.clients.length >= 10) return c.conn.send({ t: 'error', text: 'Oda dolu.' });
      r.join(c);
      break;
    }
    case 'select': {
      if (!lobby) return;
      applyProfile(c, m);
      room.sync();
      break;
    }
    case 'ready': {
      if (!lobby || !room.activeIdx().some(i => room.slots[i] === c)) return;
      c.ready = !!m.v;
      room.sync(); room.checkStart();
      break;
    }
    case 'settings': {
      if (!lobby || room.host !== c.id) return;
      const s = room.settings;
      if (MODE_IDS.includes(m.mode) && m.mode !== s.mode) {
        s.mode = m.mode;
        for (const x of room.slots) if (x && !x.bot) x.ready = false;
        room.compact(); room.resetCountdown();
        room.sys('Mod değişti: ' + GD.MODES.find(x => x.id === m.mode).name);
      }
      if ([1, 2, 3].includes(m.wins)) s.wins = m.wins;
      if ([45, 60, 99, 0].includes(m.time)) s.time = m.time;
      if (GD.STAGES.some(x => x.id === m.stage)) s.stage = m.stage;
      if ([0.5, 0.75, 1, 1.5, 2].includes(m.hp)) s.hp = m.hp;
      if (m.chapter != null) s.chapter = Math.max(1, Math.min(room.maxChapter(), m.chapter | 0));
      room.sync(); room.checkStart();
      break;
    }
    case 'bot': {
      if (!lobby || room.host !== c.id) return;
      if (m.on) {
        const idx = room.activeIdx().find(i => !room.slots[i]);
        if (idx == null) return;
        const ch = GD.CHARACTERS[Math.floor(Math.random() * GD.CHARACTERS.length)];
        const used = room.slots.filter(x => x && x.bot).map(x => x.name);
        const name = BOT_NAMES.find(n => !used.includes(n)) || 'Bot';
        room.slots[idx] = { id: -idx - 1, bot: true, name, char: ch.id, custom: cleanCustom({}, ch.id), ready: true };
        room.sys(`${name} (bot) arenaya girdi.`);
      } else {
        const idx = m.slot | 0;
        if (room.slots[idx] && room.slots[idx].bot) { room.slots[idx] = null; room.seatSpectators(); room.resetCountdown(); }
      }
      room.sync(); room.checkStart();
      break;
    }
    case 'botchar': {
      if (!lobby || room.host !== c.id) return;
      const bot = room.slots[m.slot | 0];
      if (bot && bot.bot) { bot.char = validChar(m.char); bot.custom = cleanCustom({}, bot.char); room.sync(); }
      break;
    }
    case 'input': {
      if (!room || room.phase !== 'fight') return;
      c.held = (m.h | 0) & 1023;
      c.pressed |= (m.p | 0) & 1023;
      break;
    }
    case 'chat': {
      if (!room) return;
      const now = Date.now();
      c.chatTimes = c.chatTimes.filter(t => now - t < 5000);
      if (c.chatTimes.length >= 6) return c.conn.send({ t: 'chat', from: null, slot: -1, text: 'Çok hızlı yazıyorsun, biraz yavaş!', ts: now });
      const text = clean(m.text, 160);
      if (!text) return;
      c.chatTimes.push(now);
      room.chat(c, text);
      break;
    }
    case 'taunt': {
      if (!room) return;
      const i = m.i | 0;
      if (i < 0 || i >= GD.TAUNTS.length) return;
      if (c.lastTaunt && Date.now() - c.lastTaunt < 1200) return;
      c.lastTaunt = Date.now();
      room.broadcast({ t: 'taunt', fi: room.phase === 'fight' ? room.owners.indexOf(c) : -1, slot: room.slots.indexOf(c), i, name: c.name });
      break;
    }
    case 'leave': if (room) { room.leave(c); c.room = null; c.ready = false; } break;
  }
}


function tickAll() {
  for (const r of rooms.values()) { try { r.tick(); } catch (e) { console.error('Oda hatası', r.code, e); r.game = null; r.phase = 'lobby'; r.sync(); } }
}
return { onClient, tickAll, rooms };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { createCore };
else root.RoomCore = { createCore };
})(typeof window !== 'undefined' ? window : globalThis);
