/* 3D efektler: parçacıklar, halkalar, mermiler, tehlikeler, ışınlar, ışık havuzu */
import * as THREE from 'three';
import { glowMat } from './character.js';

const GROUND = 196;
export const W = (x, y, z) => new THREE.Vector3(x, GROUND - y, z || 0);
const TMPC = new THREE.Color();

// ------------------------------------------------------------ parçacık sistemi
export class Particles {
  constructor(cap, additive) {
    this.cap = cap; this.n = 0;
    this.p = new Float32Array(cap * 3); this.c = new Float32Array(cap * 3); this.s = new Float32Array(cap); this.a = new Float32Array(cap);
    this.v = new Float32Array(cap * 3); this.life = new Float32Array(cap); this.max = new Float32Array(cap); this.g = new Float32Array(cap); this.drag = new Float32Array(cap); this.s0 = new Float32Array(cap); this.grow = new Float32Array(cap); this.wob = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.p, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.c, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.s, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.a, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 }, uSoft: { value: additive ? 1 : 0 } },
      vertexShader: `attribute float size; attribute float alpha; attribute vec3 color; varying vec3 vC; varying float vA;
        uniform float uScale; void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position,1.0);
        gl_PointSize = max(1.0, size * uScale / -mv.z); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; uniform float uSoft; void main(){ vec2 q = gl_PointCoord - 0.5; float d = length(q);
        if (d > 0.5) discard; float a = uSoft > 0.5 ? pow(1.0 - d * 2.0, 1.6) : smoothstep(0.5, 0.2, d) * 0.55; gl_FragColor = vec4(vC, a * vA);
        #include <colorspace_fragment>
      }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.geo = g;
    this.pts.renderOrder = additive ? 10 : 5;
  }
  emit(o) {
    if (this.n >= this.cap) return;
    const i = this.n++, i3 = i * 3;
    this.p[i3] = o.x; this.p[i3 + 1] = o.y; this.p[i3 + 2] = o.z || 0;
    this.v[i3] = o.vx || 0; this.v[i3 + 1] = o.vy || 0; this.v[i3 + 2] = o.vz || 0;
    TMPC.set(o.color || '#ffffff'); const k = o.k || 1;
    this.c[i3] = TMPC.r * k; this.c[i3 + 1] = TMPC.g * k; this.c[i3 + 2] = TMPC.b * k;
    this.life[i] = this.max[i] = o.life || 30; this.s0[i] = o.size || 2; this.s[i] = this.s0[i];
    this.g[i] = o.g || 0; this.drag[i] = o.drag == null ? 0.96 : o.drag; this.grow[i] = o.grow || 0; this.wob[i] = o.wob || 0; this.a[i] = 1;
  }
  burst(x, y, z, n, cols, speed, life, size, opt) {
    opt = opt || {};
    for (let i = 0; i < n; i++) {
      const th = Math.random() * Math.PI * 2, ph = (Math.random() - 0.5) * Math.PI * (opt.flat ? 0.3 : 1);
      const v = speed * (0.35 + Math.random() * 0.8);
      this.emit({ x, y, z, vx: Math.cos(th) * Math.cos(ph) * v, vy: Math.sin(th) * Math.cos(ph) * v + (opt.up || 0), vz: Math.sin(ph) * v,
        life: life * (0.6 + Math.random() * 0.7), size: size * (0.6 + Math.random() * 0.8), color: cols[i % cols.length], k: opt.k || 1, g: opt.g || 0, drag: opt.drag, grow: opt.grow });
    }
  }
  update() {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= 1;
      if (this.life[i] <= 0) { this.kill(i); continue; }
      const i3 = i * 3, d = this.drag[i];
      this.v[i3 + 1] -= this.g[i];
      this.v[i3] *= d; this.v[i3 + 1] *= d; this.v[i3 + 2] *= d;
      if (this.wob[i]) this.v[i3] += Math.sin(this.life[i] * 0.15 + i) * this.wob[i];
      this.p[i3] += this.v[i3]; this.p[i3 + 1] += this.v[i3 + 1]; this.p[i3 + 2] += this.v[i3 + 2];
      const k = this.life[i] / this.max[i];
      this.a[i] = Math.min(1, k * 1.8);
      this.s[i] = this.s0[i] * (1 + this.grow[i] * (1 - k));
      i++;
    }
    const g = this.geo;
    g.setDrawRange(0, this.n);
    for (const k of ['position', 'color', 'size', 'alpha']) g.attributes[k].needsUpdate = true;
  }
  kill(i) {
    const j = --this.n;
    if (i === j) return;
    const i3 = i * 3, j3 = j * 3;
    for (const arr of [this.p, this.c, this.v]) { arr[i3] = arr[j3]; arr[i3 + 1] = arr[j3 + 1]; arr[i3 + 2] = arr[j3 + 2]; }
    for (const arr of [this.s, this.a, this.life, this.max, this.g, this.drag, this.s0, this.grow, this.wob]) arr[i] = arr[j];
  }
  clear() { this.n = 0; }
}

// ------------------------------------------------------------ halkalar (şok dalgası)
export class Rings {
  constructor(scene) {
    this.scene = scene; this.list = [];
    this.geo = new THREE.RingGeometry(0.86, 1, 48);
  }
  spawn(pos, color, r0, r1, life, flat, k) {
    const m = new THREE.Mesh(this.geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(k || 2), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
    m.position.copy(pos); if (flat) m.rotation.x = -Math.PI / 2;
    this.scene.add(m);
    this.list.push({ m, r0, r1, life, max: life });
  }
  update(cam) {
    this.list = this.list.filter(r => {
      r.life--;
      const k = 1 - r.life / r.max;
      const s = r.r0 + (r.r1 - r.r0) * (1 - Math.pow(1 - k, 2));
      r.m.scale.setScalar(s);
      r.m.material.opacity = 1 - k;
      if (r.m.rotation.x === 0 && cam) r.m.quaternion.copy(cam.quaternion);
      if (r.life <= 0) { this.scene.remove(r.m); r.m.material.dispose(); return false; }
      return true;
    });
  }
  clear() { for (const r of this.list) { this.scene.remove(r.m); r.m.material.dispose(); } this.list = []; }
}

// ------------------------------------------------------------ ışık havuzu (sabit sayıda: shader yeniden derlenmesin)
export class LightPool {
  constructor(scene, n) {
    this.lights = [];
    for (let i = 0; i < n; i++) { const l = new THREE.PointLight('#ffffff', 0, 160, 1.2); scene.add(l); this.lights.push(l); }
    this.i = 0;
  }
  begin() { this.i = 0; }
  use(pos, color, intensity, dist) {
    if (this.i >= this.lights.length) return;
    const l = this.lights[this.i++];
    l.position.copy(pos); l.color.set(color); l.intensity = intensity; l.distance = dist || 140;
  }
  end() { for (let j = this.i; j < this.lights.length; j++) this.lights[j].intensity = 0; }
}

// ------------------------------------------------------------ mermi ve tehlike görselleri
const G = {};
const gg = (k, f) => G[k] || (G[k] = f());
const glowCache = {};
const gm = (c, k) => { const key = c + k; return glowCache[key] || (glowCache[key] = glowMat(c, k)); };
const addGlow = (c, op) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2), transparent: true, opacity: op == null ? 0.5 : op, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });

export const PROJ_LIGHT = { fire: '#ff7a1a', orb: '#7df9ff', ice: '#9ff3ff', icewave: '#9ff3ff', darkorb: '#ff1e56', bolt: '#bfffff', meteor: '#ff7a1a', shadow: '#b366ff', icicle: '#9ff3ff', shard: '#9ff3ff' };

export function makeProj(kind) {
  const o = new THREE.Group();
  const v = { obj: o, kind, parts: {} };
  switch (kind) {
    case 'fire': case 'darkorb': {
      const dark = kind === 'darkorb';
      v.parts.core = new THREE.Mesh(gg('s12', () => new THREE.SphereGeometry(1, 16, 12)), gm(dark ? '#ff1e56' : '#ffd27a', dark ? 2.6 : 3.2));
      v.parts.core.scale.setScalar(dark ? 4 : 4.5); o.add(v.parts.core);
      v.parts.halo = new THREE.Mesh(G.s12, addGlow(dark ? '#7a1aff' : '#ff5a10', 0.35)); v.parts.halo.scale.setScalar(dark ? 7 : 7.5); o.add(v.parts.halo);
      if (dark) { v.parts.in = new THREE.Mesh(G.s12, new THREE.MeshBasicMaterial({ color: '#100018' })); v.parts.in.scale.setScalar(2.6); o.add(v.parts.in); }
      break;
    }
    case 'orb':
      v.parts.core = new THREE.Mesh(gg('s12', () => new THREE.SphereGeometry(1, 16, 12)), gm('#bfffff', 3)); v.parts.core.scale.setScalar(4); o.add(v.parts.core);
      v.parts.halo = new THREE.Mesh(G.s12, addGlow('#2a8cff', 0.6)); v.parts.halo.scale.setScalar(8); o.add(v.parts.halo);
      v.parts.arcs = new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 6), 3)), new THREE.LineBasicMaterial({ color: new THREE.Color('#e0ffff').multiplyScalar(3), toneMapped: false }));
      o.add(v.parts.arcs);
      break;
    case 'kunai': {
      const steel = new THREE.MeshStandardMaterial({ color: '#d9e2ea', metalness: 0.95, roughness: 0.2, envMapIntensity: 1 });
      const blade = new THREE.Mesh(gg('kb', () => new THREE.ConeGeometry(1.2, 7, 4)), steel); blade.rotation.z = -Math.PI / 2; blade.position.x = 2; o.add(blade);
      const hd = new THREE.Mesh(gg('kh', () => new THREE.CylinderGeometry(0.5, 0.5, 4, 6)), new THREE.MeshStandardMaterial({ color: '#4a1f6b', roughness: 0.6 })); hd.rotation.z = Math.PI / 2; hd.position.x = -2.5; o.add(hd);
      const ring = new THREE.Mesh(gg('kr', () => new THREE.TorusGeometry(1, 0.3, 6, 10)), steel); ring.position.x = -5.2; ring.rotation.y = Math.PI / 2; o.add(ring);
      break;
    }
    case 'shard': case 'ice': {
      const m = new THREE.MeshStandardMaterial({ color: '#bff6ff', emissive: '#4fb8e0', emissiveIntensity: 0.9, metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.88, envMapIntensity: 1.5 });
      const c = new THREE.Mesh(gg('oct', () => new THREE.OctahedronGeometry(1, 0)), m);
      c.scale.set(kind === 'ice' ? 7 : 6, kind === 'ice' ? 3.2 : 1.8, kind === 'ice' ? 3.2 : 1.8); o.add(c); v.parts.c = c;
      v.parts.halo = new THREE.Mesh(gg('s12', () => new THREE.SphereGeometry(1, 16, 12)), addGlow('#9ff3ff', 0.25)); v.parts.halo.scale.setScalar(kind === 'ice' ? 7 : 4); o.add(v.parts.halo);
      break;
    }
    case 'bottle': {
      const glass = new THREE.MeshStandardMaterial({ color: '#2e8b3a', roughness: 0.1, metalness: 0.1, transparent: true, opacity: 0.85, envMapIntensity: 1.5 });
      const b = new THREE.Mesh(gg('bt', () => new THREE.CylinderGeometry(1.6, 1.6, 6, 12)), glass); o.add(b);
      const n = new THREE.Mesh(gg('bn', () => new THREE.CylinderGeometry(0.6, 1.5, 3.4, 12)), glass); n.position.y = 4.5; o.add(n);
      const cap = new THREE.Mesh(gg('bc', () => new THREE.CylinderGeometry(0.7, 0.7, 0.8, 10)), new THREE.MeshStandardMaterial({ color: '#c9a227', metalness: 0.8, roughness: 0.3 })); cap.position.y = 6.5; o.add(cap);
      break;
    }
    case 'shock': case 'icewave': {
      const ice = kind === 'icewave';
      const mat = ice ? new THREE.MeshStandardMaterial({ color: '#cff8ff', emissive: '#3aa8d8', emissiveIntensity: 0.7, roughness: 0.05, transparent: true, opacity: 0.9 })
        : new THREE.MeshStandardMaterial({ color: '#7a5a3a', roughness: 0.95, flatShading: true });
      v.parts.spikes = [];
      for (let i = 0; i < 7; i++) {
        const s = new THREE.Mesh(gg('rk', () => new THREE.ConeGeometry(1, 1, 5)), mat);
        s.position.set((i - 3) * 3.2, 0, (Math.random() - 0.5) * 8); s.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.5);
        s.castShadow = true; o.add(s); v.parts.spikes.push(s);
      }
      break;
    }
    case 'bolt': case 'meteor': case 'icicle': case 'shadow': {
      const col = PROJ_LIGHT[kind];
      v.parts.decal = new THREE.Mesh(gg('dec', () => new THREE.RingGeometry(0.7, 1, 40)), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a3a').multiplyScalar(2.2), transparent: true, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      v.parts.decal.rotation.x = -Math.PI / 2; v.parts.decal.position.y = 0.4; o.add(v.parts.decal);
      v.parts.fill = new THREE.Mesh(gg('decf', () => new THREE.CircleGeometry(1, 40)), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a3a').multiplyScalar(1.2), transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false }));
      v.parts.fill.rotation.x = -Math.PI / 2; v.parts.fill.position.y = 0.3; o.add(v.parts.fill);
      v.parts.col = new THREE.Mesh(gg('colc', () => new THREE.CylinderGeometry(1, 1, 1, 24, 1, true)), addGlow(col, 0.12));
      o.add(v.parts.col);
      if (kind === 'meteor') {
        const rock = new THREE.Mesh(gg('met', () => new THREE.DodecahedronGeometry(1, 1)), new THREE.MeshStandardMaterial({ color: '#3a1a10', emissive: '#ff5a10', emissiveIntensity: 1.4, roughness: 0.9, flatShading: true }));
        rock.scale.setScalar(6); o.add(rock); v.parts.obj = rock;
        v.parts.halo = new THREE.Mesh(gg('s12', () => new THREE.SphereGeometry(1, 16, 12)), addGlow('#ff7a10', 0.5)); v.parts.halo.scale.setScalar(11); o.add(v.parts.halo);
      } else if (kind === 'icicle') {
        const ic = new THREE.Mesh(gg('icc', () => new THREE.ConeGeometry(2.4, 16, 6)), new THREE.MeshStandardMaterial({ color: '#dffaff', emissive: '#4fb8e0', emissiveIntensity: 0.8, roughness: 0.05, transparent: true, opacity: 0.9 }));
        ic.rotation.x = Math.PI; o.add(ic); v.parts.obj = ic;
      } else if (kind === 'shadow') {
        const pil = new THREE.Mesh(gg('pil', () => new THREE.CylinderGeometry(9, 11, 1, 6, 1, true)), new THREE.MeshBasicMaterial({ color: new THREE.Color('#9a3aff').multiplyScalar(1.6), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
        o.add(pil); v.parts.obj = pil;
        const core = new THREE.Mesh(gg('pilc', () => new THREE.CylinderGeometry(5, 6, 1, 6)), new THREE.MeshBasicMaterial({ color: '#12001e' }));
        o.add(core); v.parts.core = core;
      } else {
        v.parts.bolt = new THREE.Mesh(new THREE.BufferGeometry(), new THREE.MeshBasicMaterial({ color: new THREE.Color('#e8ffff').multiplyScalar(4), toneMapped: false }));
        o.add(v.parts.bolt);
      }
      break;
    }
  }
  o.traverse(m => { if (m.isMesh && !m.material.blending) m.castShadow = true; });
  return v;
}

function boltGeo(seed, h) {
  const pts = []; let x = 0, z = 0;
  let s = seed;
  const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let y = h; y > 0; y -= 10 + r() * 10) { pts.push(new THREE.Vector3(x, y, z)); x = (r() - 0.5) * 12; z = (r() - 0.5) * 6; }
  pts.push(new THREE.Vector3(0, 0, 0));
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1), 40, 1.1, 5, false);
}

export function updateProj(v, p, t, P, add) {
  const o = v.obj, d = p.d;
  const kind = v.kind;
  const haz = kind === 'bolt' || kind === 'meteor' || kind === 'icicle' || kind === 'shadow';
  if (haz) {
    o.position.set(p.x, 0, 0);
    const warn = p.t < p.w, a = p.t - p.w;
    const R = kind === 'meteor' ? 15 : kind === 'shadow' ? 13 : 12;
    const pulse = 0.85 + 0.15 * Math.sin(t * 0.6);
    v.parts.decal.visible = v.parts.fill.visible = warn || a < 4;
    v.parts.decal.scale.setScalar(R * (warn ? 1.4 - 0.4 * (p.t / p.w) : 1) * pulse);
    v.parts.fill.scale.setScalar(R * (warn ? p.t / p.w : 1));
    v.parts.col.visible = true;
    v.parts.col.scale.set(R * 0.45, 220, R * 0.45); v.parts.col.position.y = 110;
    v.parts.col.material.opacity = warn ? 0.02 + 0.05 * (p.t / p.w) : Math.max(0, 0.18 - a * 0.02);
    if (kind === 'meteor') {
      const y = warn ? 260 : Math.max(4, 260 - a * 45);
      v.parts.obj.position.set(-y * 0.25, y, 0); v.parts.halo.position.copy(v.parts.obj.position);
      v.parts.obj.visible = v.parts.halo.visible = !warn || p.t > p.w - 6;
      v.parts.obj.rotation.x += 0.2; v.parts.obj.rotation.y += 0.13;
      if (!warn && y > 4) for (let i = 0; i < 3; i++) P.add.emit({ x: p.x - y * 0.25 + (Math.random() - 0.5) * 5, y: y + 4, z: (Math.random() - 0.5) * 5, vx: 0.4, vy: 1.5, life: 18, size: 7, color: i ? '#ff7a10' : '#ffd27a', k: 2, grow: 1 });
      if (!warn && y <= 4) v.parts.obj.visible = v.parts.halo.visible = a < 10;
    } else if (kind === 'icicle') {
      const y = warn ? 240 : Math.max(8, 240 - a * 50);
      v.parts.obj.position.set(0, y, 0); v.parts.obj.visible = !warn || p.t > p.w - 8;
      if (!warn && y <= 8) v.parts.obj.visible = a < 8;
    } else if (kind === 'shadow') {
      const h = warn ? 0 : Math.min(170, a * 40);
      v.parts.obj.visible = v.parts.core.visible = !warn;
      v.parts.obj.scale.set(1, Math.max(0.01, h), 1); v.parts.obj.position.y = h / 2;
      v.parts.core.scale.set(1, Math.max(0.01, h * 0.9), 1); v.parts.core.position.y = h * 0.45;
      v.parts.obj.material.opacity = Math.max(0, 0.8 - Math.max(0, a - 8) * 0.06);
      if (!warn && a < 10) P.add.emit({ x: p.x + (Math.random() - 0.5) * 18, y: Math.random() * h, z: (Math.random() - 0.5) * 10, vy: 1.2, life: 26, size: 5, color: '#b366ff', k: 2 });
    } else {
      v.parts.bolt.visible = !warn && a < 10;
      if (!warn && a % 2 === 0) { v.parts.bolt.geometry.dispose(); v.parts.bolt.geometry = boltGeo(p.i * 97 + a * 13 + 1, 230); }
    }
    return;
  }
  o.position.set(p.x, GROUND - p.y, 0);
  switch (kind) {
    case 'fire': case 'darkorb': {
      const s = 1 + 0.12 * Math.sin(t * 0.8 + p.i);
      v.parts.core.scale.setScalar((kind === 'fire' ? 4.5 : 4) * s); v.parts.halo.scale.setScalar((kind === 'fire' ? 8.5 : 8) * (2 - s));
      for (let i = 0; i < 3; i++) P.add.emit({ x: p.x - d * 3, y: GROUND - p.y + (Math.random() - 0.5) * 5, z: (Math.random() - 0.5) * 5, vx: -d * (0.6 + Math.random()), vy: 0.3 + Math.random() * 0.4, life: 20, size: 7 + Math.random() * 4, color: kind === 'fire' ? (i ? '#ff6a10' : '#ffd27a') : (i ? '#ff1e56' : '#7a1aff'), k: 2, grow: -0.6 });
      break;
    }
    case 'orb': {
      const a = v.parts.arcs.geometry.attributes.position.array;
      for (let i = 0; i < 16; i++) {
        const th = Math.random() * 6.28, ph = Math.random() * 6.28, r0 = 3, r1 = 8 + Math.random() * 6;
        a[i * 6] = Math.cos(th) * r0; a[i * 6 + 1] = Math.sin(th) * r0; a[i * 6 + 2] = Math.cos(ph) * r0;
        a[i * 6 + 3] = Math.cos(th + 0.4) * r1; a[i * 6 + 4] = Math.sin(th + 0.4) * r1; a[i * 6 + 5] = Math.cos(ph) * r1 * 0.6;
      }
      v.parts.arcs.geometry.attributes.position.needsUpdate = true;
      if (t % 2 === 0) P.add.emit({ x: p.x, y: GROUND - p.y, z: 0, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, life: 12, size: 3, color: '#bfffff', k: 2.5 });
      break;
    }
    case 'kunai': o.rotation.z = Math.atan2(-(p.vy || 0), 1) * 0; o.scale.x = d; if (t % 2) P.add.emit({ x: p.x - d * 6, y: GROUND - p.y, vx: -d * 0.5, life: 10, size: 2, color: '#d0b0ff', k: 1.5 }); break;
    case 'shard': case 'ice': o.scale.x = d; v.parts.c.rotation.x += 0.15; if (t % 2) P.add.emit({ x: p.x - d * 6, y: GROUND - p.y + (Math.random() - 0.5) * 4, z: (Math.random() - 0.5) * 4, vx: -d * 0.3, vy: -0.1, life: 22, size: 2.5, color: '#dffaff', k: 2 }); break;
    case 'bottle': o.rotation.z = -d * p.t * 0.32; break;
    case 'shock': case 'icewave': {
      o.position.y = 0;
      v.parts.spikes.forEach((s, i) => { const h = 6 + ((i * 5 + p.t) % 9) + (3 - Math.abs(i - 3)) * 2.5; s.scale.set(kind === 'icewave' ? 2.2 : 3, h, kind === 'icewave' ? 2.2 : 3); s.position.y = h / 2; });
      if (t % 2 === 0) P.dust.emit({ x: p.x + (Math.random() - 0.5) * 20, y: 2, z: (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 1.5, vy: 0.8 + Math.random(), life: 26, size: 9, color: kind === 'icewave' ? '#dffaff' : '#8a7058', grow: 1.2, g: 0.02 });
      break;
    }
  }
}

// ------------------------------------------------------------ ışın (Kaan, Cin, İmparator)
export function makeBeam(pal) {
  const o = new THREE.Group();
  const geo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true); geo.rotateZ(Math.PI / 2); geo.translate(0.5, 0, 0);
  const outer = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(pal[0]).multiplyScalar(1.1), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const mid = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(pal[1]).multiplyScalar(1.4), transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  const core = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: new THREE.Color(pal[2]).multiplyScalar(1.8), toneMapped: false }));
  const ball = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: new THREE.Color(pal[2]).multiplyScalar(1.8), toneMapped: false }));
  o.add(outer, mid, core, ball);
  return { obj: o, outer, mid, core, ball, pal };
}
