/* 3D karakter üretici: gerçekçi oranlı insan figürü, kıyafet, saç, aksesuar
   Koordinatlar: x = ileri (bakış yönü), y = yukarı, z = yan (omuz ekseni). Birim ≈ oyun pikseli. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const D2R = Math.PI / 180;
const V2 = (x, y) => new THREE.Vector2(x, y);
const lerp = (a, b, t) => a + (b - a) * t;

const GEO = new Map();
const geo = (key, fn) => { if (!GEO.has(key)) GEO.set(key, fn()); return GEO.get(key); };
const SPH = () => geo('sph', () => new THREE.SphereGeometry(1, 24, 16));
const HSPH = () => geo('hsph', () => new THREE.SphereGeometry(1, 24, 10, 0, Math.PI * 2, 0, Math.PI * 0.5));
const CONE = () => geo('cone', () => new THREE.ConeGeometry(1, 1, 10));
const CYL = () => geo('cyl', () => new THREE.CylinderGeometry(1, 1, 1, 16));
const BOX = () => geo('box', () => new THREE.BoxGeometry(1, 1, 1));
const RBOX = () => geo('rbox', () => new RoundedBoxGeometry(1, 1, 1, 3, 0.28));

// uzuv: üstte eklem (y=0), aşağı doğru uzanır, yuvarlak uçlu, kas kabarıklığı
function limbGeo(r0, r1, len, bulge, bulgeAt) {
  const key = `limb${r0.toFixed(2)}_${r1.toFixed(2)}_${len.toFixed(2)}_${bulge.toFixed(2)}_${bulgeAt}`;
  return geo(key, () => {
    const pts = [];
    for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; pts.push(V2(Math.max(0.01, r1 * Math.sin(a)), -len - r1 * 0.55 * Math.cos(a))); }
    const n = 12;
    for (let i = 1; i < n; i++) {
      const t = 1 - i / n;
      const b = bulge * Math.exp(-Math.pow((t - bulgeAt) / 0.28, 2));
      pts.push(V2(lerp(r0, r1, t) + b, -len * t));
    }
    for (let i = 0; i <= 5; i++) { const a = (i / 5) * Math.PI / 2; pts.push(V2(Math.max(0.01, r0 * Math.cos(a)), r0 * 0.55 * Math.sin(a))); }
    const g = new THREE.LatheGeometry(pts, 18);
    g.computeVertexNormals();
    return g;
  });
}
// gövde profili (kalçadan boyuna)
function torsoGeo(to, from, until) {
  return geo(`torso${to.toFixed(2)}_${from}_${until}`, () => {
    const prof = [[0.2, 0], [3.9, 0.04], [4.25, 0.14], [3.8, 0.34], [4.5, 0.56], [5.05, 0.72], [4.9, 0.84], [3.6, 0.95], [1.7, 1.0]];
    const pts = [];
    const sample = (y) => { for (let i = 1; i < prof.length; i++) if (y <= prof[i][1]) { const k = (y - prof[i - 1][1]) / (prof[i][1] - prof[i - 1][1]); return lerp(prof[i - 1][0], prof[i][0], k); } return prof[prof.length - 1][0]; };
    const steps = 22;
    for (let i = 0; i <= steps; i++) { const y = from + (until - from) * i / steps; pts.push(V2(Math.max(0.05, sample(y)), y * to)); }
    if (until >= 1) pts.push(V2(0.05, to + 0.05));
    if (from <= 0) pts.unshift(V2(0.05, -0.05));
    return new THREE.LatheGeometry(pts, 24);
  });
}

function stdMat(color, rough, metal) {
  return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: rough == null ? 0.7 : rough, metalness: metal || 0, envMapIntensity: 0.55 });
}
export function glowMat(color, k) {
  return new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k || 2.5), toneMapped: false });
}

export function buildFighter(ch, cu, opts) {
  opts = opts || {};
  const L = ch.look, bd = L.build, hg = L.height, boss = !!ch.boss;
  const len = { th: 11 * hg, sh: 11 * hg, to: 15 * hg, ua: 8.5 * hg, fa: 8 * hg };
  const F = { ch, cu, L, bd, hg, len, mats: [], anim: [], meshes: [], boss };
  const mk = (c, r, m) => { const x = stdMat(c, r, m); F.mats.push(x); return x; };
  const isGold = c => /^#(ff|e0|c9|ffd)/i.test(c) && c.toLowerCase() !== '#ffffff';
  const M = {
    skin: mk(L.skin, L.metal ? 0.36 : 0.52, L.metal ? 0.85 : 0),
    prim: mk(cu.primary, 0.8), sec: mk(cu.secondary, 0.86),
    glove: mk(L.glove, 0.42, 0.05), shoe: mk(L.shoe, 0.48), accent: mk(L.accent, 0.5, isGold(L.accent) ? 0.6 : 0.05),
    hair: mk(L.hairColor, L.hair === 'helmet' ? 0.35 : 0.62, L.hair === 'helmet' ? 0.75 : 0),
    dark: mk('#141418', 0.55), white: mk('#f2f2f2', 0.25), lip: mk('#7a3a36', 0.5),
    primDark: mk(new THREE.Color(cu.primary).multiplyScalar(0.55).getStyle(), 0.8)
  };
  if (L.pads) M.pads = mk(L.pads, 0.32, 0.75);
  if (L.cape) { M.cape = mk(L.cape, 0.82); M.cape.side = THREE.DoubleSide; M.capeIn = mk(new THREE.Color(L.cape).multiplyScalar(0.45).getStyle(), 0.9); M.capeIn.side = THREE.DoubleSide; }
  if (L.scarf) M.scarf = mk(L.scarf, 0.8);
  if (L.band) M.band = mk(L.band, 0.75);
  if (L.beard) M.beard = mk(L.beard, 0.8);
  const gold = mk('#e8b923', 0.28, 0.9);
  const au = cu.aura || L.glow;

  const add = (parent, g, mat, p, s, r) => {
    const m = new THREE.Mesh(g, mat);
    if (p) m.position.set(p[0], p[1], p[2]);
    if (s != null) { if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(s[0], s[1], s[2]); }
    if (r) m.rotation.set(r[0], r[1], r[2]);
    m.castShadow = !opts.noShadow; m.receiveShadow = false;
    parent.add(m); F.meshes.push(m);
    return m;
  };

  // ------------ iskelet
  const root = new THREE.Group();
  const yaw = new THREE.Group(); yaw.rotation.y = -0.55; root.add(yaw);
  const lift = new THREE.Group(); yaw.add(lift);
  const rotP = new THREE.Group(); rotP.position.y = 14 * hg; lift.add(rotP);
  const hip = new THREE.Group(); hip.position.y = -14 * hg; rotP.add(hip);
  Object.assign(F, { root, yaw, lift, rotP, hip });

  // leğen
  add(hip, SPH(), M.sec, [0, 0.4, 0], [3.2 * bd, 3.0, 4.5 * bd]);

  // bacaklar
  const leg = (s) => {
    const hj = new THREE.Group(); hj.position.set(0, -0.4, s * 2.45 * bd); hip.add(hj);
    add(hj, limbGeo(2.75 * bd, 1.85 * bd, len.th, 0.35 * bd, 0.25), M.sec);
    const knee = new THREE.Group(); knee.position.y = -len.th; hj.add(knee);
    add(knee, SPH(), M.sec, [0.3, 0, 0], 1.9 * bd);
    add(knee, limbGeo(1.95 * bd, 1.2 * bd, len.sh, 0.45 * bd, 0.3), M.sec);
    const ankle = new THREE.Group(); ankle.position.y = -len.sh; knee.add(ankle);
    add(ankle, RBOX(), M.shoe, [1.25 * bd, -0.7, 0], [5.4 * bd, 2.0, 2.5 * bd]);
    return { hj, knee, ankle };
  };
  F.legF = leg(1); F.legB = leg(-1);

  // gövde
  const torso = new THREE.Group(); torso.position.y = 0.8; hip.add(torso); F.torso = torso;
  const tScale = [0.74 * bd, 1, 1.12 * bd];
  if (L.crop) {
    add(torso, torsoGeo(len.to, 0, 0.47), M.skin, null, tScale);
    add(torso, torsoGeo(len.to, 0.47, 1), M.prim, null, tScale);
  } else add(torso, torsoGeo(len.to, 0, 1), M.prim, null, tScale);
  // kemer
  const belt = new THREE.TorusGeometry(4.05, 0.55, 8, 28);
  add(torso, belt, M.accent, [0, 0.9, 0], [0.74 * bd, 1.12 * bd, 1], [Math.PI / 2, 0, 0]);
  if (L.gi) { // yaka
    add(torso, BOX(), M.primDark, [3.35 * bd, len.to * 0.72, 0.8], [0.25, len.to * 0.42, 0.45], [0, 0, 0.0]).rotation.x = 0.35;
    add(torso, BOX(), M.primDark, [3.35 * bd, len.to * 0.72, -0.8], [0.25, len.to * 0.42, 0.45], [0, 0, 0]).rotation.x = -0.35;
  }
  if (L.metal) {
    for (const y of [0.3, 0.55]) for (const z of [-2.5, 2.5]) add(torso, SPH(), M.accent, [3.0 * bd, len.to * y, z * bd], 0.45);
    add(torso, SPH(), glowMat(L.eyes, 3), [3.3 * bd, len.to * 0.66, 0], 1.0);
  }
  if (L.chain) add(torso, new THREE.TorusGeometry(2.4, 0.22, 6, 20), gold, [2.2 * bd, len.to * 0.86, 0], [1, 1.3 * bd, 1], [0, Math.PI / 2, -0.5]);

  // boyun ve kafa
  const neckR = boss ? 1.5 * Math.sqrt(bd) : 1.3 * Math.sqrt(bd);
  add(torso, CYL(), M.skin, [0.2, len.to + 0.6, 0], [neckR, 3.2, neckR]);
  const headP = new THREE.Group(); headP.position.set(0.3, len.to + 1.6, 0); torso.add(headP); F.headP = headP;
  const H = new THREE.Group(); headP.add(H);
  const hs = boss ? 1 + (hg - 1) * 0.55 : 1 + (hg - 1) * 0.3;
  H.scale.setScalar(hs);
  buildHead(F, H, M, add, gold, au);

  // pelerin, atkı, palto (arkada)
  if (L.cape) {
    const cw = 9.5 * bd, chh = 28 * hg;
    const g = new THREE.PlaneGeometry(cw, chh, 2, 10);
    g.translate(0, -chh / 2, 0);
    const cape = add(torso, g, M.cape, [-3.3 * bd, len.to - 0.5, 0], null, [0, Math.PI / 2, 0]);
    const base = g.attributes.position.array.slice();
    F.anim.push((t, sp) => {
      const a = g.attributes.position.array;
      for (let i = 0; i < a.length; i += 3) {
        const dy = -base[i + 1] / chh;
        a[i + 2] = base[i + 2] - dy * dy * (6 + sp * 10) + Math.sin(t * 0.08 + dy * 4 + base[i] * 0.2) * dy * 2.2;
      }
      g.attributes.position.needsUpdate = true; g.computeVertexNormals();
    });
  }
  if (L.scarf) {
    add(torso, new THREE.TorusGeometry(1.9, 0.9, 8, 18), M.scarf, [0.2, len.to + 0.2, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    const segs = [];
    let parent = torso, px = -1.8, py = len.to;
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(); g.position.set(px, py, 0); parent.add(g);
      add(g, BOX(), M.scarf, [-1.6, 0, 0], [3.4, 0.35, 1.8]);
      segs.push(g); parent = g; px = -3.2; py = 0;
    }
    F.anim.push((t, sp) => segs.forEach((s, i) => { s.rotation.z = (i === 0 ? 0.5 : 0.12) - sp * 0.06 + Math.sin(t * 0.25 + i * 0.9) * 0.12; s.rotation.y = Math.sin(t * 0.17 + i) * 0.12; }));
  }
  if (L.coat) {
    const tails = [];
    for (const z of [-1.8, 1.8]) {
      const g = new THREE.Group(); g.position.set(-2.2 * bd, 1.4, z * bd); torso.add(g);
      add(g, RBOX(), M.primDark, [-0.4, -6.5 * hg, 0], [0.7, 13.5 * hg, 3.3 * bd]);
      tails.push(g);
    }
    F.anim.push((t, sp) => tails.forEach((g, i) => { g.rotation.z = -0.12 - sp * 0.15 + Math.sin(t * 0.09 + i) * 0.06; }));
  }

  // kollar
  const arm = (s) => {
    const sh = new THREE.Group(); sh.position.set(0, len.to - 1.7 * hg, s * 4.55 * bd); torso.add(sh);
    const sleeve = L.sleeves ? M.prim : M.skin;
    add(sh, SPH(), sleeve, [0, 0, 0], [2.25 * bd, 2.25 * bd, 2.25 * bd]);
    add(sh, limbGeo(2.15 * bd, 1.5 * bd, len.ua, 0.32 * bd, 0.35), sleeve);
    const el = new THREE.Group(); el.position.y = -len.ua; sh.add(el);
    add(el, SPH(), L.coat ? M.prim : M.skin, [0, 0, 0], 1.5 * bd);
    add(el, limbGeo(1.6 * bd, 1.1 * bd, len.fa, 0.38 * bd, 0.3), L.coat ? M.prim : M.skin);
    const wr = new THREE.Group(); wr.position.y = -len.fa; el.add(wr);
    const fs = 0.82 + 0.18 * bd;
    add(wr, RBOX(), M.glove, [0.3, -1.1 * fs, 0], [2.9 * fs, 2.9 * fs, 2.5 * fs]);
    add(wr, CYL(), M.glove, [0, 0.2, 0], [1.25 * fs, 1.6, 1.25 * fs]);
    return { sh, el, wr };
  };
  F.armF = arm(1); F.armB = arm(-1);
  if (L.pads) for (const s of [-1, 1]) {
    add(torso, HSPH(), M.pads, [0, len.to - 0.6 * hg, s * 4.9 * bd], [3.4 * bd, 2.6 * bd, 3.0 * bd], [0, 0, 0]);
    add(torso, new THREE.TorusGeometry(3.2, 0.3, 6, 20), gold, [0, len.to - 0.7 * hg, s * 4.9 * bd], [bd, bd, bd * 0.9], [Math.PI / 2, 0, 0]);
  }

  // efekt kontrolü
  F.emis = new THREE.Color(0, 0, 0);
  return F;
}

function buildHead(F, H, M, add, gold, au) {
  const L = F.L, cu = F.cu;
  const hood = L.hair === 'hood';
  add(H, SPH(), M.skin, [0.25, 3.7, 0], [3.25, 3.7, 3.0]);
  add(H, SPH(), M.skin, [0.95, 2.0, 0], [2.45, 2.05, 2.25]);
  add(H, CONE(), M.skin, [3.35, 3.25, 0], [0.55, 1.5, 0.6], [0, 0, -Math.PI / 2]);
  for (const s of [-1, 1]) add(H, SPH(), M.skin, [0.05, 3.5, s * 3.0], [0.55, 0.95, 0.35]);
  // gözler
  const eyeGlow = L.eyes ? glowMat(L.eyes, 3.2) : null;
  for (const s of [-1, 1]) {
    if (!eyeGlow) add(H, SPH(), M.white, [2.82, 4.05, s * 1.15], [0.32, 0.42, 0.55]);
    add(H, SPH(), eyeGlow || M.dark, [3.06, 4.05, s * 1.15], eyeGlow ? [0.3, 0.32, 0.6] : [0.18, 0.28, 0.28]);
    add(H, BOX(), M.hair, [2.98, 4.78, s * 1.2], [0.45, 0.32, 1.55], [s * 0.12, 0, 0]);
  }
  add(H, BOX(), M.lip, [3.05, 1.95, 0], [0.3, 0.22, 1.5]);
  if (L.beard) {
    add(H, SPH(), M.beard, [1.45, 1.55, 0], [2.15, 1.7, 2.35]);
    add(H, BOX(), M.beard, [3.0, 2.45, 0], [0.4, 0.5, 2.2]);
  }
  if (L.mask) add(H, RBOX(), M.primDark, [2.3, 2.15, 0], [2.6, 2.4, 4.4]);

  const hairCap = (sc) => add(H, HSPH(), M.hair, [0.05, 3.9, 0], sc || [3.45, 3.0, 3.25], [0, 0, 0.12]);
  switch (L.hair) {
    case 'spiky': {
      hairCap();
      const sp = [[0.8, 7.0, 0, 0.1], [-0.6, 7.2, 1.3, 0.5], [-0.6, 7.2, -1.3, 0.5], [-2.0, 6.5, 0, 0.9], [-1.4, 6.4, 2.3, 0.8], [-1.4, 6.4, -2.3, 0.8], [-2.8, 5.2, 1.4, 1.3], [-2.8, 5.2, -1.4, 1.3], [1.9, 6.4, 1.6, -0.2], [1.9, 6.4, -1.6, -0.2]];
      for (const [x, y, z, r] of sp) add(H, CONE(), M.hair, [x, y, z], [1.15, 3.2, 1.15], [z * 0.12, 0, r]);
      break;
    }
    case 'spiky_tall': {
      hairCap();
      const sp = [[0.6, 8.4, 0, 0.15, 5.5], [-0.8, 8.2, 1.4, 0.45, 5], [-0.8, 8.2, -1.4, 0.45, 5], [-2.2, 7.4, 0, 0.9, 4.8], [-2.6, 6.6, 2.2, 1.0, 4], [-2.6, 6.6, -2.2, 1.0, 4], [-3.3, 5.0, 0, 1.5, 4], [2.0, 7.0, 1.5, -0.3, 3.5], [2.0, 7.0, -1.5, -0.3, 3.5]];
      for (const [x, y, z, r, h] of sp) add(H, CONE(), M.hair, [x, y, z], [1.3, h, 1.3], [z * 0.15, 0, r]);
      break;
    }
    case 'long': {
      hairCap([3.55, 3.2, 3.35]);
      add(H, SPH(), M.hair, [-1.9, 1.4, 0], [2.0, 5.0, 3.1]);
      add(H, SPH(), M.hair, [-0.6, 0.6, 2.4], [1.4, 3.8, 0.9]);
      add(H, SPH(), M.hair, [-0.6, 0.6, -2.4], [1.4, 3.8, 0.9]);
      add(H, BOX(), M.hair, [2.6, 5.9, 0.6], [1.0, 1.3, 2.6], [0.3, 0, -0.4]);
      break;
    }
    case 'ponytail': {
      hairCap();
      add(H, BOX(), M.hair, [2.4, 6.1, 0.4], [1.4, 1.0, 3.2], [0.2, 0, -0.5]);
      add(H, CYL(), M.accent, [-3.0, 5.2, 0], [0.8, 0.8, 0.8], [0, 0, 1.2]);
      const tail = new THREE.Group(); tail.position.set(-3.3, 5.3, 0); H.add(tail);
      add(tail, SPH(), M.hair, [-1.5, -2.0, 0], [1.4, 3.0, 1.3], [0, 0, 0.6]);
      add(tail, SPH(), M.hair, [-2.6, -5.0, 0], [1.0, 2.6, 1.0], [0, 0, 0.3]);
      F.anim.push((t, sp) => { tail.rotation.z = 0.35 - sp * 0.2 + Math.sin(t * 0.22) * 0.18; tail.rotation.x = Math.sin(t * 0.13) * 0.15; });
      break;
    }
    case 'hood': {
      const hm = M.primDark;
      add(H, SPH(), hm, [-0.4, 3.9, 0], [3.9, 4.3, 3.7]);
      add(H, BOX(), hm, [2.9, 5.8, 0], [0.9, 1.2, 4.6]);
      break;
    }
    case 'flame': {
      const cols = ['#ff3d00', '#ff7a00', '#ffd23f'];
      const flames = [];
      add(H, HSPH(), glowMat('#ff7a00', 2.2), [0, 4.2, 0], [3.4, 2.6, 3.2]);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2, r = i % 2 ? 1.6 : 0.6;
        const m = add(H, CONE(), glowMat(cols[i % 3], 2.6 + (i % 3) * 0.6), [Math.cos(a) * r - 0.6, 7, Math.sin(a) * r * 1.4], [1.3, 3.6, 1.3]);
        m.castShadow = false; flames.push(m);
      }
      F.anim.push((t) => flames.forEach((m, i) => { const k = 0.7 + 0.45 * Math.abs(Math.sin(t * 0.21 + i * 1.7)); m.scale.y = 3.6 * k; m.position.y = 6.0 + 1.8 * k; m.rotation.z = 0.5 + Math.sin(t * 0.1 + i) * 0.2; }));
      F.flameLight = '#ff7a00';
      break;
    }
    case 'helmet': {
      add(H, SPH(), M.hair, [0.1, 4.2, 0], [3.8, 3.9, 3.55]);
      add(H, BOX(), M.hair, [2.9, 2.6, 0], [1.2, 3.0, 4.2]);
      add(H, BOX(), M.accent, [0.1, 5.5, 0], [7.6, 0.5, 7.2]);
      add(H, BOX(), M.accent, [3.5, 4.4, 0], [0.4, 0.6, 3.6]);
      for (const s of [-1, 1]) {
        const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 6, s * 3), new THREE.Vector3(-0.5, 8.5, s * 5.2), new THREE.Vector3(-1.5, 11.5, s * 5.6), new THREE.Vector3(-2.2, 13.5, s * 4.6)]);
        const tg = new THREE.TubeGeometry(curve, 16, 0.75, 8, false);
        const pos = tg.attributes.position, cnt = pos.count;
        add(H, tg, gold);
      }
      break;
    }
    case 'bald': default: break;
  }
  if (L.band) {
    add(H, new THREE.TorusGeometry(3.35, 0.5, 8, 26), M.band, [0.2, 4.95, 0], [1, 0.95, 1], [Math.PI / 2, 0, 0.12]);
    const tails = [];
    for (const z of [-0.5, 0.5]) {
      const g = new THREE.Group(); g.position.set(-3.2, 4.8, z); H.add(g);
      add(g, BOX(), M.band, [-2.2, 0, 0], [4.4, 0.5, 0.9]);
      tails.push(g);
    }
    F.anim.push((t, sp) => tails.forEach((g, i) => { g.rotation.z = 0.9 - sp * 0.25 + Math.sin(t * 0.3 + i * 1.3) * 0.2; g.rotation.y = (i ? 0.25 : -0.25); }));
  }
  if (L.crown) {
    const cm = glowMat(L.crown, 1.6);
    add(H, new THREE.TorusGeometry(3.2, 0.35, 6, 24), cm, [0.1, 6.4, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);
    for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; add(H, CONE(), cm, [0.1 + Math.cos(a) * 3.1, 7.7 + (i % 2) * 0.9, Math.sin(a) * 3.1], [0.45, 2.6 + (i % 2) * 1.6, 0.45]); }
  }
  // aksesuarlar
  const am = stdMat(au, 0.6); F.mats.push(am);
  switch (cu.acc) {
    case 'bandana':
      add(H, new THREE.TorusGeometry(3.4, 0.6, 8, 26), am, [0.2, 5.3, 0], [1, 0.95, 1], [Math.PI / 2, 0, 0.12]);
      add(H, BOX(), am, [-4.6, 4.8, 0], [3.4, 0.5, 1.4], [0, 0, 0.6]);
      break;
    case 'cap':
      add(H, HSPH(), am, [0.1, 5.0, 0], [3.65, 2.5, 3.4]);
      add(H, RBOX(), am, [3.6, 5.2, 0], [3.6, 0.35, 4.6]);
      break;
    case 'crown':
      add(H, CYL(), gold, [0.1, 7.6, 0], [2.6, 1.6, 2.6]);
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; add(H, CONE(), gold, [0.1 + Math.cos(a) * 2.3, 9.3, Math.sin(a) * 2.3], [0.5, 1.8, 0.5]); }
      add(H, SPH(), glowMat('#e11d48', 2), [2.6, 7.6, 0], 0.5);
      break;
    case 'shades':
      add(H, RBOX(), stdMat('#050505', 0.08, 0.6), [3.15, 4.15, 0], [0.5, 1.05, 3.9]);
      break;
    case 'headset':
      add(H, new THREE.TorusGeometry(3.6, 0.35, 6, 20, Math.PI), M.dark, [0, 4.4, 0], [1, 1, 1], [0, Math.PI / 2, 0]);
      for (const s of [-1, 1]) add(H, CYL(), M.dark, [0, 3.6, s * 3.3], [1.4, 0.9, 1.4], [Math.PI / 2, 0, 0]);
      add(H, CYL(), glowMat(au, 2), [0, 3.6, 3.85], [0.6, 0.2, 0.6], [Math.PI / 2, 0, 0]);
      break;
    case 'horns':
      for (const s of [-1, 1]) add(H, CONE(), M.white, [0.4, 7.4, s * 2.0], [0.9, 3.6, 0.9], [s * -0.45, 0, 0.25]);
      break;
  }
}

// ------------------------------------------------------------ poz uygulama
export function applyPose(F, pose, t, facing, speed) {
  const { len, hg } = F;
  const lean = pose.lean * D2R;
  // 2D ileri kinematik: en alçak noktayı bul (yere basma yüksekliği)
  let hipY;
  if (pose.ground) {
    const pts = [];
    const sh = [Math.sin(lean) * len.to, -Math.cos(lean) * len.to];
    const nk = [sh[0] + Math.sin(lean) * 2, sh[1] - Math.cos(lean) * 2];
    const hl = lean + pose.head * D2R;
    const hd = [nk[0] + Math.sin(hl) * 5, nk[1] - Math.cos(hl) * 5];
    pts.push([0, 0], sh, nk, [hd[0], hd[1] + 4.5]);
    const arm = (a) => { const a1 = a[0] * D2R, a2 = (a[0] + a[1]) * D2R; const e = [sh[0] + Math.sin(a1) * len.ua, sh[1] + Math.cos(a1) * len.ua]; pts.push(e, [e[0] + Math.sin(a2) * len.fa, e[1] + Math.cos(a2) * len.fa]); };
    const leg = (a) => { const a1 = a[0] * D2R, a2 = (a[0] - a[1]) * D2R; const k = [Math.sin(a1) * len.th, Math.cos(a1) * len.th]; pts.push(k, [k[0] + Math.sin(a2) * len.sh, k[1] + Math.cos(a2) * len.sh + 1]); };
    arm(pose.aF); arm(pose.aB); leg(pose.lF); leg(pose.lB);
    let m = -1e9;
    if (pose.rot) {
      const r = pose.rot * D2R, cs = Math.cos(r), sn = Math.sin(r), cy = -14 * hg;
      for (const p of pts) { const dx = p[0], dy = p[1] - cy; m = Math.max(m, cy + dx * sn + dy * cs); }
    } else for (const p of pts) m = Math.max(m, p[1]);
    hipY = m + 0.6;
  } else hipY = len.th + len.sh - 2;

  F.lift.position.y = hipY;
  F.rotP.rotation.z = -(pose.rot || 0) * D2R;
  F.torso.rotation.z = -lean;
  F.torso.rotation.y = Math.max(-0.25, Math.min(0.4, (pose.aF[0] - 60) / 260));
  F.headP.rotation.z = -pose.head * D2R;
  F.headP.rotation.y = -F.torso.rotation.y * 0.6 + 0.15;
  F.armF.sh.rotation.z = pose.aF[0] * D2R + lean; F.armF.el.rotation.z = pose.aF[1] * D2R;
  F.armB.sh.rotation.z = pose.aB[0] * D2R + lean; F.armB.el.rotation.z = pose.aB[1] * D2R;
  F.armF.sh.rotation.x = -0.08; F.armB.sh.rotation.x = 0.1;
  F.legF.hj.rotation.z = pose.lF[0] * D2R; F.legF.knee.rotation.z = -pose.lF[1] * D2R; F.legF.ankle.rotation.z = -(pose.lF[0] - pose.lF[1]) * D2R;
  F.legB.hj.rotation.z = pose.lB[0] * D2R; F.legB.knee.rotation.z = -pose.lB[1] * D2R; F.legB.ankle.rotation.z = -(pose.lB[0] - pose.lB[1]) * D2R;
  F.legF.hj.rotation.x = -0.05; F.legB.hj.rotation.x = 0.05;
  const mirror = (facing < 0) !== !!pose.flip;
  F.root.scale.x = mirror ? -1 : 1;
  for (const fn of F.anim) fn(t, speed || 0);
}

// parlama / renk tonu
export function setEmissive(F, color, k) {
  const c = F.emis;
  if (!color || k <= 0) { if (c.r === 0 && c.g === 0 && c.b === 0) return; c.setRGB(0, 0, 0); }
  else c.set(color).multiplyScalar(k);
  for (const m of F.mats) m.emissive.copy(c);
}

export function disposeFighter(F) {
  for (const m of F.mats) m.dispose();
  F.root.traverse(o => { if (o.geometry && !GEO_VALUES.has(o.geometry)) o.geometry.dispose(); });
}
const GEO_VALUES = { has: (g) => [...GEO.values()].includes(g) };
