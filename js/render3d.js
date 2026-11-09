/* PİKSEL ARENA — 3D grafik motoru (Three.js). Oyun mantığı değişmez; bu dosya sadece çizer. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildFighter, applyPose, setEmissive, glowMat } from './r3d/character.js';
import { P, ANIMS, getPose } from './r3d/pose.js';
import { buildStage } from './r3d/stages.js';
import { Particles, Rings, LightPool, makeProj, updateProj, makeBeam, PROJ_LIGHT } from './r3d/fx.js';

const GD = window.GameData;
const VW = 384, VH = 216, WORLD_W = 480, GROUND = 196;
const FONT = '"Teko", "Rajdhani", "Arial Narrow", Arial, sans-serif';
const SLOT_COLORS = ['#ffd23f', '#7df9ff', '#ff6bd0'];
const BEAMS = { kaan: { y: 36, pal: ['#ff3d00', '#ff9100', '#fff3c4'] }, cin: { y: 47, pal: ['#ff3d00', '#ff9100', '#fff3c4'] }, imparator: { y: 50, pal: ['#7a1aff', '#ff1e56', '#ffd0dc'] } };
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const rgba = (h, a) => { const [r, g, b] = hex2rgb(h); return `rgba(${r},${g},${b},${a})`; };
const W = (x, y, z) => new THREE.Vector3(x, GROUND - y, z || 0);

const R = {
  ready: false, renderer: null, scene: null, camera: null, composer: null, hud: null, hctx: null,
  S: 2, offX: 0, offY: 0, tick: 0, players: [], chars: [], F: [], mode: 'duel', story: null, bossIdx: -1,
  stage: null, stageCache: {}, texts: [], banner: null, announce: null, bubbles: [], bossCall: null, fflash: [],
  shake: 0, flash: 0, cam: { x: 240, y: 40, d: 360 }, projV: new Map(), beams: new Map(), extras: new Map(), matchWins: 2
};

// ------------------------------------------------------------ kurulum
R.init = function (canvas, hud) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 0.95;
  r.outputColorSpace = THREE.SRGBColorSpace;
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  R.renderer = r;
  R.scene = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r);
  R.scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  R.camera = new THREE.PerspectiveCamera(30, 16 / 9, 2, 6000);
  R.composer = new EffectComposer(r);
  R.composer.addPass(new RenderPass(R.scene, R.camera));
  R.bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.42, 0.4, 1.05);
  R.composer.addPass(R.bloom);
  R.composer.addPass(new OutputPass());
  R.add = new Particles(2400, true); R.dust = new Particles(1600, false);
  R.scene.add(R.add.pts, R.dust.pts);
  R.rings = new Rings(R.scene);
  R.pool = new LightPool(R.scene, 6);
  R.fighterRoot = new THREE.Group(); R.scene.add(R.fighterRoot);
  R.fxRoot = new THREE.Group(); R.scene.add(R.fxRoot);
  R.hud = hud; R.hctx = hud.getContext('2d');
  R.ready = true;
  R.touch = !!(window.Touch && window.Touch.isTouch);
  let q = R.touch ? 1 : 2; try { const v = localStorage.getItem('pikselArena.quality'); if (v != null) q = +v; } catch (e) { }
  R.setQuality(q, true);
  R.resize();
};
// ------------------------------------------------------------ grafik kalitesi (otomatik düşer, G tuşu ile değişir)
const QNAMES = ['DÜŞÜK', 'ORTA', 'YÜKSEK'];
R.q = 2; R.ft = []; R.lastT = 0; R.autoQ = true;
R.setQuality = function (q, silent) {
  R.q = clamp(q, 0, 2);
  const dpr = window.devicePixelRatio || 1;
  R.renderer.setPixelRatio(R.q === 2 ? Math.min(dpr, R.touch ? 1.25 : 1.5) : R.q === 1 ? 1 : 0.75);
  R.bloomOn = R.q === 2 || (R.q === 1 && !R.touch);
  R.shadowSize = R.q === 2 ? 2048 : 1024;
  R.renderer.shadowMap.type = R.q === 2 ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  R.renderer.shadowMap.needsUpdate = true;
  for (const S of Object.values(R.stageCache)) applyShadow(S);
  try { localStorage.setItem('pikselArena.quality', String(R.q)); } catch (e) { }
  R.ft = [];
  if (!silent) R.qNote = { text: 'Grafik: ' + QNAMES[R.q], life: 120 };
  R.resize();
};
function applyShadow(S) {
  if (!S || !S.key) return;
  if (S.key.shadow.mapSize.x !== R.shadowSize) { S.key.shadow.mapSize.set(R.shadowSize, R.shadowSize); if (S.key.shadow.map) { S.key.shadow.map.dispose(); S.key.shadow.map = null; } }
}
R.cycleQuality = function () { R.autoQ = false; R.setQuality((R.q + 2) % 3); };
function perf() {
  const now = performance.now();
  if (R.lastT) { const dt = now - R.lastT; if (dt < 500) R.ft.push(dt); }
  R.lastT = now;
  if (R.ft.length >= 120) {
    const avg = R.ft.reduce((a, b) => a + b, 0) / R.ft.length;
    R.ft = [];
    if (R.autoQ && avg > 24 && R.q > 0) R.setQuality(R.q - 1);
  }
}
function present() { if (R.bloomOn) R.composer.render(); else R.renderer.render(R.scene, R.camera); }
R.resize = function () {
  if (!R.ready) return;
  const w = window.innerWidth, h = window.innerHeight, dpr = window.devicePixelRatio || 1;
  R.renderer.setSize(w, h, false);
  R.composer.setSize(w, h);
  R.camera.aspect = w / h; R.camera.updateProjectionMatrix();
  R.hud.width = Math.floor(w * dpr); R.hud.height = Math.floor(h * dpr);
  const s = Math.min(R.hud.width / VW, R.hud.height / VH);
  R.S = s; R.offX = Math.floor((R.hud.width - VW * s) / 2); R.offY = Math.floor((R.hud.height - VH * s) / 2);
  const ps = R.renderer.getDrawingBufferSize(new THREE.Vector2());
  const scale = ps.y / (2 * Math.tan(THREE.MathUtils.degToRad(R.camera.fov / 2)));
  R.add.mat.uniforms.uScale.value = scale; R.dust.mat.uniforms.uScale.value = scale;
};

function setStage(id) {
  if (R.stage && R.stage.id === id) return;
  if (R.stage) R.scene.remove(R.stage.group);
  const S = R.stageCache[id] || (R.stageCache[id] = buildStage(id));
  R.stage = S; R.scene.add(S.group); applyShadow(S);
  R.scene.fog = new THREE.Fog(S.fog[0], S.fog[1], S.fog[2]);
  R.add.clear(); R.dust.clear(); R.rings.clear();
}

function clearFighters() {
  for (const F of R.F) R.fighterRoot.remove(F.root);
  R.F = [];
  for (const v of R.projV.values()) R.fxRoot.remove(v.obj); R.projV.clear();
  for (const b of R.beams.values()) R.fxRoot.remove(b.obj); R.beams.clear();
  for (const e of R.extras.values()) for (const o of Object.values(e)) if (o && o.isObject3D) R.fxRoot.remove(o);
  R.extras.clear();
}

R.setMatch = function (players, settings, story) {
  R.players = players;
  R.chars = players.map(p => GD.getChar(p.char));
  R.mode = settings.mode || 'duel';
  R.story = story || null;
  R.bossIdx = players.findIndex(p => p.boss);
  hideMenu();
  clearFighters();
  setStage(settings.stage || 'istanbul');
  R.F = players.map((p, i) => { const F = buildFighter(R.chars[i], p.custom); R.fighterRoot.add(F.root); return F; });
  R.texts = []; R.banner = null; R.announce = null; R.bubbles = []; R.bossCall = null;
  const n = players.length;
  R.fflash = new Array(n).fill(0);
  R.hudSt = { trail: new Array(n).fill(null), hpPrev: new Array(n).fill(null), comboT: new Array(n).fill(0) };
  R.cam = { x: 240, y: 40, d: 380 };
  R.lastFr = -1;
};
const colorOf = i => R.players[i] && R.players[i].boss ? '#ff4d5e' : SLOT_COLORS[(R.players[i] && R.players[i].slot >= 0 ? R.players[i].slot : i) % 3];
const nm = i => (R.players[i] ? R.players[i].name : '?').toUpperCase();
function floatText(x, y, text, col, size) { R.texts.push({ x, y, text, col, size: size || 7, life: 50 }); }

// ------------------------------------------------------------ olaylar
R.event = function (e, snap) {
  const P_ = R.players, C = R.chars, A = R.add, D = R.dust;
  const at = (x, y, z) => W(x, y, z);
  switch (e.t) {
    case 'hit': {
      const k = e.k;
      const cols = k === 'fire' || k === 'meteor' ? ['#fff3b0', '#ff9a2e', '#ff5a1f'] : ['ice', 'icewave', 'shard', 'icicle'].includes(k) ? ['#ffffff', '#bff6ff', '#5fc8e8'] : k === 'orb' || k === 'bolt' ? ['#ffffff', '#7df9ff', '#ffe14d'] : k === 'shadow' || k === 'darkorb' ? ['#f0d0ff', '#b366ff', '#ff1e56'] : ['#ffffff', '#fff3b0', '#ffd23f', '#ff8a1e'];
      const p = at(e.x, e.y, 8);
      A.burst(p.x, p.y, p.z, 10 + e.h * 12, cols, 2.4 + e.h * 1.2, 16 + e.h * 5, 2.2 + e.h * 0.8, { k: 2.2, g: 0.06, drag: 0.9 });
      A.emit({ x: p.x, y: p.y, z: p.z + 2, life: 6, size: 7 + e.h * 4, color: '#fff6d0', k: 1.4, grow: 0.8 });
      R.rings.spawn(p, '#ffffff', 2, 9 + e.h * 6, 9, false, 1.4);
      R.shake = Math.max(R.shake, 1.2 + e.h * 2);
      R.fflash[e.i] = 5;
      floatText(e.x, e.y - 8, String(e.d), e.h >= 2 ? '#ffd23f' : '#ffffff', e.h >= 2 ? 9 : 7);
      break;
    }
    case 'block': { const p = at(e.x, e.y, 8); A.burst(p.x, p.y, p.z, 10, ['#9fd8ff', '#ffffff'], 1.8, 12, 2, { k: 2 }); R.rings.spawn(p, '#9fd8ff', 3, 11, 9, false, 2); break; }
    case 'ko': R.flash = 14; R.shake = 9; break;
    case 'ult': R.banner = { i: e.i, t: 0, name: C[e.i].moves.ult.name, ch: C[e.i], cu: P_[e.i].custom, img: null }; R.flash = 5; break;
    case 'teleport': { const p = at(e.x, e.y - 26, 0); D.burst(p.x, p.y, p.z, 26, ['#2a1a40', '#4a2a7a', '#6a3a9a'], 1.2, 30, 9, { up: 0.3, grow: 1.4, drag: 0.94 }); A.burst(p.x, p.y, p.z, 10, ['#b366ff'], 1.6, 16, 2.5, { k: 2 }); break; }
    case 'land': { const p = at(e.x, 196, 0); D.burst(p.x, 1, 0, 14, ['#9a8a7a', '#7a6a5a'], 1.6, 26, 5, { flat: true, up: 0.4, grow: 1.4, g: 0.02 }); R.shake = Math.max(R.shake, 2.5); break; }
    case 'quake': {
      R.shake = 11;
      for (let i = 0; i < 4; i++) R.rings.spawn(W(e.x, 195.5, 0), '#ffb26b', 4 + i * 8, 100 + i * 30, 26 + i * 4, true, 2);
      D.burst(e.x, 2, 0, 50, ['#7a5a3a', '#a0825a', '#5a4a3a'], 4, 40, 10, { up: 1.5, g: 0.08, grow: 0.8 });
      A.burst(e.x, 4, 0, 20, ['#ffb26b', '#ffd27a'], 3, 20, 3, { k: 2, up: 1 });
      break;
    }
    case 'freeze': { const p = at(e.x, e.y - 24); A.burst(p.x, p.y, p.z, 30, ['#ffffff', '#bff6ff', '#5fc8e8'], 2, 26, 2.5, { k: 2 }); break; }
    case 'shatter': { const p = at(e.x, e.y); A.burst(p.x, p.y, p.z, 60, ['#ffffff', '#bff6ff', '#5fc8e8'], 4.5, 36, 3, { k: 2.2, g: 0.15 }); D.burst(p.x, p.y, p.z, 24, ['#dffaff', '#ffffff'], 3, 40, 4, { g: 0.2 }); R.shake = 8; R.flash = 4; break; }
    case 'clash': { const p = at(e.x, e.y, 6); A.burst(p.x, p.y, p.z, 24, ['#ffffff', '#ffe14d'], 3, 18, 3, { k: 2.4 }); R.rings.spawn(p, '#ffffff', 2, 22, 12, false, 2.5); break; }
    case 'counter': floatText(e.x, e.y - 14, 'KARŞI!', '#9ff3ff', 10); { const p = at(e.x, e.y); A.burst(p.x, p.y, p.z, 26, ['#ffffff', '#9ff3ff'], 3.2, 22, 2.5, { k: 2 }); } break;
    case 'armor': floatText(e.x, e.y - 14, 'ZIRH', '#ffb26b', 9); R.rings.spawn(at(e.x, e.y, 6), '#ffb26b', 4, 18, 10, false, 2); break;
    case 'stick': D.burst(e.x, 1, 0, 6, ['#8a7a6a'], 0.8, 14, 3, { up: 0.6, g: 0.05 }); break;
    case 'pop': {
      const cols = { bottle: ['#3f8f4a', '#bff0c4', '#c9a227'], fire: ['#ff9a2e', '#ff5a1f', '#fff3b0'], shard: ['#ffffff', '#bff6ff'], kunai: ['#9a8a7a'], darkorb: ['#ff1e56', '#b366ff'] }[e.k] || ['#ffffff'];
      A.burst(e.x, 3, 0, 16, cols, 2, 18, 2.4, { k: e.k === 'bottle' ? 1.2 : 2, up: 1, g: 0.1 }); break;
    }
    case 'djump': R.rings.spawn(at(e.x, e.y, 0), '#ffffff', 2, 12, 10, true, 1.5); break;
    case 'round':
      if (R.story) { R.announce = { text: R.story.title.toUpperCase(), t: 0, dur: 100, col: '#ffffff', small: true }; if (R.bossIdx >= 0) R.bubbles.push({ slot: R.bossIdx, text: R.story.quote, life: 150 }); }
      else R.announce = { text: `RAUNT ${e.n}`, t: 0, dur: 70, col: '#ffffff' };
      break;
    case 'fight': R.announce = { text: R.story ? 'SAVAŞ!' : 'DÖVÜŞ!', t: 0, dur: 45, col: '#ffd23f', big: true }; break;
    case 'timeup': R.announce = { text: 'SÜRE DOLDU', t: 0, dur: 80, col: '#ff8a8a' }; break;
    case 'roundWin': {
      if (R.mode === 'story') { R.announce = e.w === 0 ? { text: 'ZAFER!', t: 0, dur: 140, col: '#ffd23f', big: true } : { text: 'YENİLDİNİZ...', t: 0, dur: 140, col: '#ff5a5a' }; break; }
      const name = e.w === -1 ? 'BERABERE' : `${nm(e.w)} KAZANDI`;
      R.announce = { text: e.final ? (e.mw === -1 ? 'MAÇ BERABERE!' : `${nm(e.mw)} MAÇI ALDI!`) : name, t: 0, dur: 140, col: '#ffd23f' };
      break;
    }
    case 'special': {
      const f = snap && snap.f[e.i];
      if (f && (e.m === 'quake' || C[e.i].id === 'demir' && e.m === 's2')) D.burst(f.x, 1, 0, 14, ['#8a7a6a'], 1.6, 24, 7, { up: 0.5, g: 0.03, grow: 1 });
      break;
    }
    case 'bossmove': { const mv = C[e.i].moves[e.m]; if (mv) R.bossCall = { name: mv.name, life: 80 }; break; }
    case 'enrage': R.announce = { text: `${nm(e.i)} ÖFKELENDİ!`, t: 0, dur: 90, col: '#ff3b3b', small: true }; R.shake = 9; R.flash = 6; break;
    case 'stagger': floatText(e.x, e.y - 6, 'SERSEMLEDİ!', '#ffe14d', 10); { const p = at(e.x, e.y); A.burst(p.x, p.y, p.z, 26, ['#ffe14d', '#ffffff'], 2.5, 24, 2.5, { k: 2 }); } break;
    case 'out':
      R.announce = R.mode === 'story' ? { text: `${nm(e.i)} DÜŞTÜ! YANINA GİT, ↓ BASILI TUT`, t: 0, dur: 110, col: '#ff8a8a', small: true } : { text: `${nm(e.i)} ELENDİ!`, t: 0, dur: 80, col: '#ff8a8a', small: true };
      break;
    case 'revive': floatText(e.x, e.y - 40, 'DİRİLDİ!', '#4dff9a', 10); { const p = at(e.x, e.y - 20); A.burst(p.x, p.y, p.z, 40, ['#ffd23f', '#4dff9a', '#ffffff'], 2.5, 34, 3, { k: 2, up: 0.8 }); R.rings.spawn(W(e.x, 195.5), '#4dff9a', 4, 34, 22, true, 2); } break;
    case 'feather': { const f = snap && snap.f[e.i]; if (f) { floatText(f.x, f.y - 50, 'ANKA TÜYÜ!', '#ff9a2e', 9); A.burst(f.x, GROUND - f.y + 20, 0, 40, ['#ff5a1f', '#ffd23f', '#ff9a2e'], 2.2, 46, 3.5, { k: 2.2, up: 0.8 }); } break; }
  }
};
R.taunt = function (fi, text) { if (fi >= 0) R.bubbles.push({ slot: fi, text, life: 110 }); };

// ------------------------------------------------------------ kamera
function updateCamera(snap) {
  const fs = snap.f;
  const live = fs.filter(f => !f.o);
  const xs = (live.length ? live : fs).map(f => f.x);
  let lo = Math.min(...xs), hi = Math.max(...xs);
  const aspect = R.camera.aspect, tanH = Math.tan(THREE.MathUtils.degToRad(R.camera.fov / 2));
  let want = clamp(hi - lo + 170, 230, 420);
  let d = want / (2 * tanH * Math.max(1.2, aspect));
  let cx = (lo + hi) / 2;
  let ty = 36 + (d - 220) * 0.07;
  if (snap.sf > 0 && snap.so >= 0 && fs[snap.so]) { const f = fs[snap.so]; cx = f.x + f.d * 12; d = 150; ty = 34 + (GROUND - f.y) * 0.6; }
  else if (snap.ph === 'ko' && snap.pt > 60) d *= 0.85;
  const halfW = d * tanH * aspect;
  cx = clamp(cx, Math.min(240, halfW - 40), Math.max(240, WORLD_W - halfW + 40));
  const c = R.cam, k = snap.sf > 0 ? 0.18 : 0.08;
  c.x = lerp(c.x, cx, k); c.d = lerp(c.d, d, k); c.y = lerp(c.y, ty, k);
  let sx = 0, sy = 0;
  if (R.shake > 0) { sx = (Math.random() - 0.5) * R.shake * 0.9; sy = (Math.random() - 0.5) * R.shake * 0.9; R.shake *= 0.86; if (R.shake < 0.2) R.shake = 0; }
  R.camera.position.set(c.x + sx, c.y + 14 + c.d * 0.09 + sy, c.d);
  R.camera.lookAt(c.x + sx * 0.5, c.y, 0);
}

// ------------------------------------------------------------ dövüşçü efektleri
function fighterFx(i, f, F, snap, t) {
  const ch = R.chars[i], cu = R.players[i].custom, A = R.add;
  const anim = f.s === 'attack' ? GD.moveAnim(ch.id, f.mv) : '';
  const base = W(f.x, f.y, 0);
  const hh = 50 * ch.look.height;
  const isBoss = !!ch.boss, aura = cu.aura || ch.look.glow;
  // vurulma parlaması / ton
  let ec = null, ek = 0;
  if (R.fflash[i] > 0) { ec = '#ffffff'; ek = R.fflash[i] / 5 * (isBoss ? 0.35 : 0.55); R.fflash[i]--; }
  else if (isBoss && f.s === 'attack' && f.mp === 0) { ec = '#ff1a1a'; ek = 0.15 + 0.15 * Math.sin(t * 0.5); }
  else if (f.sl) { ec = '#3aa8ff'; ek = 0.22; }
  else if (f.m >= 100 || (isBoss && f.bp)) { ec = isBoss ? '#ff1e56' : aura; ek = 0.06 + 0.04 * Math.sin(t * 0.2); }
  setEmissive(F, ec, ek);
  // görünürlük titremesi
  let vis = true;
  if (f.iv && (f.s === 'getup' || f.s === 'idle' || f.s === 'walk')) vis = t % 4 < 2;
  if (anim === 'vanish' && f.mp === 0) vis = Math.random() > f.mt / 12;
  if (f.s === 'seq') vis = t % 3 !== 0;
  F.root.visible = vis;
  // aura
  const center = base.clone(); center.y += hh * 0.55;
  if (f.m >= 100 || (snap.sf > 0 && snap.so === i) || (isBoss && f.bp)) {
    const c = isBoss && f.bp ? '#ff1e56' : aura;
    if (t % 3 === 0) A.emit({ x: base.x + (Math.random() - 0.5) * 16 * ch.look.build, y: base.y + Math.random() * hh, z: (Math.random() - 0.5) * 10, vy: 0.6 + Math.random() * 0.6, life: 24, size: 1.6 + Math.random() * 1.6, color: c, k: 1.6 });
    R.pool.use(center, c, 25, 70);
  }
  if (F.flameLight) R.pool.use(base.clone().setY(base.y + hh + 6), F.flameLight, 60, 120);
  if (f.sl && t % 4 === 0) A.emit({ x: base.x + (Math.random() - 0.5) * 16, y: base.y + Math.random() * hh, z: 6, vy: -0.2, life: 30, size: 2, color: '#dff6ff', k: 1.5 });
  // izler
  if ((anim === 'rush' || anim === 'charge' || anim === 'tornado' || anim === 'spin' || anim === 'uppercut' || anim === 'flip') && f.mp === 1) {
    for (let k = 0; k < 3; k++) A.emit({ x: base.x + (Math.random() - 0.5) * 14, y: base.y + Math.random() * hh, z: (Math.random() - 0.5) * 8, vx: -f.d * 0.8, life: 16, size: 4, color: anim === 'charge' ? '#ff4d2e' : aura, k: 1.8 });
  }
  if (anim === 'tornado' && f.mp === 1) for (let k = 0; k < 4; k++) { const a = t * 0.5 + k * 1.57; A.emit({ x: base.x + Math.cos(a) * 22, y: base.y + 5 + k * 12, z: Math.sin(a) * 22, vy: 0.6, life: 14, size: 4, color: k % 2 ? '#ff3ea5' : '#00e5ff', k: 2 }); }
  if (anim === 'field' && f.mp === 1) { for (let k = 0; k < 6; k++) { const a = Math.random() * 6.28, b = Math.random() * 3.14; A.emit({ x: center.x + Math.cos(a) * Math.sin(b) * 26, y: center.y + Math.cos(b) * 26, z: Math.sin(a) * Math.sin(b) * 26, life: 8, size: 3, color: k % 2 ? '#ffffff' : '#7df9ff', k: 3 }); } R.pool.use(center, '#7df9ff', 80, 120); }
  if ((anim === 'storm') || (anim === 'fireball' || anim === 'cast' || anim === 'icecast') && f.mp === 0) {
    const col = ch.id === 'kaan' || ch.id === 'cin' ? '#ff9a2e' : ch.id === 'volt' ? '#7df9ff' : ch.id === 'imparator' || ch.id === 'karabasan' ? '#ff1e56' : '#bff6ff';
    const hand = W(f.x + f.d * 10, f.y - hh * 0.6, 4);
    A.emit({ x: hand.x + (Math.random() - 0.5) * 6, y: hand.y + (Math.random() - 0.5) * 6, z: hand.z, vy: 0.5, life: 14, size: 4, color: col, k: 2.4 });
    R.pool.use(hand, col, 40, 80);
  }
  // Ayaz karşı saldırı kalkanı
  const ex = R.extras.get(i) || (R.extras.set(i, {}), R.extras.get(i));
  if (anim === 'counter' && f.mp === 1) {
    if (!ex.shield) {
      const g = new THREE.Group();
      const m = new THREE.MeshStandardMaterial({ color: '#cff8ff', emissive: '#3aa8d8', emissiveIntensity: 0.9, transparent: true, opacity: 0.75, roughness: 0.05 });
      for (let k = 0; k < 6; k++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), m); c.position.set(0, 8 + k * 8, (k % 2 ? 4 : -4)); c.scale.set(2, 7, 3); g.add(c); }
      ex.shield = g; R.fxRoot.add(g);
    }
    ex.shield.visible = true; ex.shield.position.set(f.x + f.d * 15, 0, 0);
    R.pool.use(center, '#9ff3ff', 50, 80);
  } else if (ex.shield) ex.shield.visible = false;
  // buz kalıbı
  if (f.s === 'iced' && f.ice > 0) {
    if (!ex.ice) { ex.ice = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#bfefff', emissive: '#2a7aa8', emissiveIntensity: 0.4, transparent: true, opacity: 0.55, roughness: 0.02, metalness: 0.1, envMapIntensity: 2 })); R.fxRoot.add(ex.ice); }
    const bw = 10 * ch.look.build + 7;
    ex.ice.visible = true; ex.ice.scale.set(bw * 2, hh + 8, bw * 1.6); ex.ice.position.set(f.x, (hh + 8) / 2, 0);
  } else if (ex.ice) ex.ice.visible = false;
  // ışın
  const bm = BEAMS[ch.id];
  if (bm && anim === 'beam') {
    let b = R.beams.get(i);
    if (!b) { b = makeBeam(bm.pal); R.beams.set(i, b); R.fxRoot.add(b.obj); }
    const hand = W(f.x + f.d * 14, f.y - bm.y, 2);
    b.obj.visible = true; b.obj.position.copy(hand); b.obj.scale.x = f.d;
    if (f.mp === 0) {
      const s = Math.min(9, 2 + f.mt / 4);
      b.outer.visible = b.mid.visible = b.core.visible = false; b.ball.scale.setScalar(s * 0.7 * (1 + 0.1 * Math.sin(t)));
      A.emit({ x: hand.x + (Math.random() - 0.5) * 30, y: hand.y + (Math.random() - 0.5) * 30, z: (Math.random() - 0.5) * 20, vx: 0, life: 10, size: 3, color: bm.pal[1], k: 2.5 });
      R.pool.use(hand, bm.pal[1], 50, 120);
    } else if (f.mp === 1) {
      const grow = Math.min(1, f.mt / 6), rad = 7.5 * grow + Math.sin(t * 0.8) * 0.8;
      b.outer.visible = b.mid.visible = b.core.visible = true;
      b.outer.scale.set(560, rad * 1.4, rad * 1.4); b.mid.scale.set(560, rad * 0.85, rad * 0.85); b.core.scale.set(560, rad * 0.35, rad * 0.35);
      b.ball.scale.setScalar(rad * 1.2);
      for (let k = 0; k < 2; k++) A.emit({ x: hand.x + f.d * Math.random() * 400, y: hand.y + (Math.random() - 0.5) * rad * 2.4, z: (Math.random() - 0.5) * rad * 2, vx: f.d * 3, life: 12, size: 2.5, color: k % 2 ? bm.pal[1] : bm.pal[0], k: 1.6 });
      R.pool.use(hand, bm.pal[1], 35, 160);
      R.shake = Math.max(R.shake, 1.5);
    } else b.obj.visible = false;
  } else { const b = R.beams.get(i); if (b) b.obj.visible = false; }
}

// ------------------------------------------------------------ ana çizim
R.frame = function (snap, myIdx) {
  if (!R.ready || !snap) return;
  const t = ++R.tick;
  const fs = snap.f;
  R.pool.begin();
  updateCamera(snap);
  fs.forEach((f, i) => {
    const F = R.F[i]; if (!F) return;
    const pose = getPose(f, R.chars[i].id);
    F.root.position.set(f.x, GROUND - f.y, 0);
    applyPose(F, pose, t, f.d, f.s === 'walk' || (f.s === 'attack' && f.mp === 1) ? 1 : 0);
    fighterFx(i, f, F, snap, t);
  });
  // mermiler
  const seen = new Set();
  for (const p of snap.p) {
    seen.add(p.i);
    let v = R.projV.get(p.i);
    if (!v) { v = makeProj(p.k); R.projV.set(p.i, v); R.fxRoot.add(v.obj); }
    updateProj(v, p, t, { add: R.add, dust: R.dust });
    const lc = PROJ_LIGHT[p.k];
    if (lc) { const haz = p.w > 0; if (!haz) R.pool.use(W(p.x, p.y, 6), lc, 70, 120); else if (p.t >= p.w && p.t < p.w + 10) R.pool.use(W(p.x, 170, 10), lc, 200, 220); }
  }
  for (const [id, v] of R.projV) if (!seen.has(id)) { R.fxRoot.remove(v.obj); R.projV.delete(id); }
  // ortam parçacıkları
  weather(t);
  if (snap.sf > 0) { R.renderer.toneMappingExposure = 0.6; } else R.renderer.toneMappingExposure = lerp(R.renderer.toneMappingExposure, 0.95, 0.15);
  R.pool.end();
  for (const u of R.stage.updates) u(t, R.camera);
  R.add.update(); R.dust.update(); R.rings.update(R.camera);
  present(); perf();
  drawHUD(snap, myIdx, t);
};

function weather(t) {
  const S = R.stage, cx = R.camera.position.x;
  if (!S || !S.weather) return;
  if (S.weather === 'snow') for (let k = 0; k < 2; k++) R.dust.emit({ x: cx - 260 + Math.random() * 520, y: 200, z: -120 + Math.random() * 280, vx: 0.15, vy: -0.45 - Math.random() * 0.3, life: 420, size: 1.4 + Math.random() * 1.6, color: '#ffffff', drag: 1, wob: 0.02 });
  if (S.weather === 'petals' && t % 2 === 0) R.dust.emit({ x: cx - 260 + Math.random() * 520, y: 180, z: -120 + Math.random() * 260, vx: -0.3, vy: -0.35, life: 480, size: 2.2, color: Math.random() < 0.5 ? '#ffb0d0' : '#ff8fbf', drag: 1, wob: 0.03 });
  if (S.weather === 'embers' && t % 2 === 0) R.add.emit({ x: cx - 260 + Math.random() * 520, y: Math.random() * 20, z: -100 + Math.random() * 200, vx: 0.1, vy: 0.4 + Math.random() * 0.4, life: 300, size: 1.6, color: Math.random() < 0.5 ? '#ff7a00' : '#ff1e56', k: 2.5, drag: 1, wob: 0.02 });
  if (S.weather === 'splash' && t % 2 === 0) R.dust.emit({ x: cx - 200 + Math.random() * 400, y: 0.5, z: -60 + Math.random() * 180, vy: 0.4, life: 10, size: 2, color: '#a0b0ff', g: 0.06 });
}

// ------------------------------------------------------------ HUD
function txt(ctx, s, x, y, size, col, align, outline) {
  size *= 1.3;
  ctx.font = `600 ${Math.round(size)}px ${FONT}`;
  ctx.textAlign = align || 'left'; ctx.textBaseline = 'middle';
  if (outline !== false) { ctx.lineWidth = Math.max(2, size / 5); ctx.strokeStyle = 'rgba(5,3,12,0.9)'; ctx.lineJoin = 'round'; ctx.strokeText(s, x, y); }
  ctx.fillStyle = col; ctx.fillText(s, x, y);
}
const _v = new THREE.Vector3();
function proj(x, y, z) {
  _v.set(x, GROUND - y, z || 0).project(R.camera);
  const px = (_v.x + 1) / 2 * R.hud.width, py = (1 - _v.y) / 2 * R.hud.height;
  return { x: (px - R.offX) / R.S, y: (py - R.offY) / R.S };
}
function bar(ctx, X, Y, S, x, y, w, h, slant) {
  ctx.beginPath(); ctx.moveTo(X(x + (slant > 0 ? slant : 0)), Y(y)); ctx.lineTo(X(x + w + (slant < 0 ? slant : 0)), Y(y));
  ctx.lineTo(X(x + w - (slant > 0 ? 0 : 0)), Y(y + h)); ctx.lineTo(X(x), Y(y + h)); ctx.closePath();
}
function hpBar(ctx, X, Y, S, i, f, bx, by, bw, bh, right, t, opts) {
  const H = R.hudSt; opts = opts || {};
  const pct = clamp(f.hp / f.mh, 0, 1);
  if (H.trail[i] == null || pct > H.trail[i]) { H.trail[i] = pct; H.hpPrev[i] = pct; }
  if (pct < H.hpPrev[i]) { H.hpPrev[i] = pct; H.comboT[i] = 40; }
  if (H.comboT[i] > 0) H.comboT[i]--; else H.trail[i] += (pct - H.trail[i]) * 0.08;
  ctx.save();
  ctx.fillStyle = 'rgba(5,3,12,0.75)'; ctx.fillRect(X(bx - 1.2), Y(by - 1.2), (bw + 2.4) * S, (bh + 2.4) * S);
  ctx.strokeStyle = opts.border || 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1, S * 0.4); ctx.strokeRect(X(bx - 1.2), Y(by - 1.2), (bw + 2.4) * S, (bh + 2.4) * S);
  ctx.fillStyle = '#2a0c18'; ctx.fillRect(X(bx), Y(by), bw * S, bh * S);
  const trW = bw * H.trail[i], curW = bw * pct;
  ctx.fillStyle = '#ff4d4d'; ctx.fillRect(X(right ? bx + bw - trW : bx), Y(by), trW * S, bh * S);
  const low = pct < 0.25 && t % 30 < 15;
  const g = ctx.createLinearGradient(0, Y(by), 0, Y(by + bh));
  const cols = opts.cols || (low ? ['#ffb0b0', '#ff3b3b', '#a00c0c'] : ['#fffbe0', '#ffd23f', '#d68a00']);
  g.addColorStop(0, cols[0]); g.addColorStop(0.45, cols[1]); g.addColorStop(1, cols[2]);
  const x2 = right ? bx + bw - curW : bx;
  ctx.fillStyle = g; ctx.fillRect(X(x2), Y(by), curW * S, bh * S);
  ctx.fillStyle = 'rgba(255,255,255,0.4)'; ctx.fillRect(X(x2), Y(by), curW * S, bh * S * 0.28);
  ctx.restore();
}
function meterBar(ctx, X, Y, S, i, f, mx, my, mw, mh, right, t, label) {
  const p = R.players[i], ch = R.chars[i];
  ctx.fillStyle = 'rgba(5,3,12,0.75)'; ctx.fillRect(X(mx - 1), Y(my - 1), (mw + 2) * S, (mh + 2) * S);
  const mp = f.m / 100, full = f.m >= 100, base = p.custom.aura || ch.look.glow;
  const g = ctx.createLinearGradient(X(mx), 0, X(mx + mw), 0); g.addColorStop(0, rgba(base, 0.7)); g.addColorStop(1, base);
  ctx.fillStyle = full ? (t % 10 < 5 ? '#ffffff' : g) : g;
  ctx.fillRect(right ? X(mx + mw - mw * mp) : X(mx), Y(my), mw * mp * S, mh * S);
  for (let k = 1; k < 4; k++) { ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(X(mx + k * mw / 4), Y(my), S * 0.6, mh * S); }
  if (label) txt(ctx, full ? 'ULTİ HAZIR!' : 'ULTİ', right ? X(mx + mw) : X(mx), Y(my - 5), (full ? 6 : 5) * S, full ? '#ffd23f' : '#c9c3e6', right ? 'right' : 'left');
}
function comboText(ctx, X, Y, S, f, snap, right) {
  if (!(f.c >= 2 && snap.fr - f.ct < 100)) return;
  const cx = right ? X(VW - 16) : X(16), al = right ? 'right' : 'left';
  const pop = Math.max(0, 1 - (snap.fr - f.ct) / 8) * 3;
  txt(ctx, `${f.c} KOMBO`, cx, Y(70), (12 + pop) * S, '#ffd23f', al);
  txt(ctx, `${f.cd} hasar`, cx, Y(83), 6 * S, '#ffffff', al);
}
function drawTimer(ctx, X, Y, S, snap, t, cx, top) {
  if (snap.tl < 0 && R.mode !== 'duel') return;
  ctx.fillStyle = 'rgba(5,3,12,0.8)'; ctx.beginPath(); ctx.moveTo(X(cx - 16), Y(top)); ctx.lineTo(X(cx + 16), Y(top)); ctx.lineTo(X(cx + 12), Y(top + 20)); ctx.lineTo(X(cx - 12), Y(top + 20)); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = 'rgba(255,210,63,0.7)'; ctx.lineWidth = S * 0.5; ctx.stroke();
  const tl = snap.tl < 0 ? '∞' : String(snap.tl);
  txt(ctx, tl, X(cx), Y(top + 11), 13 * S, snap.tl >= 0 && snap.tl <= 10 && t % 30 < 15 ? '#ff5a5a' : '#ffffff', 'center');
}

function drawHUD(snap, myIdx, t) {
  const ctx = R.hctx, S = R.S, ox = R.offX, oy = R.offY;
  ctx.clearRect(0, 0, R.hud.width, R.hud.height);
  const X = v => ox + v * S, Y = v => oy + v * S;
  const fs = snap.f, need = R.matchWins || 2;
  // sinematik kenarlar (ulti)
  if (snap.sf > 0) { ctx.fillStyle = 'rgba(0,0,0,0.85)'; const h = R.hud.height * 0.09; ctx.fillRect(0, 0, R.hud.width, h); ctx.fillRect(0, R.hud.height - h, R.hud.width, h); }

  if (R.mode === 'duel') {
    for (let i = 0; i < 2; i++) {
      const f = fs[i], p = R.players[i], ch = R.chars[i];
      const bw = 150, bh = 8, by = 12, bx = i === 0 ? 14 : VW - 14 - bw;
      hpBar(ctx, X, Y, S, i, f, bx, by, bw, bh, i === 1, t);
      const nX = i === 0 ? X(bx) : X(bx + bw), al = i === 0 ? 'left' : 'right';
      txt(ctx, p.name.toUpperCase() + (i === myIdx ? '  (SEN)' : ''), nX, Y(by + bh + 7), 6.5 * S, '#ffffff', al);
      txt(ctx, ch.name + (p.custom.title ? ' · ' + p.custom.title : ''), nX, Y(by + bh + 14), 4.6 * S, ch.look.glow, al);
      for (let k = 0; k < need; k++) {
        const px = i === 0 ? bx + bw - 6 - k * 8 : bx + 2 + k * 8;
        ctx.fillStyle = snap.w[i] > k ? '#ffd23f' : 'rgba(255,255,255,0.18)';
        ctx.beginPath(); ctx.arc(X(px + 2.5), Y(by + bh + 6.5), 2.5 * S, 0, 7); ctx.fill();
      }
      if (R.touch) meterBar(ctx, X, Y, S, i, f, i === 0 ? 14 : VW - 14 - 70, by + bh + 21, 70, 3.5, i === 1, t, false);
      else meterBar(ctx, X, Y, S, i, f, i === 0 ? 14 : VW - 14 - 100, VH - 14, 100, 5, i === 1, t, true);
      comboText(ctx, X, Y, S, f, snap, i === 1);
    }
    drawTimer(ctx, X, Y, S, snap, t, VW / 2, 7);
  } else if (R.mode === 'ffa') {
    const pw = 112, xs = [8, 136, 264];
    fs.forEach((f, i) => {
      const p = R.players[i], ch = R.chars[i], bx = xs[i] || 8, by = 10;
      hpBar(ctx, X, Y, S, i, f, bx, by, pw, 7, false, t, f.o ? { cols: ['#777', '#555', '#333'] } : null);
      meterBar(ctx, X, Y, S, i, f, bx, by + 9.5, pw, 2, false, t, false);
      ctx.fillStyle = colorOf(i); ctx.fillRect(X(bx), Y(by + 14.5), 3 * S, 3 * S);
      txt(ctx, p.name.toUpperCase() + (i === myIdx ? ' (SEN)' : ''), X(bx + 5), Y(by + 16), 5.6 * S, f.o ? '#888' : '#ffffff', 'left');
      txt(ctx, ch.name, X(bx + pw), Y(by + 16), 4.6 * S, ch.look.glow, 'right');
      for (let k = 0; k < need; k++) { ctx.fillStyle = snap.w[i] > k ? '#ffd23f' : 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.arc(X(bx + 2.5 + k * 7), Y(by + 23), 2.4 * S, 0, 7); ctx.fill(); }
      if (f.o) txt(ctx, 'ELENDİ', X(bx + pw / 2), Y(by + 3.5), 6 * S, '#ff8a8a', 'center');
    });
    if (myIdx >= 0 && fs[myIdx]) comboText(ctx, X, Y, S, fs[myIdx], snap, false);
    drawTimer(ctx, X, Y, S, snap, t, VW / 2, 40);
  } else {
    const bi = R.bossIdx;
    if (bi >= 0) {
      const f = fs[bi], ch = R.chars[bi];
      const bx = 56, bw = VW - 112, by = 14;
      hpBar(ctx, X, Y, S, bi, f, bx, by, bw, 8, false, t, { cols: f.bp ? ['#ffb0b0', '#e8203a', '#7a0a1a'] : ['#ffb0e0', '#c0307a', '#5a0a3a'], border: f.bp && t % 20 < 10 ? '#ff3b3b' : 'rgba(255,255,255,0.55)' });
      ctx.fillStyle = 'rgba(5,3,12,0.75)'; ctx.fillRect(X(bx - 1), Y(by + 9.5), (bw + 2) * S, 3 * S);
      ctx.fillStyle = '#ffe14d'; ctx.fillRect(X(bx), Y(by + 10), bw * (f.sg / 100) * S, 1.8 * S);
      txt(ctx, ch.name, X(bx), Y(by - 6), 7.5 * S, '#ffffff', 'left');
      txt(ctx, `SEVİYE ${R.players[bi].level || 1}` + (f.bp ? ' · ÖFKELİ' : ''), X(bx + bw), Y(by - 6), 5.8 * S, f.bp ? '#ff5a5a' : '#ffd23f', 'right');
      if (R.bossCall) {
        R.bossCall.life--;
        ctx.globalAlpha = clamp(R.bossCall.life / 15, 0, 1);
        txt(ctx, '» ' + R.bossCall.name, X(VW / 2), Y(by + 19), 7 * S, '#ff8a8a', 'center');
        ctx.globalAlpha = 1;
        if (R.bossCall.life <= 0) R.bossCall = null;
      }
      // saldırı uyarısı ve sersemleme
      const hh = 50 * ch.look.height;
      if (f.s === 'attack' && f.mp === 0 && t % 10 < 7) { const p = proj(f.x, f.y - hh - 16); txt(ctx, '!', X(p.x), Y(p.y), 18 * S, '#ff3b3b', 'center'); }
      if (f.s === 'hitstun') for (let k = 0; k < 3; k++) { const a = t * 0.12 + k * 2.09; const p = proj(f.x + Math.cos(a) * 14, f.y - hh - 8, Math.sin(a) * 14); txt(ctx, '★', X(p.x), Y(p.y), 7 * S, '#ffe14d', 'center'); }
    }
    const pls = fs.map((f, i) => i).filter(i => i !== bi);
    const pw = 112, xs = pls.length === 1 ? [8] : pls.length === 2 ? [8, 264] : [8, 136, 264];
    pls.forEach((i, k) => {
      const f = fs[i], p = R.players[i], ch = R.chars[i], bx = xs[k], by = R.touch ? 46 : VH - 18;
      ctx.fillStyle = colorOf(i); ctx.fillRect(X(bx), Y(by - 8), 3 * S, 3 * S);
      txt(ctx, p.name.toUpperCase() + (i === myIdx ? ' (SEN)' : ''), X(bx + 5), Y(by - 6), 5.6 * S, '#ffffff', 'left');
      txt(ctx, ch.name + (f.fe ? `  🪶${f.fe}` : ''), X(bx + pw), Y(by - 6), 4.6 * S, ch.look.glow, 'right');
      hpBar(ctx, X, Y, S, i, f, bx, by, pw, 6, false, t, f.hp <= 0 ? { cols: ['#777', '#555', '#333'] } : null);
      meterBar(ctx, X, Y, S, i, f, bx, by + 8.5, pw, 3, false, t, false);
      if (f.m >= 100) txt(ctx, 'ULTİ!', X(bx + pw), Y(by + 10), 4.6 * S, '#ffd23f', 'right');
      if (f.hp <= 0) txt(ctx, f.fp ? 'DİRİLİYOR...' : 'DÜŞTÜ', X(bx + pw / 2), Y(by + 3), 5.6 * S, f.fp ? '#ff9a2e' : '#ff8a8a', 'center');
      // diriltme halkası
      if (f.s === 'ko' && f.hp <= 0) {
        const c = proj(f.x, f.y - 20, 6), prog = f.fp ? 1 : f.rv / 100;
        ctx.lineWidth = 2.2 * S;
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(X(c.x), Y(c.y), 9 * S, 0, 7); ctx.stroke();
        ctx.strokeStyle = f.fp ? '#ff9a2e' : '#4dff9a'; ctx.beginPath(); ctx.arc(X(c.x), Y(c.y), 9 * S, -Math.PI / 2, -Math.PI / 2 + prog * Math.PI * 2); ctx.stroke();
        if (!f.fp && t % 40 < 26) txt(ctx, '↓', X(c.x), Y(c.y), 9 * S, '#ffffff', 'center');
      }
    });
    if (myIdx >= 0 && fs[myIdx]) comboText(ctx, X, Y, S, fs[myIdx], snap, false);
    if (myIdx >= 0 && fs[myIdx] && fs[myIdx].hp <= 0 && !fs[myIdx].fp && snap.ph === 'fight')
      txt(ctx, 'Düştün! Takım arkadaşın yanına gelip ↓ basılı tutarsa dirilirsin.', X(VW / 2), Y(VH / 2 + 30), 6 * S, '#ffffff', 'center');
  }

  if (R.mode !== 'duel') fs.forEach((f, i) => {
    if (R.players[i].boss || f.hp <= 0) return;
    const hh = 50 * R.chars[i].look.height;
    const p = proj(f.x, f.y - hh - 16);
    const col = colorOf(i);
    txt(ctx, i === myIdx ? 'SEN' : R.players[i].name, X(p.x), Y(p.y), 4.8 * S, col, 'center');
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(X(p.x - 2), Y(p.y + 3.5)); ctx.lineTo(X(p.x + 2), Y(p.y + 3.5)); ctx.lineTo(X(p.x), Y(p.y + 6)); ctx.fill();
  });

  for (const tx of R.texts) {
    tx.life--; tx.y -= 0.35;
    const p = proj(tx.x, tx.y, 10);
    ctx.globalAlpha = clamp(tx.life / 20, 0, 1);
    txt(ctx, tx.text, X(p.x), Y(p.y), tx.size * S, tx.col, 'center');
    ctx.globalAlpha = 1;
  }
  R.texts = R.texts.filter(x => x.life > 0);

  for (const b of R.bubbles) {
    b.life--;
    const f = fs[b.slot]; if (!f) continue;
    const hh = 50 * R.chars[b.slot].look.height;
    const p = proj(f.x, f.y - hh - 22);
    const bx = X(clamp(p.x, 50, VW - 50)), by = Y(clamp(p.y, 30, VH - 30));
    ctx.font = `600 ${Math.round(7.5 * S)}px ${FONT}`;
    const w = ctx.measureText(b.text).width + 10 * S, h = 12 * S;
    ctx.globalAlpha = clamp(b.life / 15, 0, 1);
    ctx.fillStyle = R.players[b.slot].boss ? 'rgba(60,0,16,0.92)' : 'rgba(255,255,255,0.95)';
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx - w / 2, by - h / 2, w, h, 4 * S); else ctx.rect(bx - w / 2, by - h / 2, w, h); ctx.fill();
    ctx.beginPath(); ctx.moveTo(bx - 3 * S, by + h / 2); ctx.lineTo(bx + 3 * S, by + h / 2); ctx.lineTo(bx, by + h / 2 + 4 * S); ctx.fill();
    txt(ctx, b.text, bx, by, 5.8 * S, R.players[b.slot].boss ? '#ffd0dc' : '#14101e', 'center', false);
    ctx.globalAlpha = 1;
  }
  R.bubbles = R.bubbles.filter(b => b.life > 0);

  if (R.qNote) { R.qNote.life--; ctx.globalAlpha = clamp(R.qNote.life / 20, 0, 1); txt(ctx, R.qNote.text + '  (G: değiştir)', X(VW - 8), Y(VH - 26), 5.5 * S, '#9ff3ff', 'right'); ctx.globalAlpha = 1; if (R.qNote.life <= 0) R.qNote = null; }
  if (R.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${R.flash / 18})`; ctx.fillRect(0, 0, R.hud.width, R.hud.height); R.flash--; }
  if (snap.ph === 'ko' && snap.pt > 60) { ctx.fillStyle = 'rgba(255,0,40,0.08)'; ctx.fillRect(0, 0, R.hud.width, R.hud.height); }

  if (R.announce) {
    const a = R.announce; a.t++;
    const k = a.t < 8 ? a.t / 8 : 1, fade = a.t > a.dur - 12 ? (a.dur - a.t) / 12 : 1;
    ctx.globalAlpha = clamp(fade, 0, 1);
    const base = a.big ? 36 : a.small ? 13 : 24;
    const size = base * S * (0.6 + 0.4 * k) * (a.big && a.t < 8 ? 1.4 - 0.4 * k : 1);
    txt(ctx, a.text, X(VW / 2), Y(VH / 2 - 14), size, a.col, 'center');
    ctx.globalAlpha = 1;
    if (a.t >= a.dur) R.announce = null;
  }
  if (snap.ph === 'ko' && snap.pt > 30 && !R.announce) txt(ctx, 'K.O.', X(VW / 2), Y(VH / 2 - 14), (42 + Math.sin(t * 0.3) * 2) * S, '#ff3b3b', 'center');

  if (R.banner) {
    const b = R.banner; b.t++;
    if (!b.img) b.img = R.portrait(b.ch, b.cu);
    const left = b.i % 2 === 0, dur = 50, k = Math.min(1, b.t / 8), out = b.t > dur - 8 ? (dur - b.t) / 8 : 1;
    const bandH = 46 * S * k * clamp(out, 0, 1), cy = Y(VH / 2 + 10), col = b.cu.aura || b.ch.look.glow;
    const g = ctx.createLinearGradient(0, 0, R.hud.width, 0);
    g.addColorStop(left ? 0 : 1, rgba(col, 0.95)); g.addColorStop(0.5, 'rgba(8,4,18,0.92)'); g.addColorStop(left ? 1 : 0, 'rgba(8,4,18,0.6)');
    ctx.fillStyle = g; ctx.fillRect(0, cy - bandH / 2, R.hud.width, bandH);
    ctx.fillStyle = col; ctx.fillRect(0, cy - bandH / 2 - 1.5 * S, R.hud.width, 1.5 * S); ctx.fillRect(0, cy + bandH / 2, R.hud.width, 1.5 * S);
    if (bandH > 20 * S) {
      ctx.save(); ctx.beginPath(); ctx.rect(0, cy - bandH / 2, R.hud.width, bandH); ctx.clip();
      const ph = 60 * S, pw = ph * b.img.width / b.img.height, slide = (1 - k) * 200 * S;
      const px = left ? X(30) - slide : X(VW - 30) - pw + slide;
      ctx.drawImage(b.img, px, cy - ph * 0.45, pw, ph);
      ctx.restore();
      const tx = left ? X(100) : X(VW - 100), al = left ? 'left' : 'right';
      txt(ctx, b.ch.name, tx, cy - 9 * S, 9 * S, '#ffffff', al);
      txt(ctx, b.name, tx + (left ? 1 : -1) * (1 - k) * 40 * S, cy + 7 * S, 16 * S, col, al);
    }
    if (b.t >= dur) R.banner = null;
  }
}

// ------------------------------------------------------------ menü sahnesi
R.menu = { F: [], keys: [] };
function hideMenu() { for (const F of R.menu.F) if (F) R.fighterRoot.remove(F.root); R.menu.F = []; R.menu.keys = []; }
R.menuFrame = function (t, a, b) {
  if (!R.ready) return;
  if (R.F.length) clearFighters();
  setStage('istanbul');
  const specs = [a, b];
  specs.forEach((s, k) => {
    const [ch, cu, f, x, d] = s;
    const key = ch.id + JSON.stringify(cu);
    if (R.menu.keys[k] !== key) { if (R.menu.F[k]) R.fighterRoot.remove(R.menu.F[k].root); R.menu.F[k] = buildFighter(ch, cu); R.menu.keys[k] = key; R.fighterRoot.add(R.menu.F[k].root); }
    const F = R.menu.F[k];
    F.root.position.set(x, f.a ? 16 : 0, 0); F.root.visible = true;
    applyPose(F, getPose(f, ch.id), t, d, 0);
    setEmissive(F, f.s === 'attack' ? (cu.aura || ch.look.glow) : null, 0.15);
  });
  R.pool.begin();
  const tt = t * 0.0035;
  R.camera.position.set(240 + Math.sin(tt) * 70, 52, 230 + Math.cos(tt * 0.7) * 20);
  R.camera.lookAt(240, 38, 0);
  weather(t); R.pool.end();
  for (const u of R.stage.updates) u(t, R.camera);
  R.add.update(); R.dust.update(); R.rings.update(R.camera);
  present(); perf();
  R.hctx && R.hctx.clearRect(0, 0, R.hud.width, R.hud.height);
};

// ------------------------------------------------------------ lobi önizlemeleri (ikinci, küçük renderer)
const PV = { r: null, scene: null, cam: null, cache: new Map(), size: 320 };
function pvInit() {
  const c = document.createElement('canvas');
  const r = new THREE.WebGLRenderer({ canvas: c, antialias: true, alpha: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(PV.size, PV.size, false);
  r.toneMapping = THREE.ACESFilmicToneMapping; r.outputColorSpace = THREE.SRGBColorSpace;
  r.setClearColor(0x000000, 0);
  const sc = new THREE.Scene();
  const pm = new THREE.PMREMGenerator(r); sc.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  sc.add(new THREE.HemisphereLight('#c8d0ff', '#40303a', 1.0));
  const key = new THREE.DirectionalLight('#fff0e0', 2.4); key.position.set(60, 120, 140); sc.add(key);
  PV.rim = new THREE.DirectionalLight('#7aa8ff', 2.2); PV.rim.position.set(-80, 60, -100); sc.add(PV.rim);
  const sh = new THREE.Mesh(new THREE.CircleGeometry(1, 32), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.35, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.2; sc.add(sh); PV.shadow = sh;
  PV.r = r; PV.scene = sc; PV.cam = new THREE.PerspectiveCamera(28, 1, 1, 2000);
}
function pvFighter(ch, cu) {
  const key = ch.id + '|' + JSON.stringify(cu);
  let e = PV.cache.get(key);
  if (!e) {
    if (PV.cache.size > 28) { const [k0, e0] = PV.cache.entries().next().value; PV.scene.remove(e0.root); PV.cache.delete(k0); }
    e = buildFighter(ch, cu, { noShadow: true }); PV.scene.add(e.root); PV.cache.set(key, e);
  } else { PV.cache.delete(key); PV.cache.set(key, e); }
  return e;
}
R.drawPreview = function (canvas, ch, cu, f, t, opts) {
  if (!PV.r) pvInit();
  opts = opts || {};
  const F = pvFighter(ch, cu);
  for (const e of PV.cache.values()) e.root.visible = e === F;
  applyPose(F, getPose(f, ch.id), t, opts.facing || 1, 0);
  F.root.position.set(0, f.a ? 14 * ch.look.height : 0, 0);
  F.root.rotation.y = opts.spin ? Math.sin(t * 0.01) * 0.3 : 0;
  const aura = cu.aura || ch.look.glow;
  setEmissive(F, opts.aura ? aura : null, opts.aura ? 0.12 + 0.06 * Math.sin(t * 0.15) : 0);
  PV.rim.color.set(opts.aura ? aura : '#7aa8ff');
  const H = 52 * ch.look.height + (ch.boss ? 10 : 6);
  PV.shadow.scale.setScalar(14 * ch.look.build);
  const w = canvas.width, h = canvas.height, ar = w / h;
  const vw = ar >= 1 ? PV.size : Math.round(PV.size * ar), vh = ar >= 1 ? Math.round(PV.size / ar) : PV.size;
  PV.r.setViewport(0, 0, vw, vh); PV.r.setScissor(0, 0, vw, vh); PV.r.setScissorTest(true);
  const cam = PV.cam; cam.aspect = ar; cam.updateProjectionMatrix();
  const dist = (H * 0.62) / Math.tan(THREE.MathUtils.degToRad(14)) / Math.min(1, ar) * (opts.zoom || 1);
  cam.position.set(6 * (opts.facing || 1), H * 0.62, dist); cam.lookAt(0, H * 0.48, 0);
  PV.r.clear(); PV.r.render(PV.scene, cam);
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.drawImage(PV.r.domElement, 0, PV.size - vh, vw, vh, 0, 0, w, h);
};
R.portrait = function (ch, cu) {
  const c = document.createElement('canvas'); c.width = 200; c.height = 240;
  const pose = { s: 'attack', mv: 'ult', mp: 1, mt: 4, st: 0, a: 0 };
  R.drawPreview(c, ch, cu, pose, R.tick, { aura: true, zoom: 0.95 });
  return c;
};

R.getPose = getPose; R.SLOT_COLORS = SLOT_COLORS; R.VW = VW; R.VH = VH;
window.Renderer = R;
