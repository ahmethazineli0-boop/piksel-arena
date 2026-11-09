/* PİKSEL ARENA — sunucu tarafı dövüş simülasyonu (60 kare/sn, otoriter)
   Modlar: duel (1v1), ffa (3 kişi herkes herkese), story (oyuncular vs boss) */
(function (root) {
'use strict';
const GD = (typeof module !== 'undefined' && module.exports) ? require('./characters.js') : root.GameData;

const WORLD_W = 480, VIEW_W = 384, GROUND = 196, GRAV = 0.36;
const B = { L: 1, R: 2, U: 4, D: 8, LP: 16, HP: 32, K: 64, S1: 128, S2: 256, ULT: 512 };
const BUF_FRAMES = 8;

// box: [ileri ofset, y ofset (ayaktan yukarı negatif), genişlik, yükseklik]
const NORMALS = {
  lp:  { su: 4, ac: 3, rc: 8,  dmg: 30, box: [6, -44, 22, 9],  hs: 14, bs: 9,  kb: [1.6, 0], lvl: 'mid', chain: 1, meter: 5 },
  hp:  { su: 7, ac: 4, rc: 16, dmg: 70, box: [6, -46, 28, 11], hs: 21, bs: 14, kb: [3.0, 0], lvl: 'mid', chain: 2, meter: 9 },
  k:   { su: 8, ac: 4, rc: 16, dmg: 62, box: [4, -34, 32, 12], hs: 19, bs: 13, kb: [2.8, 0], lvl: 'mid', chain: 2, meter: 8, kick: true },
  clp: { su: 4, ac: 3, rc: 8,  dmg: 25, box: [6, -28, 22, 8],  hs: 13, bs: 8,  kb: [1.3, 0], lvl: 'low', chain: 1, meter: 4, crouch: true },
  chp: { su: 6, ac: 5, rc: 17, dmg: 65, box: [2, -62, 22, 40], hs: 20, bs: 12, kb: [1.4, -5], lvl: 'mid', chain: 2, meter: 8, crouch: true },
  ck:  { su: 8, ac: 4, rc: 20, dmg: 55, box: [4, -10, 36, 10], hs: 20, bs: 14, kb: [1.4, -2.6], lvl: 'low', chain: 2, meter: 8, knockdown: true, kick: true, crouch: true },
  jlp: { su: 4, ac: 8, rc: 4,  dmg: 45, box: [4, -40, 20, 12], hs: 16, bs: 10, kb: [1.6, 0], lvl: 'high', chain: 1, meter: 5, air: true },
  jhp: { su: 6, ac: 7, rc: 4,  dmg: 65, box: [4, -38, 24, 14], hs: 19, bs: 12, kb: [2.4, 0], lvl: 'high', chain: 2, meter: 8, air: true },
  jk:  { su: 5, ac: 10, rc: 4, dmg: 58, box: [2, -26, 26, 14], hs: 18, bs: 11, kb: [2.2, 0], lvl: 'high', chain: 2, meter: 7, air: true, kick: true }
};

const SPECIALS = {
  kaan: {
    s1: { su: 12, ac: 1, rc: 24, cd: 45, chain: 3, proj: { k: 'fire', dx: 16, dy: -38, vx: 3.6, vy: 0, w: 16, h: 12, dmg: 90, hs: 20, bs: 14, kb: [3, 0], life: 220, meter: 10, lvl: 'mid' } },
    s2: { su: 3, ac: 14, rc: 18, cd: 10, chain: 3, dmg: 110, box: [0, -64, 22, 60], hs: 30, bs: 16, kb: [1.4, -6.5], lvl: 'mid', knockdown: true, inv: 9, rise: [1.4, -6.6], meter: 12, helpless: true },
    ult: { su: 8, ac: 54, rc: 26, chain: 4, dmg: 30, multi: 5, box: [12, -50, 440, 30], hs: 12, bs: 8, kb: [0.6, 0], lvl: 'mid', chip: 0.25, isUlt: true, finalKD: true }
  },
  yildiz: {
    s1: { su: 7, ac: 1, rc: 13, cd: 26, chain: 3, air: true, proj: { k: 'kunai', dx: 12, dy: -40, vx: 6.2, vy: 0, w: 12, h: 6, dmg: 62, hs: 16, bs: 9, kb: [1.5, 0], life: 120, meter: 6, lvl: 'mid' }, airVel: [4.6, 3.6] },
    s2: { su: 12, ac: 1, rc: 10, cd: 55, chain: 3, teleport: true, inv: 14 },
    ult: { su: 6, ac: 28, rc: 24, chain: 4, dash: 6.5, dmg: 1, box: [2, -48, 22, 46], hs: 10, bs: 12, kb: [1, 0], lvl: 'mid', chip: 0.2, isUlt: true, lockSeq: true }
  },
  demir: {
    s1: { su: 10, ac: 22, rc: 20, cd: 40, chain: 3, dash: 4.6, box: [4, -48, 18, 44], dmg: 120, hs: 22, bs: 16, kb: [3, -4], lvl: 'mid', knockdown: true, armor: 32, meter: 12 },
    s2: { su: 16, ac: 1, rc: 22, cd: 55, chain: 3, proj: { k: 'shock', dx: 18, dy: -8, vx: 3.2, vy: 0, w: 22, h: 14, dmg: 100, hs: 22, bs: 14, kb: [2, -3.5], life: 100, meter: 10, lvl: 'low', knockdown: true } },
    ult: { su: 10, ac: 200, rc: 24, chain: 4, quake: true, dmg: 330, isUlt: true }
  },
  volt: {
    s1: { su: 14, ac: 1, rc: 18, cd: 70, chain: 3, proj: { k: 'orb', dx: 16, dy: -36, vx: 2.0, vy: 0, w: 16, h: 16, dmg: 35, hs: 16, bs: 10, kb: [1, 0], life: 170, meter: 5, lvl: 'mid', hits: 3, every: 10 } },
    s2: { su: 6, ac: 24, rc: 16, cd: 20, chain: 3, dmg: 35, multi: 8, box: [-26, -64, 52, 64], hs: 16, bs: 10, kb: [2, -3], lvl: 'mid', meter: 5 },
    ult: { su: 18, ac: 1, rc: 30, chain: 4, isUlt: true, rain: { k: 'bolt', n: 5, every: 14, dmg: 62, warn: 20, lvl: 'mid', chip: 0.3, hs: 26, kb: [0.5, 0], nearest: true } }
  },
  ayaz: {
    s1: { su: 11, ac: 1, rc: 20, cd: 55, chain: 3, proj: { k: 'ice', dx: 16, dy: -38, vx: 3.3, vy: 0, w: 14, h: 10, dmg: 70, hs: 18, bs: 12, kb: [2, 0], life: 200, meter: 8, lvl: 'mid', slow: 120 } },
    s2: { su: 2, ac: 28, rc: 16, cd: 40, chain: 3, counter: true },
    ult: { su: 10, ac: 1, rc: 26, chain: 4, isUlt: true, proj: { k: 'icewave', dx: 14, dy: -14, vx: 5.2, vy: 0, w: 24, h: 24, dmg: 40, hs: 12, bs: 12, kb: [0, 0], life: 120, meter: 0, lvl: 'mid', chip: 0.3, freeze: 80, isUlt: true } }
  },
  neon: {
    s1: { su: 7, ac: 24, rc: 14, cd: 30, chain: 3, air: true, dash: 2.8, multi: 8, box: [-4, -44, 30, 30], dmg: 38, hs: 14, bs: 9, kb: [1.4, 0], lvl: 'mid', meter: 5, hover: true },
    s2: { su: 4, ac: 12, rc: 18, cd: 10, chain: 3, dmg: 105, box: [0, -56, 24, 44], hs: 24, bs: 14, kb: [1.6, -6], lvl: 'mid', knockdown: true, inv: 7, rise: [2, -6.8], meter: 12, helpless: true },
    ult: { su: 8, ac: 48, rc: 24, chain: 4, dash: 3.2, multi: 6, box: [-8, -58, 44, 58], dmg: 28, hs: 12, bs: 8, kb: [0, 0], lvl: 'mid', chip: 0.25, isUlt: true, pull: true, finalLaunch: 90 }
  }
};

// ------------------------------------------------------------------ BOSS HAREKETLERİ
// ai.r: [min, max] kenar mesafesi (iki gövde arasındaki boşluk), ai.w: ağırlık, ai.p2: sadece öfke evresinde, ai.cd: tekrar bekleme
const P_FIRE = { k: 'fire', dx: 16, dy: -42, w: 16, h: 12, dmg: 55, hs: 18, bs: 12, kb: [2.5, 0], life: 220, lvl: 'mid', ground: true };
const P_SHARD = { k: 'shard', dx: 14, dy: -40, w: 14, h: 8, dmg: 40, hs: 16, bs: 10, kb: [2, 0], life: 200, lvl: 'mid', slow: 100, ground: true };
const P_KUNAI = { k: 'kunai', dx: 12, dy: -42, w: 12, h: 6, dmg: 45, hs: 14, bs: 9, kb: [1.5, 0], life: 140, lvl: 'mid', ground: true };
const P_ORB = { k: 'darkorb', dx: 16, dy: -44, w: 16, h: 16, dmg: 55, hs: 18, bs: 12, kb: [2.5, 0], life: 260, lvl: 'mid', ground: true };
const fan = (base, list) => list.map(([vx, vy]) => Object.assign({}, base, { vx, vy }));
const KD = { knockdown: true };

const BOSS_MOVES = {
  rifki: {
    jab: { su: 14, ac: 5, rc: 18, dmg: 65, box: [8, -46, 34, 32], hs: 18, bs: 12, kb: [3, 0], lvl: 'mid', ai: { r: [0, 20], w: 4 } },
    haymaker: { su: 28, ac: 6, rc: 30, dmg: 140, box: [8, -50, 40, 40], hs: 24, bs: 16, kb: [3, -5], lvl: 'mid', ...KD, ai: { r: [0, 26], w: 2 } },
    bottle: { su: 18, ac: 1, rc: 22, projs: [{ k: 'bottle', dx: 10, dy: -66, vx: 2.6, vy: -4, g: 0.16, w: 12, h: 12, dmg: 75, hs: 18, bs: 12, kb: [2, -2], life: 260, lvl: 'high', ground: true, aim: true }], ai: { r: [40, 999], w: 3 } },
    charge: { su: 24, ac: 30, rc: 26, dash: 5, dmg: 115, box: [2, -58, 26, 56], hs: 22, bs: 14, kb: [3.5, -4], lvl: 'mid', ...KD, ai: { r: [40, 999], w: 2, cd: 120 } },
    stomp: { su: 14, ac: 200, rc: 26, leap: true, dmg: 120, quakeR: 50, waves: { dmg: 60, vx: 3.2 }, ai: { r: [30, 999], w: 3, p2: true, cd: 150 } }
  },
  golem: {
    smash: { su: 30, ac: 6, rc: 30, dmg: 160, box: [4, -40, 50, 40], hs: 24, bs: 18, kb: [2, -5], lvl: 'mid', ...KD, ai: { r: [0, 30], w: 3 } },
    sweep: { su: 24, ac: 8, rc: 26, dmg: 100, box: [-30, -14, 96, 14], hs: 22, bs: 14, kb: [1.5, -3], lvl: 'low', ...KD, ai: { r: [0, 40], w: 2 } },
    leap: { su: 18, ac: 200, rc: 30, leap: true, dmg: 140, quakeR: 56, waves: { dmg: 75, vx: 3.4 }, ai: { r: [40, 999], w: 3, cd: 120 } },
    rocks: { su: 30, ac: 1, rc: 30, rain: { k: 'meteor', n: 6, every: 16, dmg: 85 }, ai: { r: [0, 999], w: 2, p2: true, cd: 300 } }
  },
  cin: {
    swipe: { su: 12, ac: 5, rc: 18, dmg: 70, box: [6, -48, 30, 36], hs: 18, bs: 12, kb: [3, 0], lvl: 'mid', ai: { r: [0, 18], w: 3 } },
    fan: { su: 22, ac: 1, rc: 26, projs: fan(Object.assign({}, P_FIRE, { vx: 3.4 }), [[3.4, 0], [3.2, 0.6], [3.2, -0.6]]), ai: { r: [30, 999], w: 3 } },
    rain: { su: 26, ac: 1, rc: 28, rain: { k: 'meteor', n: 5, every: 14, dmg: 60 }, ai: { r: [0, 999], w: 2, cd: 240 } },
    beam: { su: 40, ac: 48, rc: 30, multi: 6, dmg: 18, box: [14, -58, 440, 22], hs: 12, bs: 8, kb: [0.8, 0], lvl: 'mid', chip: 0.2, beamY: -47, ai: { r: [0, 999], w: 2, cd: 300 } },
    claw: { su: 14, ac: 6, rc: 24, blink: true, dmg: 120, box: [6, -48, 38, 40], hs: 22, bs: 14, kb: [3, -4], lvl: 'mid', ...KD, ai: { r: [0, 999], w: 3, p2: true, cd: 150 } }
  },
  kar: {
    touch: { su: 12, ac: 5, rc: 18, dmg: 65, box: [6, -46, 30, 36], hs: 18, bs: 12, kb: [3, 0], lvl: 'mid', slow: 60, ai: { r: [0, 16], w: 3 } },
    shards: { su: 18, ac: 1, rc: 22, projs: fan(Object.assign({}, P_SHARD, { vx: 4 }), [[4, 0], [3.8, 0.5], [3.8, -0.5]]), ai: { r: [30, 999], w: 3 } },
    icicles: { su: 24, ac: 1, rc: 26, rain: { k: 'icicle', n: 5, every: 12, dmg: 60, slow: 120 }, ai: { r: [0, 999], w: 2, cd: 200 } },
    wave: { su: 20, ac: 1, rc: 26, projs: [{ k: 'icewave', both: true, dx: 10, dy: -14, vx: 3.6, vy: 0, w: 24, h: 24, dmg: 60, hs: 18, bs: 14, kb: [2, -3], life: 130, lvl: 'low', slow: 120, knockdown: true }], ai: { r: [0, 999], w: 2, cd: 120 } },
    dash: { su: 18, ac: 26, rc: 24, dash: 5.5, dmg: 100, box: [2, -50, 24, 48], hs: 20, bs: 14, kb: [3, -4], lvl: 'mid', slow: 90, ...KD, ai: { r: [30, 999], w: 2, cd: 120 } },
    blizzard: { su: 30, ac: 1, rc: 30, rain: { k: 'icicle', n: 10, every: 9, dmg: 65, slow: 120 }, ai: { r: [0, 999], w: 2, p2: true, cd: 300 } }
  },
  karabasan: {
    slash: { su: 12, ac: 5, rc: 16, dmg: 85, box: [6, -48, 36, 38], hs: 18, bs: 12, kb: [2.5, 0], lvl: 'mid', ai: { r: [0, 22], w: 4 } },
    blink: { su: 16, ac: 5, rc: 22, blink: true, dmg: 105, box: [6, -48, 36, 38], hs: 22, bs: 14, kb: [3, -4], lvl: 'mid', ...KD, ai: { r: [0, 999], w: 2, cd: 120 } },
    kunai: { su: 16, ac: 1, rc: 20, projs: fan(Object.assign({}, P_KUNAI, { vx: 5.5 }), [[5.5, -0.6], [5.5, -0.3], [5.5, 0], [5.5, 0.3], [5.5, 0.6]]), ai: { r: [40, 999], w: 3 } },
    pillars: { su: 22, ac: 1, rc: 24, rain: { k: 'shadow', n: 4, every: 12, dmg: 85 }, ai: { r: [0, 999], w: 2, cd: 220 } },
    dash: { su: 14, ac: 26, rc: 20, dash: 7, dmg: 95, box: [2, -50, 24, 48], hs: 20, bs: 14, kb: [3, -4], lvl: 'mid', ...KD, ai: { r: [20, 999], w: 3, p2: true, cd: 90 } }
  },
  imparator: {
    strike: { su: 22, ac: 6, rc: 26, dmg: 140, box: [6, -50, 46, 48], hs: 24, bs: 16, kb: [3, -5], lvl: 'mid', ...KD, ai: { r: [0, 30], w: 3 } },
    beam: { su: 38, ac: 48, rc: 28, multi: 6, dmg: 24, box: [16, -62, 440, 24], hs: 12, bs: 8, kb: [0.8, 0], lvl: 'mid', chip: 0.2, beamY: -50, ai: { r: [0, 999], w: 2, cd: 260 } },
    meteors: { su: 26, ac: 1, rc: 28, rain: { k: 'meteor', n: 6, every: 13, dmg: 75 }, ai: { r: [0, 999], w: 2, cd: 240 } },
    leap: { su: 16, ac: 200, rc: 28, leap: true, dmg: 150, quakeR: 56, waves: { dmg: 80, vx: 3.4 }, ai: { r: [40, 999], w: 2, cd: 150 } },
    blink: { su: 14, ac: 6, rc: 22, blink: true, dmg: 120, box: [6, -50, 40, 44], hs: 22, bs: 14, kb: [3, -4], lvl: 'mid', ...KD, ai: { r: [0, 999], w: 2, cd: 150 } },
    orbs: { su: 20, ac: 1, rc: 24, projs: fan(Object.assign({}, P_ORB, { vx: 2.6 }), [[2.6, 0], [2.4, 0.5], [2.4, -0.5]]), ai: { r: [30, 999], w: 2 } },
    doom: { su: 34, ac: 1, rc: 30, rain: { k: 'shadow', n: 3, every: 30, dmg: 110, all: true }, ai: { r: [0, 999], w: 3, p2: true, cd: 360 } }
  }
};

const HAZ_W = { bolt: 22, meteor: 26, icicle: 16, shadow: 20 };
const NO_HIT_STATES = new Set(['down', 'getup', 'ko', 'locked', 'iced', 'seq', 'win']);
const PARTY_HP = [1, 1.6, 2.2];

function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
function overlap(a, b) { return a && b && a[0] < b[0] + b[2] && a[0] + a[2] > b[0] && a[1] < b[1] + b[3] && a[1] + a[3] > b[1]; }
function r1(v) { return Math.round(v * 10) / 10; }

// ------------------------------------------------------------------ SAVAŞÇI
class Fighter {
  constructor(idx, cfg, settings) {
    this.idx = idx;
    this.team = cfg.team != null ? cfg.team : idx;
    this.char = GD.getChar(cfg.char);
    this.id = this.char.id;
    this.boss = !!this.char.boss;
    const L = this.char.look;
    this.hw = Math.round(10 * L.build);
    this.hh = Math.round(50 * L.height);
    this.big = !this.boss && L.build > 1.1;
    this.meter = 0;
    this.stats = { dmg: 0, maxCombo: 0, ults: 0, hits: 0 };
    this.feathers = 0; this.feathersUsed = 0; this.lifesteal = 0;

    if (this.boss) {
      const s = this.char.stats, ch = Math.max(1, cfg.chapter || 1);
      const loop = Math.floor((ch - 1) / GD.CHAPTERS.length);
      const party = clamp(cfg.party || 1, 1, 3);
      this.level = ch;
      this.maxHp = Math.round(s.hp * (1 + 0.9 * loop) * PARTY_HP[party - 1]);
      this.power = s.power * (1 + 0.35 * loop);
      this.speed = s.speed * (1 + 0.05 * loop);
      this.defense = 1; this.meterMult = 0; this.reach = 0; this.jumpV = 0;
      this.rest = Math.round(s.rest * Math.max(0.55, 1 - 0.1 * loop) * (party > 1 ? 0.85 : 1));
      this.pref = s.pref;
      const suMul = Math.max(0.7, 1 - 0.06 * loop);
      this.bmoves = {};
      for (const [k, m] of Object.entries(BOSS_MOVES[this.id])) this.bmoves[k] = Object.assign({}, m, { su: Math.max(8, Math.round(m.su * suMul)), chain: 9 });
      this.staggerMax = Math.round(this.maxHp * 0.14);
    } else {
      const s = this.char.stats;
      const hpMul = settings.mode === 'story' ? 1 : (settings.hp || 1);
      this.maxHp = Math.round(s.hp * hpMul);
      this.speed = s.speed; this.jumpV = s.jump; this.power = s.power;
      this.defense = s.defense; this.meterMult = s.meter; this.reach = s.reach || 0;
      this.specials = SPECIALS[this.id];
      if (settings.mode === 'story' && cfg.equip) {
        const e = GD.cleanEquip(cfg.equip);
        this.power *= 1 + 0.08 * e.glove;
        this.defense *= 1 - 0.06 * e.armor;
        this.maxHp = Math.round(this.maxHp * (1 + 0.12 * e.heart));
        this.speed *= 1 + 0.05 * e.boots;
        this.meterMult *= 1 + 0.15 * e.crystal;
        this.lifesteal = 0.03 * e.ring;
        this.feathers = e.feather;
      }
    }
    this.baseSpeed = this.speed;
    this.reset(WORLD_W / 2, 1);
  }
  reset(x, facing) {
    this.x = x; this.y = GROUND; this.vx = 0; this.vy = 0; this.air = false;
    this.facing = facing; this.hp = this.maxHp;
    this.state = 'idle'; this.st = 0;
    this.move = null; this.moveId = ''; this.mt = 0;
    this.stun = 0; this.inv = 0; this.slow = 0; this.landT = 0;
    this.cd = { s1: 0, s2: 0 };
    this.buf = []; this.held = 0;
    this.combo = 0; this.comboDmg = 0; this.comboShow = 0; this.comboShowDmg = 0; this.comboT = 0;
    this.comboTgt = -1; this.comboLast = -99; this.lastAttacker = -1;
    this.hitT = {}; this.connected = false; this.chainCount = 0;
    this.airJumps = 0; this.airAtk = false; this.upReleased = false;
    this.iceT = 0; this.icedBy = -1; this.seq = null; this.armorHit = false; this.juggle = 0; this.crouchBlock = false;
    this.tgt = -1; this.dead = false; this.featherPending = false; this.featherT = 0; this.rv = 0;
    if (this.boss) {
      this.speed = this.baseSpeed; this.enraged = false; this.stagger = 0;
      this.aiCd = 70; this.moveCd = {}; this.aggro = -1; this.aggroT = 0;
    }
  }
  setState(s) { if (this.state !== s) { this.state = s; this.st = 0; } }
  feed(inp) {
    this.held = inp.held | 0;
    const p = inp.pressed | 0;
    if (p) for (const bit of [B.LP, B.HP, B.K, B.S1, B.S2, B.ULT]) if (p & bit) this.buf.push({ b: bit, age: 0 });
  }
  ageBuffer() {
    for (const e of this.buf) e.age++;
    this.buf = this.buf.filter(e => e.age <= BUF_FRAMES);
  }
  has(bit) { return this.buf.some(e => e.b === bit); }
  consume(bit) { const i = this.buf.findIndex(e => e.b === bit); if (i >= 0) this.buf.splice(i, 1); }
  phase() {
    if (!this.move) return -1;
    const m = this.move;
    if (this.mt <= m.su) return 0;
    if (this.mt <= m.su + m.ac) return 1;
    return 2;
  }
  hurtbox() {
    if (NO_HIT_STATES.has(this.state)) return null;
    const w = this.hw, h = this.hh;
    if (this.air || this.state === 'airhit' || this.state === 'fall') return [this.x - w, this.y - Math.round(h * 0.92), w * 2, Math.round(h * 0.84)];
    const crouching = this.state === 'crouch' || (this.state === 'blockstun' && this.crouchBlock) ||
      (this.state === 'attack' && this.move && this.move.crouch);
    if (crouching) { const ch = Math.round(h * 0.64); return [this.x - w, this.y - ch, w * 2, ch]; }
    return [this.x - w, this.y - h, w * 2, h];
  }
}

// ------------------------------------------------------------------ OYUN
class Game {
  constructor(cfgs, settings) {
    this.settings = Object.assign({ mode: 'duel', wins: 2, time: 99, hp: 1, stage: 'istanbul' }, settings || {});
    this.mode = this.settings.mode;
    if (this.mode === 'story') { this.settings.wins = 1; this.settings.time = 0; }
    const party = cfgs.filter(c => !GD.getChar(c.char).boss).length;
    this.f = cfgs.map((c, i) => new Fighter(i, Object.assign({ party }, c), this.settings));
    this.projs = []; this.spawners = []; this.pid = 1;
    this.wins = this.f.map(() => 0); this.round = 0; this.frame = 0;
    this.hitstop = 0; this.superFreeze = 0; this.sfOwner = -1;
    this.events = []; this.over = false; this.winner = -1; this.roundWinner = -1;
    this.startRound();
  }
  ev(type, data) { this.events.push(Object.assign({ t: type }, data || {})); }
  enemiesOf(f) { return this.f.filter(e => e.team !== f.team && !e.dead && e.hp > 0); }

  startRound() {
    this.round++;
    const n = this.f.length;
    let xs;
    if (this.mode === 'story') {
      const pl = [150, 110, 70]; let k = 0;
      xs = this.f.map(f => f.boss ? 380 : pl[k++ % 3]);
    } else if (n === 2) xs = [WORLD_W / 2 - 70, WORLD_W / 2 + 70];
    else xs = [140, 340, 240].slice(0, n);
    this.f.forEach((f, i) => f.reset(xs[i], 1));
    for (const f of this.f) {
      const e = this.nearestEnemy(f);
      f.facing = e && e.x < f.x ? -1 : 1;
    }
    this.projs = []; this.spawners = [];
    this.hitstop = 0; this.superFreeze = 0; this.sfOwner = -1;
    this.phase = 'intro'; this.pt = this.mode === 'story' ? 150 : 120;
    this.timer = this.settings.time > 0 ? this.settings.time * 60 : -1;
    this.ev('round', { n: this.round });
  }

  nearestEnemy(f) {
    let best = null, bd = 1e9;
    for (const e of this.f) {
      if (e.team === f.team || e.dead || e.hp <= 0) continue;
      const d = Math.abs(e.x - f.x) + Math.abs(e.y - f.y) * 0.5;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  step(inputs) {
    if (this.frame > 0) this.events = [];
    this.frame++;
    const none = { held: 0, pressed: 0 };
    const live = this.phase === 'fight';
    this.f.forEach((f, i) => { if (!f.boss) f.feed(live ? (inputs[i] || none) : none); });

    switch (this.phase) {
      case 'intro':
        this.pt--;
        if (this.pt === 45) this.ev('fight');
        this.simTick(false);
        if (this.pt <= 0) this.phase = 'fight';
        break;
      case 'fight':
        if (this.superFreeze > 0) {
          this.superFreeze--;
          for (const f of this.f) f.ageBuffer();
        } else if (this.hitstop > 0) {
          this.hitstop--;
        } else {
          this.simTick(true);
          if (this.timer > 0) {
            this.timer--;
            if (this.timer === 0 && this.phase === 'fight') this.timeUp();
          }
        }
        break;
      case 'ko':
        this.pt--;
        if (this.pt > 60) { if (this.frame % 3 === 0) this.simTick(false); }
        else this.simTick(false);
        if (this.pt <= 0) this.finishRound();
        break;
      case 'roundEnd':
        this.pt--;
        this.simTick(false);
        if (this.pt <= 0) {
          if (this.over) { this.phase = 'over'; this.ev('over', { w: this.winner }); }
          else this.startRound();
        }
        break;
      case 'over':
        this.simTick(false);
        break;
    }
    return this.events;
  }

  timeUp() {
    let best = -1, bp = -1, tie = false;
    for (const f of this.f) {
      if (f.dead) continue;
      const p = f.hp / f.maxHp;
      if (Math.abs(p - bp) < 0.001) tie = true;
      else if (p > bp) { bp = p; best = f.idx; tie = false; }
    }
    this.roundWinner = tie ? -1 : best;
    this.phase = 'ko'; this.pt = 60;
    this.ev('timeup');
  }

  checkKO() {
    if (this.phase !== 'fight') return;
    const fresh = [];
    for (const f of this.f) {
      if (f.hp > 0 || f.dead || f.featherPending) continue;
      if (this.mode === 'story' && !f.boss && f.feathers > 0) {
        f.feathers--; f.feathersUsed++; f.featherPending = true; f.featherT = 0;
        this.ev('feather', { i: f.idx });
        continue;
      }
      f.dead = true; fresh.push(f);
    }
    const teams = new Set(this.f.filter(f => !f.dead).map(f => f.team));
    if (teams.size > 1) {
      for (const f of fresh) this.ev('out', { i: f.idx });
      return;
    }
    this.roundWinner = teams.size === 1 ? [...teams][0] : -1;
    this.phase = 'ko'; this.pt = 130; this.hitstop = 0; this.superFreeze = 0;
    this.ev('ko', { w: this.roundWinner });
  }

  finishRound() {
    const w = this.roundWinner;
    if (this.mode === 'story') {
      this.over = true; this.winner = w;
    } else {
      if (w === -1) { if (this.f.length === 2) this.wins = this.wins.map(x => x + 1); }
      else this.wins[w]++;
      const max = Math.max(...this.wins);
      if (max >= this.settings.wins) {
        this.over = true;
        const top = this.wins.map((x, i) => x === max ? i : -1).filter(i => i >= 0);
        this.winner = top.length === 1 ? top[0] : -1;
      }
    }
    for (const f of this.f) {
      if ((f.team === w || w === -1) && f.hp > 0) { f.move = null; f.moveId = ''; f.vx = 0; if (!f.air) f.setState('win'); }
    }
    this.ev('roundWin', { w, wins: this.wins.slice(), final: this.over, mw: this.winner });
    this.phase = 'roundEnd'; this.pt = 150;
  }

  // ---------------------------------------------------------------- tick
  simTick(acceptInput) {
    for (const f of this.f) { f.ageBuffer(); if (!acceptInput) f.held = 0; }
    this.updateTargets();
    for (const f of this.f) this.updateFighter(f);
    this.constrain();
    this.updateSpawners();
    this.updateProjectiles();
    const hits = [];
    for (const a of this.f) for (const d of this.activeHits(a)) hits.push([a, d, a.move]);
    for (const [a, d, m] of hits) this.applyHit(a, d, m, { x: d.x - a.facing * 6, y: d.y - d.hh * 0.72 });
    this.updateRevives();
    this.checkKO();
  }

  updateTargets() {
    for (const f of this.f) {
      if (f.boss) {
        const en = this.enemiesOf(f);
        f.aggroT--;
        const cur = this.f[f.aggro];
        if (f.aggroT <= 0 || !cur || !en.includes(cur)) {
          const pick = (Math.random() < 0.6 || !en.length) ? this.nearestEnemy(f) : en[Math.floor(Math.random() * en.length)];
          f.aggro = pick ? pick.idx : -1; f.aggroT = 180 + Math.floor(Math.random() * 140);
        }
        f.tgt = f.aggro;
      } else {
        const e = this.nearestEnemy(f);
        f.tgt = e ? e.idx : -1;
      }
    }
  }

  updateFighter(f) {
    const opp = f.tgt >= 0 ? this.f[f.tgt] : null;
    f.st++;
    if (f.inv > 0) f.inv--;
    if (f.slow > 0) f.slow--;
    if (f.cd.s1 > 0) f.cd.s1--;
    if (f.cd.s2 > 0) f.cd.s2--;
    if (f.boss) for (const k in f.moveCd) if (f.moveCd[k] > 0) f.moveCd[k]--;
    const held = f.held;
    const dir = (held & B.R) ? 1 : (held & B.L) ? -1 : 0;
    const slowMul = f.slow > 0 ? 0.55 : 1;

    switch (f.state) {
      case 'idle': case 'walk': case 'crouch': {
        if (f.landT > 0) { f.landT--; f.vx = 0; break; }
        if (opp) this.faceOpp(f, opp);
        if (f.boss) { this.bossAI(f, opp); break; }
        if (this.phase === 'fight' && this.tryAction(f, opp, false)) break;
        if (held & B.U) {
          f.vy = -f.jumpV; f.vx = dir * f.speed * 1.2 * slowMul; f.air = true;
          f.setState('jump'); f.airJumps = f.id === 'yildiz' ? 1 : 0; f.airAtk = false; f.upReleased = false;
        } else if (held & B.D) {
          f.setState('crouch'); f.vx = 0;
        } else {
          const mul = dir === f.facing ? 1 : 0.72;
          f.vx = dir * f.speed * mul * slowMul;
          f.setState(dir ? 'walk' : 'idle');
        }
        break;
      }
      case 'jump': {
        if (!(held & B.U)) f.upReleased = true;
        if (f.airJumps > 0 && f.upReleased && (held & B.U) && f.vy > -3) {
          f.vy = -f.jumpV * 0.85; f.vx = dir * f.speed * 1.1; f.airJumps--; f.upReleased = false;
          this.ev('djump', { i: f.idx, x: r1(f.x), y: r1(f.y) });
        }
        if (!f.airAtk && this.phase === 'fight') this.tryAction(f, opp, false);
        break;
      }
      case 'attack': this.tickMove(f, opp); break;
      case 'hitstun': case 'blockstun':
        f.stun--;
        if (f.stun <= 0) {
          f.setState('idle');
          const la = this.f[f.lastAttacker];
          if (la && la.comboTgt === f.idx && !f.boss) { la.combo = 0; la.comboDmg = 0; }
        }
        break;
      case 'down':
        if (f.st >= 36) { f.setState('getup'); f.inv = 18; }
        break;
      case 'getup':
        if (f.st >= 14) { f.setState('idle'); f.juggle = 0; }
        break;
      case 'ko':
        if (f.featherPending && ++f.featherT >= 50) this.revive(f, 0.4);
        break;
      case 'iced':
        f.iceT--;
        if (f.iceT <= 0) {
          const by = this.f[f.icedBy] || opp;
          f.setState('hitstun'); f.stun = 16;
          const dmg = by ? this.dealDamage(by, f, 290) : 0;
          if (by) by.stats.hits++;
          this.launch(f, by && by.x < f.x ? 1 : -1, 2.5, -5.5);
          this.hitstop = 10;
          this.ev('shatter', { x: r1(f.x), y: r1(f.y - 26), i: f.idx });
          this.ev('hit', { x: r1(f.x), y: r1(f.y - 30), d: dmg, h: 2, i: f.idx });
        }
        break;
      case 'seq': this.tickSeq(f, opp); break;
      default: break; // airhit, fall, locked, win
    }

    // fizik
    if (f.state !== 'locked' && f.state !== 'iced' && f.state !== 'seq') {
      if (f.air) {
        const hovering = f.state === 'attack' && f.move && f.move.hover && f.phase() === 1;
        if (hovering) f.vy = 0; else f.vy += GRAV;
      }
      f.x += f.vx; f.y += f.vy;
      if (f.air && f.y >= GROUND && f.vy >= 0) this.land(f, opp);
      if (!f.air) {
        f.y = GROUND;
        if (f.state === 'hitstun' || f.state === 'blockstun' || f.state === 'down' || f.state === 'getup' || f.state === 'ko' || f.state === 'win' ||
          (f.state === 'attack' && !(f.move && f.move.dash && f.phase() === 1))) f.vx *= 0.8;
        if (Math.abs(f.vx) < 0.05 && f.state !== 'walk') f.vx = 0;
      }
    }
  }

  faceOpp(f, opp) { if (opp && Math.abs(opp.x - f.x) > 2) f.facing = opp.x > f.x ? 1 : -1; }

  land(f, opp) {
    f.air = false; f.y = GROUND; f.vy = 0;
    switch (f.state) {
      case 'jump': f.setState('idle'); f.vx = 0; if (f.airAtk) f.landT = 3; break;
      case 'attack': {
        const m = f.move;
        if (m && m.quake) { this.quakeImpact(f, Infinity, m.dmg, null); f.mt = m.su + m.ac; f.vx = 0; }
        else if (m && m.leap) { this.quakeImpact(f, m.quakeR, m.dmg, m.waves); f.mt = m.su + m.ac; f.vx = 0; }
        else { this.endMove(f, opp); f.vx = 0; f.landT = m && m.rise ? 8 : 3; }
        break;
      }
      case 'airhit':
        f.vx = 0;
        this.ev('land', { x: r1(f.x), heavy: 1 });
        if (f.hp <= 0) f.setState('ko'); else f.setState('down');
        break;
      case 'fall': f.setState('idle'); f.vx = 0; f.landT = 8; break;
      default: f.vx = 0; if (!['ko', 'win', 'hitstun', 'blockstun'].includes(f.state)) f.setState('idle');
    }
  }

  revive(f, pct) {
    f.hp = Math.max(1, Math.round(f.maxHp * pct));
    f.dead = false; f.featherPending = false; f.featherT = 0; f.rv = 0;
    f.setState('getup'); f.inv = 90; f.vx = 0; f.juggle = 0;
    this.ev('revive', { i: f.idx, x: r1(f.x), y: r1(f.y) });
  }

  updateRevives() {
    if (this.mode !== 'story' || this.phase !== 'fight') return;
    for (const k of this.f) {
      if (k.boss || k.hp > 0 || k.state !== 'ko' || k.featherPending) continue;
      let helpers = 0;
      for (const a of this.f) if (a !== k && a.team === k.team && a.hp > 0 && !a.air && a.state === 'crouch' && Math.abs(a.x - k.x) < 32) helpers++;
      if (helpers) { k.rv += helpers; if (k.rv >= 150) this.revive(k, 0.35); }
      else if (k.rv > 0) k.rv = Math.max(0, k.rv - 2);
    }
  }

  // ---------------------------------------------------------------- BOSS YAPAY ZEKASI
  bossAI(f, opp) {
    if (this.phase !== 'fight' || !opp) { f.vx = 0; f.setState('idle'); return; }
    if (f.aiCd > 0) f.aiCd--;
    const gap = Math.max(0, Math.abs(opp.x - f.x) - opp.hw - f.hw);
    const cornered = f.x < 40 || f.x > WORLD_W - 40;
    if (f.aiCd <= 0) {
      const opts = [];
      let total = 0;
      for (const [id, m] of Object.entries(f.bmoves)) {
        const a = m.ai;
        if (a.p2 && !f.enraged) continue;
        if (f.moveCd[id] > 0) continue;
        if (gap < a.r[0] || gap > a.r[1]) continue;
        opts.push([id, m, a.w]); total += a.w;
      }
      if (opts.length) {
        let r = Math.random() * total, pick = opts[0];
        for (const o of opts) { r -= o[2]; if (r <= 0) { pick = o; break; } }
        const [id, m] = pick;
        this.startMove(f, id, m, opp);
        f.moveCd[id] = m.ai.cd || 0;
        f.aiCd = Math.round(f.rest * (f.enraged ? 0.7 : 1) * (0.7 + Math.random() * 0.6));
        return;
      }
    }
    if (gap > f.pref + 8) { f.vx = f.facing * f.speed; f.setState('walk'); }
    else if (f.pref > 30 && gap < f.pref - 40 && !cornered) { f.vx = -f.facing * f.speed * 0.8; f.setState('walk'); }
    else { f.vx = 0; f.setState('idle'); }
  }

  // ---------------------------------------------------------------- hareket başlatma
  tryAction(f, opp, cancelling) {
    if (!f.buf.length) return false;
    const prev = cancelling ? f.move : null;
    const allow = (tier) => {
      if (!prev) return true;
      if (prev.chain === 1 && tier === 1) return f.chainCount < 2;
      return tier > prev.chain;
    };
    if (f.has(B.ULT) && f.meter >= 100 && !f.air && allow(4)) {
      f.consume(B.ULT); this.startUlt(f, opp); return true;
    }
    for (const key of ['s1', 's2']) {
      const bit = key === 's1' ? B.S1 : B.S2;
      if (!f.has(bit)) continue;
      const sp = f.specials[key];
      if (f.cd[key] > 0 || (f.air && !sp.air) || !allow(3)) continue;
      if (sp.proj && this.projs.some(p => p.o === f.idx && p.k === sp.proj.k)) continue;
      f.consume(bit); this.startMove(f, key, sp, opp); return true;
    }
    const crouch = !!(f.held & B.D);
    const normals = [[B.HP, 'hp', 'chp', 'jhp'], [B.K, 'k', 'ck', 'jk'], [B.LP, 'lp', 'clp', 'jlp']];
    for (const [bit, st, cr, air] of normals) {
      if (!f.has(bit)) continue;
      const id = f.air ? air : (crouch ? cr : st);
      const mv = NORMALS[id];
      if (!allow(mv.chain)) continue;
      if (f.air && f.airAtk) continue;
      f.consume(bit);
      if (prev && prev.chain === 1 && mv.chain === 1) f.chainCount++; else if (!prev) f.chainCount = 0;
      this.startMove(f, id, mv, opp);
      if (f.air) f.airAtk = true;
      return true;
    }
    return false;
  }

  startMove(f, id, mv, opp) {
    f.move = mv; f.moveId = id; f.mt = 0; f.setState('attack');
    f.hitT = {}; f.connected = false; f.armorHit = false;
    if (!f.air && !mv.dash) f.vx = 0;
    if (mv.cd) f.cd[id] = mv.cd;
    if (mv.inv) f.inv = Math.max(f.inv, mv.inv);
    if (mv.hover && f.air) f.vy = Math.min(f.vy, 0);
    if (mv.blink && opp) this.teleportBehind(f, opp);
    if (f.boss) this.ev('bossmove', { i: f.idx, m: id, c: f.id });
    else if (id === 's1' || id === 's2') this.ev('special', { i: f.idx, m: id, c: f.id });
    else this.ev('swing', { i: f.idx, h: mv.dmg >= 55 ? 1 : 0 });
  }

  teleportBehind(f, opp) {
    const side = opp.facing, off = opp.hw + f.hw + 10;
    let nx = opp.x - side * off;
    if (nx < 14 || nx > WORLD_W - 14) nx = opp.x + side * off;
    f.x = clamp(nx, 14, WORLD_W - 14);
    f.y = GROUND; f.air = false; f.vy = 0;
    this.faceOpp(f, opp);
    this.ev('teleport', { i: f.idx, x: r1(f.x), y: r1(f.y) });
  }

  startUlt(f, opp) {
    const mv = f.specials.ult;
    f.meter = 0; f.stats.ults++;
    this.startMove(f, 'ult', mv, opp);
    this.superFreeze = 50; this.sfOwner = f.idx;
    f.inv = 50 + mv.su + 4;
    this.ev('ult', { i: f.idx, c: f.id });
  }

  tickMove(f, opp) {
    const m = f.move;
    if (!m) { f.setState(f.air ? 'jump' : 'idle'); return; }
    f.mt++;
    const t = f.mt;
    if (t === m.su + 1) this.onActive(f, opp, m);
    if (!f.move) return;
    const ph = f.phase();
    const hitList = () => Object.keys(f.hitT).map(k => this.f[k]).filter(d => d && d.state === 'hitstun');
    if (ph === 1) {
      if (m.dash) f.vx = f.facing * m.dash * (f.slow > 0 ? 0.6 : 1);
      if (m.pull && f.connected) {
        for (const d of hitList()) if (!d.boss) { const tx = f.x + f.facing * 20; d.x += (tx - d.x) * 0.25; }
      }
    } else if (ph === 2 && t === m.su + m.ac + 1) {
      if (m.dash && !f.air) f.vx = 0;
      if (m.dash && f.air && m.hover) f.vx *= 0.3;
      if (m.finalKD && f.connected) for (const d of hitList()) this.launch(d, f.facing, 2, -5);
      if (m.finalLaunch && f.connected) {
        for (const d of hitList()) {
          const dmg = this.dealDamage(f, d, m.finalLaunch * f.power);
          this.launch(d, f.facing, 2.5, -6.5);
          this.hitstop = 9;
          this.ev('hit', { x: r1(d.x), y: r1(d.y - 40), d: dmg, h: 2, i: d.idx });
        }
      }
    }
    if (!f.boss && f.connected && ph >= 1 && m.chain < 4 && this.tryAction(f, opp, true)) return;
    if ((m.quake || m.leap) && (f.air || t < m.su + m.ac)) {
      if (t > m.su + 400) this.endMove(f, opp);
      return;
    }
    if (m.air && !f.air) { this.endMove(f, opp); return; }
    if (t >= m.su + m.ac + m.rc) this.endMove(f, opp);
  }

  onActive(f, opp, m) {
    if (m.proj) {
      let vx = m.proj.vx, vy = m.proj.vy;
      if (f.air && m.airVel) { vx = m.airVel[0]; vy = m.airVel[1]; }
      this.spawnProj(f, m.proj, vx, vy, f.facing, opp);
    }
    if (m.projs) for (const p of m.projs) {
      if (p.both) { this.spawnProj(f, p, p.vx, p.vy, 1, opp); this.spawnProj(f, p, p.vx, p.vy, -1, opp); }
      else this.spawnProj(f, p, p.vx, p.vy, f.facing, opp);
    }
    if (m.rise) { f.vx = f.facing * m.rise[0]; f.vy = m.rise[1]; f.air = true; }
    if (m.teleport && opp) this.teleportBehind(f, opp);
    if (m.quake) { f.vy = -8.5; f.vx = 0; f.air = true; this.ev('special', { i: f.idx, m: 'quake', c: f.id }); }
    if (m.leap) {
      f.vy = -8.5; f.air = true;
      const T = 2 * 8.5 / GRAV;
      f.vx = opp ? clamp((opp.x - f.x) / T, -5, 5) : 0;
      this.ev('leap', { i: f.idx });
    }
    if (m.rain) {
      const r = m.rain;
      this.spawners.push(Object.assign({ o: f.idx, team: f.team, t: 0, c: 0, warn: 30, lvl: 'unblockable', kb: [1.5, -4.5], knockdown: true, hs: 26 }, r, { dmgMul: f.power }));
      this.ev('rain', { i: f.idx, k: r.k });
    }
  }

  endMove(f, opp) {
    const m = f.move;
    f.move = null; f.moveId = ''; f.mt = 0;
    if (f.air) { f.setState(m && m.helpless ? 'fall' : 'jump'); f.airAtk = true; }
    else f.setState('idle');
  }

  quakeImpact(f, range, dmgBase, waves) {
    this.ev('quake', { x: r1(f.x), i: f.idx });
    this.hitstop = Math.max(this.hitstop, 6);
    for (const e of this.f) {
      if (e.team === f.team || e.air || NO_HIT_STATES.has(e.state) || e.inv > 0 || e.state === 'airhit' || e.hp <= 0) continue;
      if (Math.abs(e.x - f.x) > range + e.hw) continue;
      const dmg = this.dealDamage(f, e, dmgBase * f.power * e.defense);
      f.stats.hits++;
      this.launch(e, e.x > f.x ? 1 : -1, 2.5, -6);
      this.hitstop = 12;
      this.ev('hit', { x: r1(e.x), y: r1(e.y - 20), d: dmg, h: 2, i: e.idx });
    }
    if (waves) {
      const p = { k: 'shock', dx: 22, dy: -8, w: 22, h: 14, dmg: waves.dmg, hs: 22, bs: 14, kb: [2, -3.5], life: 110, lvl: 'low', knockdown: true };
      this.spawnProj(f, p, waves.vx, 0, 1, null);
      this.spawnProj(f, p, waves.vx, 0, -1, null);
    }
  }

  // ---------------------------------------------------------------- vuruşlar
  activeHits(f) {
    if (f.state !== 'attack' || !f.move || !f.move.box || f.phase() !== 1) return [];
    const m = f.move;
    let [bx, by, bw, bh] = m.box;
    if (NORMALS[f.moveId] && !f.boss) bw += f.reach + (m.kick && f.id === 'neon' ? 5 : 0);
    if (f.big) { by -= 4; bh += 2; }
    const x0 = f.facing === 1 ? f.x + bx : f.x - bx - bw;
    const box = [x0, f.y + by, bw, bh];
    const out = [];
    for (const e of this.f) {
      if (e.team === f.team) continue;
      const last = f.hitT[e.idx];
      if (m.multi) { if (last != null && f.mt - last < m.multi) continue; }
      else if (last != null) continue;
      if (overlap(box, e.hurtbox())) out.push(e);
    }
    return out;
  }

  canBlock(def, fromX, lvl) {
    if (def.boss || lvl === 'unblockable') return false;
    if (def.air) return false;
    if (!['idle', 'walk', 'crouch', 'blockstun'].includes(def.state)) return false;
    if (def.landT > 0) return false;
    const back = fromX > def.x ? B.L : B.R;
    if (!(def.held & back)) return false;
    const crouch = !!(def.held & B.D);
    if (lvl === 'low' && !crouch) return false;
    if (lvl === 'high' && crouch) return false;
    def.crouchBlock = crouch;
    return true;
  }

  dealDamage(att, def, dmg) {
    dmg = Math.max(1, Math.round(dmg));
    def.hp = Math.max(0, def.hp - dmg);
    att.stats.dmg += dmg;
    if (att.lifesteal && att.hp > 0) att.hp = Math.min(att.maxHp, att.hp + dmg * att.lifesteal);
    if (def.boss && !def.enraged && def.hp > 0 && def.hp <= def.maxHp * 0.5) {
      def.enraged = true; def.speed = def.baseSpeed * 1.2;
      this.ev('enrage', { i: def.idx });
    }
    return dmg;
  }

  launch(def, dir, vx, vy) {
    if (def.boss && def.hp > 0) return; // bosslar havaya uçmaz
    def.move = null; def.moveId = '';
    def.setState('airhit');
    def.air = true; def.vx = dir * vx * (def.big || def.boss ? 0.7 : 1); def.vy = vy;
    def.juggle++;
  }

  applyHit(att, def, mv, src) {
    if (def.inv > 0 || NO_HIT_STATES.has(def.state) || def.hp <= 0 && def.state !== 'airhit') return false;
    if (def.state === 'airhit' && def.juggle >= 5) return false;
    if (att.state === 'seq' && mv.lockSeq) return false;
    const isProj = !!src.proj;
    const dir = src.x < def.x ? 1 : (src.x > def.x ? -1 : att.facing);

    // Ayaz karşı saldırısı
    if (def.move && def.move.counter && def.phase() === 1 && !mv.isUlt) {
      this.ev('counter', { i: def.idx, x: r1(def.x), y: r1(def.y - 30) });
      def.inv = 24; def.meter = Math.min(100, def.meter + 12);
      this.endMove(def, att);
      if (!isProj || Math.abs(att.x - def.x) < 80) {
        const dmg = this.dealDamage(def, att, 110 * def.power * att.defense);
        att.slow = 90;
        def.stats.hits++;
        this.launch(att, def.x < att.x ? 1 : -1, 2.5, -5);
        this.ev('hit', { x: r1(att.x), y: r1(att.y - 30), d: dmg, h: 2, i: att.idx, k: 'ice' });
        this.hitstop = 10;
      }
      if (!isProj) { att.hitT[def.idx] = att.mt; att.connected = true; }
      return true;
    }

    if (!isProj) { att.hitT[def.idx] = att.mt; att.connected = true; }

    const armored = !mv.isUlt && def.state === 'attack' && def.move && !def.armorHit && !def.boss && (
      (def.move.armor && def.mt <= def.move.armor) || (def.id === 'demir' && def.moveId === 'hp' && def.mt <= def.move.su));
    const blocked = this.canBlock(def, src.x, mv.lvl);

    if (blocked) {
      const chipF = mv.chip != null ? mv.chip : ((isProj || att.boss || att.moveId === 's1' || att.moveId === 's2') ? 0.15 : 0);
      const chip = Math.round(mv.dmg * att.power * chipF * def.defense);
      if (chip > 0) this.dealDamage(att, def, chip);
      def.setState('blockstun'); def.stun = mv.bs || 10;
      def.move = null; def.moveId = '';
      def.vx = dir * Math.abs((mv.kb ? mv.kb[0] : 1) * 0.9 * (def.big ? 0.6 : 1));
      att.meter = Math.min(100, att.meter + (mv.meter || 4) * 0.5 * att.meterMult);
      def.meter = Math.min(100, def.meter + 2 * def.meterMult);
      this.hitstop = Math.max(this.hitstop, 4);
      this.ev('block', { x: r1(src.x), y: r1(src.y), i: def.idx });
      if (def.hp <= 0) this.launch(def, dir, 2, -4);
      return true;
    }

    if (mv.lockSeq && !isProj) { this.startSeq(att, def); return true; }

    if (mv.freeze) {
      const dmg = this.dealDamage(att, def, mv.dmg * att.power * def.defense);
      def.move = null; def.moveId = ''; def.vx = 0; def.vy = 0;
      if (def.air) { def.y = GROUND; def.air = false; }
      def.setState('iced'); def.iceT = def.boss ? 50 : mv.freeze; def.icedBy = att.idx;
      att.stats.hits++;
      this.ev('freeze', { x: r1(def.x), y: r1(def.y), i: def.idx });
      this.ev('hit', { x: r1(src.x), y: r1(src.y), d: dmg, h: 1, i: def.idx, k: 'ice' });
      this.hitstop = 8;
      return true;
    }

    // kombo
    const inCombo = att.comboTgt === def.idx && (
      (['hitstun', 'airhit', 'locked', 'iced'].includes(def.state) && def.lastAttacker === att.idx) ||
      (def.boss && this.frame - att.comboLast < 50));
    if (inCombo) att.combo++; else { att.combo = 1; att.comboDmg = 0; }
    att.comboTgt = def.idx; att.comboLast = this.frame; def.lastAttacker = att.idx;
    const neon = att.id === 'neon';
    const scale = (mv.isUlt || att.boss) ? 1 : Math.max(neon ? 0.7 : 0.4, 1 - (neon ? 0.05 : 0.1) * (att.combo - 1));
    let power = att.power;
    if (att.id === 'kaan' && att.hp < att.maxHp * 0.3) power *= 1.15;
    let dmg = mv.dmg * power * scale * def.defense;
    if (armored) dmg *= 0.5;
    dmg = this.dealDamage(att, def, dmg);
    att.comboDmg += dmg;
    att.stats.hits++;
    if (att.combo > att.stats.maxCombo) att.stats.maxCombo = att.combo;
    if (att.combo >= 2) { att.comboShow = att.combo; att.comboShowDmg = att.comboDmg; att.comboT = this.frame; }

    att.meter = Math.min(100, att.meter + (mv.isUlt ? 0 : (mv.meter || 6) * att.meterMult));
    def.meter = Math.min(100, def.meter + dmg * 0.05 * (def.boss ? 0 : def.meterMult));
    if (mv.slow) def.slow = mv.slow;

    const hlev = dmg >= 90 ? 2 : dmg >= 55 ? 1 : 0;

    // Boss: süper zırh, sersemleme barı
    if (def.boss && def.hp > 0) {
      def.stagger += dmg;
      if (def.stagger >= def.staggerMax && def.state !== 'hitstun') {
        def.stagger = 0; def.staggerMax = Math.round(def.staggerMax * 1.3);
        def.move = null; def.moveId = ''; def.vx = 0;
        def.setState('hitstun'); def.stun = 90;
        this.ev('stagger', { i: def.idx, x: r1(def.x), y: r1(def.y - def.hh) });
      }
      this.hitstop = Math.max(this.hitstop, mv.isUlt ? 2 : 3);
      this.ev('hit', { x: r1(src.x), y: r1(src.y), d: dmg, h: hlev, i: def.idx, k: src.kind || '' });
      return true;
    }

    if (armored && def.hp > 0) {
      def.armorHit = true;
      this.ev('armor', { x: r1(src.x), y: r1(src.y), i: def.idx });
      this.hitstop = Math.max(this.hitstop, 5);
      return true;
    }

    const kb = mv.kb || [1.5, 0];
    const kbRes = def.big ? 0.6 : 1;
    if (def.hp <= 0) {
      this.launch(def, dir, 3, -5.5);
    } else if (mv.knockdown || def.air || def.state === 'airhit' || kb[1] < 0) {
      this.launch(def, dir, Math.max(1.6, kb[0]), Math.min(kb[1] || -3.5, -3.5));
    } else {
      def.move = null; def.moveId = '';
      def.setState('hitstun'); def.stun = mv.hs || 14;
      def.vx = dir * kb[0] * kbRes;
      if ((def.x < 16 || def.x > WORLD_W - 16) && !att.boss && !isProj) att.vx = -dir * kb[0] * 0.8;
    }
    let hs = dmg >= 90 ? 8 : dmg >= 55 ? 6 : 4;
    if (mv.isUlt) hs = Math.min(hs, 3);
    this.hitstop = Math.max(this.hitstop, hs);
    this.ev('hit', { x: r1(src.x), y: r1(src.y), d: dmg, h: hlev, i: def.idx, k: src.kind || '' });
    return true;
  }

  // Yıldız ulti dizisi
  startSeq(att, def) {
    att.move = null; att.moveId = 'ult'; att.mt = 0;
    att.setState('seq'); att.seq = { t: 0, n: 0, tgt: def.idx }; att.inv = 999; att.vx = 0;
    def.move = null; def.moveId = ''; def.vx = 0; def.vy = 0;
    if (def.air) { def.air = false; def.y = GROUND; }
    def.setState('locked');
    att.combo = 1; att.comboDmg = 0; att.comboTgt = def.idx; att.comboLast = this.frame; def.lastAttacker = att.idx;
    this.ev('teleport', { i: att.idx, x: r1(att.x), y: r1(att.y) });
  }

  tickSeq(f) {
    const s = f.seq;
    const opp = s && this.f[s.tgt];
    if (!s || !opp) { f.seq = null; f.inv = 10; f.setState('idle'); return; }
    s.t++;
    if (s.t % 7 !== 0) return;
    s.n++;
    const side = s.n % 2 ? 1 : -1;
    f.x = clamp(opp.x + side * (opp.hw + 12), 10, WORLD_W - 10);
    f.facing = opp.x > f.x ? 1 : -1;
    const final = s.n >= 9;
    const dmg = this.dealDamage(f, opp, (final ? 60 : 34) * f.power * opp.defense);
    f.combo++; f.comboDmg += dmg; f.comboShow = f.combo; f.comboShowDmg = f.comboDmg; f.comboT = this.frame; f.stats.hits++;
    if (f.combo > f.stats.maxCombo) f.stats.maxCombo = f.combo;
    this.ev('teleport', { i: f.idx, x: r1(f.x), y: r1(f.y) });
    this.ev('hit', { x: r1(opp.x - f.facing * 4), y: r1(opp.y - opp.hh * 0.6 - (s.n % 3) * 6), d: dmg, h: final ? 2 : 1, i: opp.idx });
    if (final || opp.hp <= 0) {
      f.seq = null; f.inv = 10; f.moveId = ''; f.setState('idle');
      if (opp.boss && opp.hp > 0) { opp.setState('hitstun'); opp.stun = 20; }
      else this.launch(opp, f.facing, 3, -5.5);
      this.hitstop = 10;
    }
  }

  // ---------------------------------------------------------------- mermiler
  spawnProj(f, p, vx, vy, dir, opp) {
    const x = f.x + dir * p.dx, y = f.y + p.dy;
    if (p.aim && opp) {
      // atış süresini hesapla, hedefin üstüne düşecek şekilde yatay hızı ayarla
      const g = p.g, fall = (GROUND - 6) - y;
      const T = (-vy + Math.sqrt(vy * vy + 2 * g * fall)) / g;
      vx = clamp(Math.abs(opp.x + opp.vx * 10 - x) / T, 0.8, 5.5);
    }
    this.projs.push({
      id: this.pid++, k: p.k, o: f.idx, team: f.team,
      x, y, vx: vx * dir, vy, g: p.g || 0, ground: !!p.ground,
      w: p.w, h: p.h, dmg: p.dmg, hs: p.hs, bs: p.bs, kb: p.kb, lvl: p.lvl,
      life: p.life, hits: p.hits || 1, every: p.every || 1, hitT: {}, t: 0,
      slow: p.slow, freeze: p.freeze, knockdown: p.knockdown, chip: p.chip, isUlt: p.isUlt, meter: p.meter
    });
  }

  updateSpawners() {
    for (const s of this.spawners) {
      if (s.t % s.every === 0 && s.n > 0) {
        const owner = this.f[s.o];
        let targets = this.enemiesOf(owner);
        if (s.nearest) { const n = this.nearestEnemy(owner); targets = n ? [n] : []; }
        if (targets.length) {
          const list = s.all ? targets : [targets[s.c++ % targets.length]];
          for (const tg of list) {
            const jitter = s.all || s.nearest ? 0 : (Math.random() - 0.5) * 28;
            this.projs.push({
              id: this.pid++, k: s.k, o: s.o, team: s.team, haz: true,
              x: clamp(tg.x + tg.vx * 8 + jitter, 8, WORLD_W - 8), y: GROUND - 60, vx: 0, vy: 0, g: 0,
              w: HAZ_W[s.k] || 22, h: 120, dmg: s.dmg, hs: s.hs || 26, bs: 14, kb: s.kb, lvl: s.lvl, chip: s.chip,
              knockdown: s.knockdown && s.k !== 'bolt', slow: s.slow,
              life: s.warn + 18, hits: 99, every: 99999, hitT: {}, t: 0, warn: s.warn, isUlt: s.k === 'bolt', meter: 0
            });
          }
        }
        s.n--;
      }
      s.t++;
    }
    this.spawners = this.spawners.filter(s => s.n > 0);
  }

  updateProjectiles() {
    for (const p of this.projs) {
      p.t++; p.life--;
      if (p.g) p.vy += p.g;
      p.x += p.vx; p.y += p.vy;
      if (p.k === 'kunai' && p.vy > 0 && p.y >= GROUND - 3) { p.life = 0; this.ev('stick', { x: r1(p.x), y: GROUND }); }
      else if (p.ground && p.y >= GROUND - 4) { p.life = 0; this.ev('pop', { x: r1(p.x), y: GROUND - 2, k: p.k }); }
      if (p.x < -30 || p.x > WORLD_W + 30) p.life = 0;
    }
    // mermi çarpışması
    for (let i = 0; i < this.projs.length; i++) {
      const a = this.projs[i];
      if (a.life <= 0 || a.haz || a.isUlt) continue;
      for (let j = i + 1; j < this.projs.length; j++) {
        const b = this.projs[j];
        if (b.life <= 0 || b.team === a.team || b.haz || b.isUlt) continue;
        if (overlap(this.pbox(a), this.pbox(b))) {
          a.hits--; b.hits--;
          if (a.hits <= 0) a.life = 0;
          if (b.hits <= 0) b.life = 0;
          this.ev('clash', { x: r1((a.x + b.x) / 2), y: r1((a.y + b.y) / 2) });
        }
      }
    }
    for (const p of this.projs) {
      if (p.life <= 0 || p.hits <= 0) continue;
      if (p.haz && (p.t < p.warn || p.t > p.warn + 8)) continue;
      const att = this.f[p.o], box = this.pbox(p);
      for (const e of this.f) {
        if (e.team === p.team) continue;
        if (p.hitT[e.idx] != null && p.t - p.hitT[e.idx] < p.every) continue;
        if (!overlap(box, e.hurtbox())) continue;
        const mv = { dmg: p.dmg, hs: p.hs, bs: p.bs, kb: p.kb, lvl: p.lvl, slow: p.slow, freeze: p.freeze, knockdown: p.knockdown, chip: p.chip, isUlt: p.isUlt, meter: p.meter };
        const srcX = p.haz ? e.x + (att.x < e.x ? -1 : 1) : p.x - Math.sign(p.vx || 1) * 4;
        if (this.applyHit(att, e, mv, { proj: true, x: srcX, y: p.haz ? e.y - 30 : p.y, kind: p.k })) {
          p.hits--; p.hitT[e.idx] = p.t;
          if (p.hits <= 0) { p.life = 0; break; }
        }
      }
    }
    this.projs = this.projs.filter(p => p.life > 0);
  }

  pbox(p) {
    if (p.haz) return [p.x - p.w / 2, 0, p.w, GROUND];
    return [p.x - p.w / 2, p.y - p.h / 2, p.w, p.h];
  }

  constrain() {
    const list = this.f;
    const passable = f => f.state === 'seq' || f.state === 'locked' || f.state === 'ko' || f.dead;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (passable(a) || passable(b)) continue;
        if (Math.abs(a.y - b.y) >= 40) continue;
        const minD = a.hw + b.hw - 2;
        const dx = b.x - a.x, ad = Math.abs(dx);
        if (ad < minD) {
          const s = dx === 0 ? (a.facing === 1 ? 1 : -1) : Math.sign(dx);
          const tot = minD - ad;
          // ağır olan (boss) daha az itilir
          const wa = a.boss ? 0.15 : b.boss ? 0.85 : 0.5;
          a.x -= s * tot * wa; b.x += s * tot * (1 - wa);
        }
      }
    }
    // kamera: herkes ekranda kalmalı
    const alive = list.filter(f => !f.dead);
    if (alive.length >= 2) {
      const maxD = VIEW_W - 40;
      let lo = alive[0], hi = alive[0];
      for (const f of alive) { if (f.x < lo.x) lo = f; if (f.x > hi.x) hi = f; }
      const d = hi.x - lo.x;
      if (d > maxD) { const ex = (d - maxD) / 2; lo.x += ex; hi.x -= ex; }
    }
    for (const f of list) f.x = clamp(f.x, 10, WORLD_W - 10);
  }

  // ---------------------------------------------------------------- anlık görüntü
  snapshot() {
    return {
      ph: this.phase, pt: this.pt, rd: this.round, tl: this.timer < 0 ? -1 : Math.ceil(this.timer / 60),
      w: this.wins, sf: this.superFreeze, so: this.sfOwner, fr: this.frame,
      f: this.f.map(f => ({
        x: r1(f.x), y: r1(f.y), d: f.facing, hp: Math.round(f.hp), mh: f.maxHp, m: Math.floor(f.meter),
        s: f.state, st: f.st, mv: f.moveId, mp: f.phase(), mt: f.mt,
        sl: f.slow > 0 ? 1 : 0, iv: f.inv > 0 && f.inv < 900 ? 1 : 0, cb: f.crouchBlock ? 1 : 0,
        a: f.air ? 1 : 0, ice: f.iceT, c: f.comboShow, cd: Math.round(f.comboShowDmg), ct: f.comboT || 0,
        o: f.dead ? 1 : 0, rv: f.rv ? Math.min(100, Math.round(f.rv / 1.5)) : 0, fe: f.feathers, fp: f.featherPending ? 1 : 0,
        bp: f.enraged ? 1 : 0, sg: f.boss ? Math.round(f.stagger / f.staggerMax * 100) : 0
      })),
      p: this.projs.map(p => ({ i: p.id, k: p.k, x: r1(p.x), y: r1(p.y), o: p.o, t: p.t, d: p.vx >= 0 ? 1 : -1, w: p.warn || 0 })),
      e: this.events
    };
  }

  results() {
    return this.f.map(f => ({ dmg: f.stats.dmg, combo: f.stats.maxCombo, ults: f.stats.ults, hits: f.stats.hits, feathers: f.feathersUsed }));
  }
}

// ---------------------------------------------------------------- BOT (oyuncu yapay zekası)
function botInput(game, idx, mem) {
  const me = game.f[idx];
  const out = { held: 0, pressed: 0 };
  if (game.phase !== 'fight' || me.hp <= 0) return out;
  const op = me.tgt >= 0 ? game.f[me.tgt] : null;
  if (!op) return out;
  mem.t = (mem.t || 0) + 1;
  const rnd = Math.random;
  const toward = x => (x > me.x ? B.R : B.L), away = x => (x > me.x ? B.L : B.R);

  // düşen takım arkadaşını dirilt
  if (game.mode === 'story') {
    const down = game.f.find(a => a !== me && a.team === me.team && a.hp <= 0 && a.state === 'ko' && !a.featherPending);
    if (down && Math.abs(op.x - down.x) > 50) {
      if (Math.abs(down.x - me.x) > 12) { out.held = toward(down.x); return out; }
      out.held = B.D; return out;
    }
  }

  // tehlike işaretinden kaç
  const haz = game.projs.find(p => p.haz && p.team !== me.team && p.t < p.warn && Math.abs(p.x - me.x) < p.w / 2 + me.hw + 4);
  if (haz) { out.held = haz.x > me.x ? B.L : B.R; if (me.x < 30) out.held = B.R; if (me.x > 450) out.held = B.L; return out; }

  const dx = op.x - me.x;
  const dist = Math.abs(dx) - (op.hw - 10);
  const fwd = toward(op.x), back = away(op.x);
  if (mem.block > 0) { mem.block--; out.held = back | (mem.low ? B.D : 0); return out; }
  if (mem.cool > 0) mem.cool--;

  const oppAttacking = op.state === 'attack' && op.phase() <= 1 && op.move;
  const projComing = game.projs.some(p => !p.haz && p.team !== me.team && Math.abs(p.x - me.x) < 70 && Math.sign(me.x - p.x) === Math.sign(p.vx || 0.0001));
  const blockChance = op.boss ? 0.45 : 0.35;
  if ((oppAttacking && dist < (op.boss ? 90 : 70) && rnd() < blockChance) || (projComing && rnd() < 0.25)) {
    const m = op.move;
    if (op.boss && m && (m.beamY)) { mem.block = 20; mem.low = true; out.held = B.D; return out; }
    if (op.boss && m && (m.leap || m.lvl === 'low') && rnd() < 0.6) { out.held = B.U | back; return out; }
    mem.block = 14; mem.low = m && m.lvl === 'low';
    if (projComing && rnd() < 0.3) { out.held = B.U | fwd; mem.block = 0; return out; }
    out.held = back | (mem.low ? B.D : 0); return out;
  }
  if (me.state === 'attack' && me.connected && rnd() < 0.5) { out.pressed = rnd() < 0.5 ? B.S1 : B.S2; return out; }
  if (mem.cool > 0) { out.held = mem.hold || 0; return out; }

  if (me.meter >= 100 && dist < 150 && rnd() < 0.05) { out.pressed = B.ULT; mem.cool = 20; return out; }
  if (dist > 150) {
    if (rnd() < 0.03 && me.specials.s1.proj) { out.pressed = B.S1; mem.cool = 25; return out; }
    if (rnd() < 0.008) { out.held = B.U | fwd; mem.hold = B.U | fwd; mem.cool = 8; return out; }
    out.held = fwd; return out;
  }
  if (dist > 42) {
    if (op.air && dist < 70 && rnd() < 0.15) { out.held = B.D; out.pressed = B.HP; mem.cool = 12; return out; }
    if (rnd() < 0.02) { out.pressed = rnd() < 0.5 ? B.S1 : B.S2; mem.cool = 20; return out; }
    if (rnd() < 0.01) { out.held = B.U | fwd; mem.hold = B.U | fwd; mem.cool = 10; return out; }
    out.held = rnd() < 0.85 ? fwd : back; mem.hold = out.held; mem.cool = 6; return out;
  }
  const r = rnd();
  if (r < 0.07) { out.pressed = B.LP; mem.cool = 6; }
  else if (r < 0.11) { out.pressed = B.HP; mem.cool = 14; }
  else if (r < 0.15) { out.pressed = B.K; mem.cool = 14; }
  else if (r < 0.18) { out.held = B.D; out.pressed = B.K; mem.hold = B.D; mem.cool = 14; }
  else if (r < 0.2) { out.held = back; mem.hold = back; mem.cool = 18; }
  else if (r < 0.215) { out.pressed = B.S2; mem.cool = 20; }
  return out;
}

const api = { Game, botInput, B, WORLD_W, VIEW_W, GROUND, NORMALS, SPECIALS, BOSS_MOVES };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.Sim = api;
})(typeof window !== 'undefined' ? window : globalThis);
