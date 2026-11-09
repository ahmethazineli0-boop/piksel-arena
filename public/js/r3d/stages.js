/* 3D arenalar. Dövüş zemini y=0, dövüş hattı z=0, oyun alanı x: 0..480 */
import * as THREE from 'three';

function rng(seed) { let s = seed >>> 0 || 1; return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return ((s >>> 0) % 1000003) / 1000003; }; }
const std = (c, r, m, e) => { const x = new THREE.MeshStandardMaterial({ color: c, roughness: r == null ? 0.8 : r, metalness: m || 0, envMapIntensity: 0.35 }); if (e) { x.emissive = new THREE.Color(e[0]); x.emissiveIntensity = e[1]; } return x; };
const basic = (c, k) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k || 1), toneMapped: false, fog: true });

function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
function noise(ctx, w, h, a, r) { for (let i = 0; i < w * h / 40; i++) { ctx.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${a * r()})`; ctx.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); } }

function sky(stops, stars, r) {
  const g = new THREE.SphereGeometry(2600, 32, 16);
  const cols = stops.map(c => new THREE.Color(c));
  const m = new THREE.ShaderMaterial({
    uniforms: { c0: { value: cols[0] }, c1: { value: cols[1] }, c2: { value: cols[2] }, c3: { value: cols[3] } },
    vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `varying vec3 vP; uniform vec3 c0,c1,c2,c3; void main(){ float h = clamp(vP.y * 2.2 + 0.08, 0.0, 1.0);
      vec3 col = h < 0.25 ? mix(c0, c1, h / 0.25) : h < 0.6 ? mix(c1, c2, (h - 0.25) / 0.35) : mix(c2, c3, (h - 0.6) / 0.4);
      gl_FragColor = vec4(col, 1.0);
      #include <colorspace_fragment>
    }`,
    side: THREE.BackSide, depthWrite: false, toneMapped: false, fog: false
  });
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(g, m));
  if (stars) {
    const n = stars, p = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const th = r() * Math.PI * 2, ph = 0.08 + r() * 1.3; p[i * 3] = Math.cos(th) * Math.cos(ph) * 2400; p[i * 3 + 1] = Math.sin(ph) * 2400; p[i * 3 + 2] = Math.sin(th) * Math.cos(ph) * 2400; }
    const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(p, 3));
    grp.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: '#ffffff', size: 2.2, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.85 })));
  }
  return grp;
}
function moon(col, k, x, y, z, r, glow) {
  const g = new THREE.Group();
  const tex = canvasTex(256, 256, (c, w) => {
    const gr = c.createRadialGradient(128, 128, 20, 128, 128, 128);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.42, '#ffffff'); gr.addColorStop(0.5, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = gr; c.fillRect(0, 0, w, w);
    c.fillStyle = 'rgba(0,0,0,0.12)'; for (const [a, b, rr] of [[100, 105, 14], [150, 150, 10], [120, 160, 7], [155, 100, 6]]) { c.beginPath(); c.arc(a, b, rr, 0, 7); c.fill(); }
  });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color(col).multiplyScalar(k), transparent: true, depthWrite: false, toneMapped: false, fog: false }));
  m.position.set(x, y, z); g.add(m);
  return g;
}
function windowsTex(r, cols, density) {
  return canvasTex(128, 256, (c, w, h) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    for (let y = 6; y < h - 6; y += 12) for (let x = 6; x < w - 6; x += 12) if (r() < density) { c.fillStyle = cols[Math.floor(r() * cols.length)]; c.globalAlpha = 0.5 + r() * 0.5; c.fillRect(x, y, 6, 7); }
    c.globalAlpha = 1;
  });
}
function mosque(x, z, s, mat, winMat) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s);
  const add = (geo, m, px, py, pz, sx, sy, sz) => { const o = new THREE.Mesh(geo, m); o.position.set(px, py, pz); if (sx) o.scale.set(sx, sy, sz); g.add(o); return o; };
  add(new THREE.BoxGeometry(110, 40, 80), mat, 0, 20, 0);
  add(new THREE.CylinderGeometry(30, 32, 16, 24), mat, 0, 48, 0);
  add(new THREE.SphereGeometry(30, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), mat, 0, 56, 0);
  add(new THREE.CylinderGeometry(1.2, 1.2, 14, 6), mat, 0, 92, 0);
  for (const sx of [-1, 1]) {
    add(new THREE.SphereGeometry(16, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat, sx * 40, 40, 0);
    for (const sz of [-1, 1]) {
      add(new THREE.CylinderGeometry(3.2, 3.6, 150, 12), mat, sx * 70, 75, sz * 30);
      add(new THREE.TorusGeometry(4.6, 1.2, 6, 14), mat, sx * 70, 110, sz * 30).rotation.x = Math.PI / 2;
      add(new THREE.ConeGeometry(3.6, 22, 12), mat, sx * 70, 161, sz * 30);
      add(new THREE.SphereGeometry(1.4, 8, 6), winMat, sx * 70, 112, sz * 30 + 4);
    }
  }
  for (let i = -3; i <= 3; i++) add(new THREE.BoxGeometry(5, 9, 1), winMat, i * 13, 22, 40.6);
  return g;
}

// ------------------------------------------------------------ sahne yapıcılar
export function buildStage(id) {
  const S = { id, group: new THREE.Group(), updates: [], lights: [], weather: null, key: null };
  const r = rng(id.length * 9973 + 17);
  const G = S.group;
  const add = (geo, mat, x, y, z, opt) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); if (opt && opt.shadow) m.castShadow = true; if (opt && opt.recv) m.receiveShadow = true; G.add(m); return m; };

  const keyLight = (col, int, pos, shadowCol) => {
    const d = new THREE.DirectionalLight(col, int);
    d.position.set(240 + pos[0], pos[1], pos[2]); d.target.position.set(240, 0, 0);
    d.castShadow = true; d.shadow.mapSize.set(2048, 2048); d.shadow.bias = -0.0004; d.shadow.normalBias = 0.6;
    const sc = d.shadow.camera; sc.left = -330; sc.right = 330; sc.top = 220; sc.bottom = -120; sc.near = 10; sc.far = 1400;
    G.add(d, d.target); S.key = d; return d;
  };
  const hemi = (sky, gr, int) => { const h = new THREE.HemisphereLight(sky, gr, int); G.add(h); return h; };
  const rim = (col, int, pos) => { const d = new THREE.DirectionalLight(col, int); d.position.set(240 + pos[0], pos[1], pos[2]); d.target.position.set(240, 30, 0); G.add(d, d.target); return d; };
  const point = (col, int, x, y, z, dist) => { const l = new THREE.PointLight(col, int, dist || 220, 1.2); l.position.set(x, y, z); G.add(l); S.lights.push(l); return l; };

  if (id === 'istanbul' || id === 'kis') {
    const kis = id === 'kis';
    S.fog = [kis ? '#1b2a44' : '#1a0f33', 260, 2200];
    G.add(sky(kis ? ['#4a6680', '#22385a', '#0f1d38', '#060c1c'] : ['#8a3270', '#4a1a5e', '#1a0c3a', '#05031a'], 700, r));
    G.add(moon(kis ? '#e8f2ff' : '#fff1d6', 1.15, 520, 420, -1900, 120));
    keyLight(kis ? '#cfe0ff' : '#c8c0ff', kis ? 1.7 : 1.9, [-160, 300, 320]);
    hemi(kis ? '#7f98c0' : '#7a5ab8', kis ? '#4a5a70' : '#2a1838', kis ? 0.75 : 0.75);
    rim(kis ? '#9fd0ff' : '#ff7ad0', 1.6, [200, 120, -300]);
    const silMat = std(kis ? '#1a2638' : '#150a30', 0.95);
    const winMat = basic('#ffcf6b', 2.2);
    // su
    const water = add(new THREE.PlaneGeometry(3600, 1400), new THREE.MeshStandardMaterial({ color: kis ? '#0e1a2c' : '#0b0722', roughness: 0.12, metalness: 0.55, envMapIntensity: 0.25 }), 240, -14, -800);
    water.rotation.x = -Math.PI / 2;
    // ay yansıması
    const refl = add(new THREE.PlaneGeometry(60, 600), new THREE.MeshBasicMaterial({ color: new THREE.Color('#fff1d6').multiplyScalar(0.9), transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }), 480, -13, -1100);
    refl.rotation.x = -Math.PI / 2;
    // uzak şehir
    const wtex = windowsTex(r, ['#ffcf6b', '#ff9f5b', '#fff1c2'], 0.35);
    const bmat = new THREE.MeshStandardMaterial({ color: kis ? '#1e2a3c' : '#170c36', roughness: 0.9, emissive: '#ffffff', emissiveMap: wtex, emissiveIntensity: 1.2, envMapIntensity: 0.2 });
    for (let i = 0; i < 70; i++) {
      const w = 30 + r() * 60, h = 30 + r() * 110, x = -900 + r() * 2300, z = -1300 - r() * 500;
      add(new THREE.BoxGeometry(w, h, 40), bmat, x, h / 2 - 14, z);
      if (kis) add(new THREE.BoxGeometry(w + 2, 3, 42), std('#e8f0fa', 0.9), x, h - 13, z);
    }
    G.add(mosque(-120, -1150, 1.6, silMat, winMat));
    G.add(mosque(620, -1250, 1.9, silMat, winMat));
    // Galata kulesi benzeri
    add(new THREE.CylinderGeometry(22, 24, 160, 20), silMat, 240, 66, -1350);
    add(new THREE.ConeGeometry(26, 60, 20), silMat, 240, 176, -1350);
    for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; add(new THREE.BoxGeometry(5, 8, 1), winMat, 240 + Math.cos(a) * 23, 120, -1350 + Math.sin(a) * 23).rotation.y = -a + Math.PI / 2; }
    // köprü
    const bridgeMat = std(kis ? '#2a3448' : '#201640', 0.7, 0.3);
    const tx = [-260, 740], bz = -700;
    for (const x of tx) { add(new THREE.BoxGeometry(14, 260, 14), bridgeMat, x - 20, 116, bz); add(new THREE.BoxGeometry(14, 260, 14), bridgeMat, x + 20, 116, bz); add(new THREE.BoxGeometry(60, 10, 14), bridgeMat, x, 200, bz); add(new THREE.BoxGeometry(60, 10, 14), bridgeMat, x, 120, bz); }
    add(new THREE.BoxGeometry(1800, 8, 30), bridgeMat, 240, 62, bz);
    const cablePts = []; for (let i = 0; i <= 60; i++) { const x = tx[0] + (tx[1] - tx[0]) * i / 60, k = (i / 60) * 2 - 1; cablePts.push(new THREE.Vector3(x, 66 + 180 * k * k, bz)); }
    add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts), 80, 1.6, 6), bridgeMat, 0, 0, 0);
    // renk değiştiren köprü ışıkları
    const nL = 90, inst = new THREE.InstancedMesh(new THREE.SphereGeometry(2.6, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), nL);
    const mtx = new THREE.Matrix4();
    for (let i = 0; i < nL; i++) { const x = -700 + i * 2400 / nL; let y = 66; if (x > tx[0] && x < tx[1]) { const k = (x - tx[0]) / (tx[1] - tx[0]) * 2 - 1; y = 66 + 180 * k * k; } mtx.setPosition(x, y, bz + 4); inst.setMatrixAt(i, mtx); inst.setColorAt(i, new THREE.Color('#ffffff')); }
    G.add(inst);
    const hc = new THREE.Color();
    S.updates.push(t => { if (t % 3) return; for (let i = 0; i < nL; i++) { hc.setHSL(((t * 0.004 + i * 0.012) % 1), 0.9, 0.6).multiplyScalar(3); inst.setColorAt(i, hc); } inst.instanceColor.needsUpdate = true; });
    // rıhtım zemini
    const ftex = canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = kis ? '#aebcd0' : '#3b3150'; c.fillRect(0, 0, w, h);
      const tile = 64;
      for (let y = 0; y < h; y += tile) for (let x = 0; x < w; x += tile) {
        const k = r() * 0.12; c.fillStyle = kis ? `rgba(160,180,210,${0.15 + k})` : `rgba(${80 + k * 200},${66 + k * 150},${110 + k * 200},1)`;
        c.fillRect(x + 2, y + 2, tile - 4, tile - 4);
      }
      noise(c, w, h, kis ? 0.06 : 0.1, r);
      if (kis) for (let i = 0; i < 40; i++) { c.fillStyle = 'rgba(230,238,250,0.6)'; c.beginPath(); c.ellipse(r() * w, r() * h, 10 + r() * 40, 5 + r() * 12, 0, 0, 7); c.fill(); }
    }, [16, 6]);
    const floor = add(new THREE.PlaneGeometry(1600, 360), new THREE.MeshStandardMaterial({ map: ftex, roughness: kis ? 0.75 : 0.55, metalness: 0.05, envMapIntensity: 0.4 }), 240, 0, 90, { recv: true });
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
    add(new THREE.BoxGeometry(1600, 14, 4), std(kis ? '#c8d4e4' : '#2a2242', 0.7), 240, -7, -90);
    // korkuluk
    const railMat = std('#1a1430', 0.4, 0.7);
    add(new THREE.BoxGeometry(1600, 2, 2), railMat, 240, 26, -84, { shadow: true });
    add(new THREE.BoxGeometry(1600, 1.5, 1.5), railMat, 240, 14, -84);
    if (kis) add(new THREE.BoxGeometry(1600, 1.6, 4), std('#9aa8bc', 0.95), 240, 27.6, -84);
    for (let x = -560; x <= 1040; x += 24) add(new THREE.BoxGeometry(2, 26, 2), railMat, x, 13, -84, { shadow: true });
    // sokak lambaları
    for (const lx of [40, 240, 440]) {
      add(new THREE.CylinderGeometry(1.4, 2, 110, 10), railMat, lx, 55, -70, { shadow: true });
      add(new THREE.BoxGeometry(14, 2, 2), railMat, lx + 5, 108, -70);
      add(new THREE.SphereGeometry(3.6, 16, 12), basic('#fff1c2', 1.6), lx + 11, 104, -70);
      point(kis ? '#dfeaff' : '#ffcf6b', kis ? 60 : 90, lx + 11, 100, -60, 240);
    }
    S.weather = kis ? 'snow' : null;
  } else if (id === 'dojo') {
    S.fog = ['#c4607a', 400, 2600];
    G.add(sky(['#ffd38a', '#ff8a6a', '#b0468a', '#2a1d5c'], 120, r));
    const sun = add(new THREE.CircleGeometry(150, 48), basic('#fff0b0', 1.8), 240, 110, -2200); sun.material.fog = false;
    const sunGlow = add(new THREE.CircleGeometry(320, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffb46a').multiplyScalar(0.6), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }), 240, 110, -2210);
    keyLight('#ffc89a', 2.3, [-240, 260, 260]);
    hemi('#ffb0c8', '#4a2a3a', 0.9);
    rim('#ffd090', 2.4, [60, 120, -400]);
    // bulutlar
    const cm = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ffc0d0').multiplyScalar(0.9), transparent: true, opacity: 0.55, depthWrite: false, toneMapped: false, fog: false });
    for (let i = 0; i < 12; i++) { const c = add(new THREE.SphereGeometry(1, 16, 8), cm, -900 + r() * 2300, 250 + r() * 380, -2000); c.scale.set(140 + r() * 200, 14 + r() * 14, 10); }
    // dağlar
    for (const [col, z, n, hmax] of [['#6a3a7a', -1700, 9, 520], ['#4c2a62', -1250, 10, 360], ['#3a1f4e', -900, 8, 220]]) {
      const m = new THREE.MeshStandardMaterial({ color: col, roughness: 1, flatShading: true, envMapIntensity: 0.1 });
      for (let i = 0; i < n; i++) { const h = hmax * (0.5 + r() * 0.6); add(new THREE.ConeGeometry(h * 1.2, h, 6 + Math.floor(r() * 3)), m, -900 + i * (2400 / n) + r() * 100, h / 2 - 20, z + r() * 100); }
    }
    // pagoda
    const pm = std('#2a1430', 0.9);
    for (let i = 0; i < 5; i++) { add(new THREE.BoxGeometry(60 - i * 9, 22, 60 - i * 9), pm, 560, 30 + i * 32, -820); add(new THREE.ConeGeometry((80 - i * 11) / 1.3, 14, 4), pm, 560, 46 + i * 32, -820).rotation.y = Math.PI / 4; }
    // torii
    const red = std('#c0283c', 0.55), redD = std('#5a0f1a', 0.6);
    for (const x of [195, 285]) add(new THREE.CylinderGeometry(5, 6, 150, 16), red, x, 75, -260, { shadow: true });
    add(new THREE.BoxGeometry(150, 9, 12), red, 240, 150, -260, { shadow: true });
    add(new THREE.BoxGeometry(170, 7, 14), redD, 240, 158, -260);
    add(new THREE.BoxGeometry(120, 7, 9), red, 240, 122, -260);
    add(new THREE.BoxGeometry(14, 22, 3), std('#1a0a0a', 0.6), 240, 136, -253);
    // kiraz ağaçları
    const trunk = std('#3a2420', 0.9);
    const blossom = new THREE.MeshStandardMaterial({ color: '#ffa8cc', roughness: 0.9, emissive: '#ff6aa0', emissiveIntensity: 0.18, envMapIntensity: 0.2 });
    const bgeo = new THREE.IcosahedronGeometry(1, 1);
    for (const [tx, tz] of [[-30, -180], [80, -230], [400, -210], [520, -170], [-160, -320], [640, -330]]) {
      add(new THREE.CylinderGeometry(3, 6, 80, 8), trunk, tx, 40, tz, { shadow: true });
      for (const [bx, by, br] of [[-16, 70, -0.6], [18, 66, 0.6]]) add(new THREE.CylinderGeometry(1.5, 3, 40, 6), trunk, tx + bx * 0.6, by, tz).rotation.z = br;
      const inst = new THREE.InstancedMesh(bgeo, blossom, 34); const mt = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3();
      for (let i = 0; i < 34; i++) { const s = 10 + r() * 12; sc.set(s, s * 0.8, s); mt.compose(new THREE.Vector3(tx + (r() - 0.5) * 80, 88 + (r() - 0.5) * 34, tz + (r() - 0.5) * 50), q, sc); inst.setMatrixAt(i, mt); }
      inst.castShadow = true; G.add(inst);
    }
    // ahşap zemin
    const ftex = canvasTex(512, 512, (c, w, h) => {
      for (let y = 0, i = 0; y < h; y += 32, i++) {
        const base = 120 + r() * 30; c.fillStyle = `rgb(${base + 40},${base * 0.62},${base * 0.36})`; c.fillRect(0, y, w, 32);
        c.fillStyle = 'rgba(40,20,10,0.6)'; c.fillRect(0, y, w, 2);
        for (let x = (i * 97) % 200; x < w; x += 200) c.fillRect(x, y, 2, 32);
        for (let k = 0; k < 6; k++) { c.fillStyle = `rgba(80,40,20,${0.15 + r() * 0.15})`; c.fillRect(0, y + 4 + r() * 24, w, 1); }
      }
      noise(c, w, h, 0.08, r);
    }, [10, 4]);
    const floor = add(new THREE.PlaneGeometry(1600, 360), new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.62, envMapIntensity: 0.4 }), 240, 0, 90, { recv: true });
    floor.rotation.x = -Math.PI / 2;
    const wood = std('#5c3622', 0.8);
    add(new THREE.BoxGeometry(1600, 3, 3), wood, 240, 30, -88, { shadow: true });
    for (let x = -560; x <= 1040; x += 40) add(new THREE.BoxGeometry(4, 30, 4), wood, x, 15, -88, { shadow: true });
    add(new THREE.BoxGeometry(1600, 16, 6), std('#4a2a1a', 0.9), 240, -8, -92);
    // fenerler
    for (const lx of [60, 180, 300, 420]) {
      const lg = new THREE.Group(); lg.position.set(lx, 110, -76); G.add(lg);
      const lm = new THREE.Mesh(new THREE.CylinderGeometry(7, 7, 14, 16), new THREE.MeshStandardMaterial({ color: '#e8462e', emissive: '#ff7a3a', emissiveIntensity: 1.6, roughness: 0.7 }));
      lm.position.y = -14; lg.add(lm);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 8, 4), wood); rope.position.y = -4; lg.add(rope);
      S.updates.push(t => { lg.rotation.z = Math.sin(t * 0.03 + lx) * 0.06; });
      point('#ffa060', 22, lx, 105, -70, 150);
    }
    S.weather = 'petals';
  } else if (id === 'neon') {
    S.fog = ['#120a26', 200, 1500];
    G.add(sky(['#2c0f48', '#160934', '#0a0418', '#03020a'], 80, r));
    keyLight('#8aa0ff', 1.3, [-120, 320, 260]);
    hemi('#5a4aa8', '#120a20', 0.55);
    rim('#ff2fd1', 2.2, [260, 120, -260]);
    const wtexs = [windowsTex(r, ['#2a8fb0', '#b02a8f', '#b09a2a', '#5a5ab0'], 0.32), windowsTex(r, ['#ffcf6b', '#2ff3ff'], 0.18)];
    // binalar
    for (let i = 0; i < 26; i++) {
      const near = i < 12, w = near ? 70 + r() * 50 : 50 + r() * 70, h = near ? 160 + r() * 160 : 200 + r() * 300;
      const x = near ? -380 + i * 105 + r() * 20 : -800 + (i - 12) * 160 + r() * 40, z = near ? -200 - r() * 40 : -600 - r() * 300;
      const m = new THREE.MeshStandardMaterial({ color: near ? '#16102c' : '#0f0a24', roughness: 0.85, emissive: '#ffffff', emissiveMap: wtexs[i % 2], emissiveIntensity: near ? 0.9 : 0.7, envMapIntensity: 0.2 });
      add(new THREE.BoxGeometry(w, h, 50), m, x, h / 2, z);
    }
    // neon tabelalar
    const words = ['RAMEN', 'KEBAP', 'ARCADE', 'OTEL', 'ÇAY', 'PİKSEL', 'BAR', 'DÖNER', '24 SAAT'];
    const ncols = ['#ff2fd1', '#2ff3ff', '#ffe14d', '#7c4dff', '#4dff9a'];
    const signs = [];
    for (let i = 0; i < 9; i++) {
      const col = ncols[i % ncols.length], word = words[i];
      const vert = i % 3 === 2;
      const tex = canvasTex(vert ? 128 : 512, vert ? 512 : 128, (c, w, h) => {
        c.fillStyle = '#05020a'; c.fillRect(0, 0, w, h);
        c.strokeStyle = col; c.lineWidth = 8; c.shadowColor = col; c.shadowBlur = 20; c.strokeRect(8, 8, w - 16, h - 16);
        c.fillStyle = '#ffffff'; c.font = `bold ${vert ? 70 : 80}px Arial`; c.textAlign = 'center'; c.textBaseline = 'middle';
        if (vert) [...word].slice(0, 6).forEach((ch, k) => c.fillText(ch, w / 2, 60 + k * 76)); else c.fillText(word, w / 2, h / 2 + 4);
        c.globalCompositeOperation = 'source-atop'; c.fillStyle = col; c.globalAlpha = 0.55; c.fillRect(0, 0, w, h);
      });
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: new THREE.Color('#ffffff').multiplyScalar(1.8), toneMapped: false });
      const sw = vert ? 22 : 80, sh = vert ? 88 : 22;
      const x = -300 + i * 105 + r() * 30, y = 70 + r() * 100;
      const m = add(new THREE.PlaneGeometry(sw, sh), mat, x, y, -168);
      signs.push({ m, ph: r() * 10, base: 1.8 });
      if (i % 3 === 0) point(col, 70, x, y - 20, -120, 240);
    }
    S.updates.push(t => { for (const s of signs) { const on = Math.sin(t * 0.05 + s.ph) > -0.9 || (t + s.ph * 10) % 47 > 4; s.m.material.color.setScalar(on ? s.base : 0.25); } });
    // ıslak asfalt
    const ftex = canvasTex(512, 512, (c, w, h) => {
      c.fillStyle = '#16122a'; c.fillRect(0, 0, w, h); noise(c, w, h, 0.25, r);
      c.fillStyle = 'rgba(220,220,255,0.25)'; for (let x = 0; x < w; x += 128) c.fillRect(x, h / 2 - 3, 64, 6);
      for (let i = 0; i < 8; i++) { c.fillStyle = 'rgba(5,5,15,0.5)'; c.beginPath(); c.ellipse(r() * w, r() * h, 30 + r() * 50, 10 + r() * 20, 0, 0, 7); c.fill(); }
    }, [8, 3]);
    const rough = canvasTex(256, 256, (c, w, h) => { c.fillStyle = '#909090'; c.fillRect(0, 0, w, h); for (let i = 0; i < 14; i++) { c.fillStyle = '#101010'; c.beginPath(); c.ellipse(r() * w, r() * h, 15 + r() * 30, 6 + r() * 14, 0, 0, 7); c.fill(); } }, [8, 3]);
    rough.colorSpace = THREE.NoColorSpace;
    const floor = add(new THREE.PlaneGeometry(1600, 360), new THREE.MeshStandardMaterial({ map: ftex, roughnessMap: rough, roughness: 0.5, metalness: 0.35, envMapIntensity: 0.6 }), 240, 0, 90, { recv: true });
    floor.rotation.x = -Math.PI / 2;
    add(new THREE.BoxGeometry(1600, 4, 30), std('#2a2050', 0.7), 240, 2, -110, { recv: true });
    // yağmur
    const nR = 700, rp = new Float32Array(nR * 6);
    for (let i = 0; i < nR; i++) { const x = -200 + r() * 900, y = r() * 300, z = -150 + r() * 330; rp.set([x, y, z, x - 1.5, y - 9, z], i * 6); }
    const rg = new THREE.BufferGeometry(); rg.setAttribute('position', new THREE.BufferAttribute(rp, 3));
    const rain = new THREE.LineSegments(rg, new THREE.LineBasicMaterial({ color: '#9ab0ff', transparent: true, opacity: 0.35, depthWrite: false }));
    rain.frustumCulled = false; G.add(rain);
    S.updates.push((t, cam) => {
      const a = rg.attributes.position.array;
      for (let i = 0; i < nR; i++) { const o = i * 6; a[o + 1] -= 7; a[o + 4] -= 7; a[o] -= 1.2; a[o + 3] -= 1.2; if (a[o + 4] < 0) { const x = cam.position.x - 300 + Math.random() * 600, z = -150 + Math.random() * 330, y = 260 + Math.random() * 40; a[o] = x; a[o + 1] = y; a[o + 2] = z; a[o + 3] = x - 1.5; a[o + 4] = y - 9; a[o + 5] = z; } }
      rg.attributes.position.needsUpdate = true;
    });
    S.weather = 'splash';
  } else if (id === 'saray') {
    S.fog = ['#2a0410', 260, 1900];
    G.add(sky(['#a0202e', '#5e1226', '#260410', '#0a0004'], 200, r));
    G.add(moon('#ff3355', 1.1, -100, 380, -1800, 160));
    keyLight('#ffb0a0', 2.0, [-200, 300, 300]);
    hemi('#ff6a6a', '#1a0408', 0.65);
    rim('#ff1e56', 2.8, [220, 140, -300]);
    const dark = std('#1a0610', 0.9), marbleD = std('#2a1020', 0.35, 0.1), gold = std('#c8a228', 0.3, 0.9);
    // uzak saray
    for (let i = 0; i < 14; i++) { const h = 80 + r() * 200, x = -700 + i * 150; add(new THREE.BoxGeometry(80 + r() * 60, h, 60), dark, x, h / 2, -1200 - r() * 200); if (r() < 0.6) add(new THREE.ConeGeometry(20, 90 + r() * 60, 8), dark, x, h + 40, -1200); }
    G.add(mosque(240, -1000, 2.4, dark, basic('#ff1e56', 2.4)));
    // sütunlar
    const colTex = canvasTex(256, 512, (c, w, h) => { c.fillStyle = '#3a1828'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.strokeStyle = `rgba(255,220,230,${0.05 + r() * 0.1})`; c.lineWidth = 1 + r() * 2; c.beginPath(); let x = r() * w, y = 0; c.moveTo(x, y); while (y < h) { x += (r() - 0.5) * 30; y += 20 + r() * 30; c.lineTo(x, y); } c.stroke(); } });
    const colMat = new THREE.MeshStandardMaterial({ map: colTex, roughness: 0.3, metalness: 0.1, envMapIntensity: 0.6 });
    const banTex = canvasTex(128, 384, (c, w, h) => {
      c.fillStyle = '#6a0c24'; c.fillRect(0, 0, w, h); c.fillStyle = '#c8a228'; c.fillRect(0, 0, w, 10); c.fillRect(0, 0, 8, h); c.fillRect(w - 8, 0, 8, h);
      c.beginPath(); c.arc(w / 2, 140, 34, 0, 7); c.lineWidth = 8; c.strokeStyle = '#c8a228'; c.stroke();
      c.beginPath(); c.moveTo(w / 2, 100); c.lineTo(w / 2 + 22, 160); c.lineTo(w / 2 - 22, 160); c.closePath(); c.fillStyle = '#ffd23f'; c.fill();
      c.fillStyle = '#4a0818'; c.beginPath(); c.moveTo(0, h); c.lineTo(w / 2, h - 50); c.lineTo(w, h); c.fill();
    });
    for (let x = -440; x <= 920; x += 120) {
      add(new THREE.CylinderGeometry(9, 10, 200, 20), colMat, x, 100, -120, { shadow: true });
      add(new THREE.BoxGeometry(30, 10, 30), marbleD, x, 205, -120); add(new THREE.BoxGeometry(30, 10, 30), marbleD, x, 5, -120);
      add(new THREE.BoxGeometry(28, 3, 28), gold, x, 199, -120);
      const b = add(new THREE.PlaneGeometry(36, 108), new THREE.MeshStandardMaterial({ map: banTex, roughness: 0.85, side: THREE.DoubleSide }), x + 60, 140, -118);
      S.updates.push(t => { b.rotation.y = Math.sin(t * 0.02 + x) * 0.08; });
    }
    add(new THREE.BoxGeometry(1600, 16, 30), marbleD, 240, 212, -120);
    // mermer zemin
    const ftex = canvasTex(512, 512, (c, w, h) => {
      for (let y = 0; y < h; y += 128) for (let x = 0; x < w; x += 128) { c.fillStyle = ((x + y) / 128) % 2 ? '#2a1420' : '#4a2436'; c.fillRect(x, y, 128, 128); }
      for (let i = 0; i < 60; i++) { c.strokeStyle = `rgba(255,220,230,${0.04 + r() * 0.08})`; c.lineWidth = 1; c.beginPath(); let x = r() * w, y = r() * h; c.moveTo(x, y); for (let k = 0; k < 6; k++) { x += (r() - 0.5) * 80; y += (r() - 0.5) * 80; c.lineTo(x, y); } c.stroke(); }
      c.strokeStyle = 'rgba(200,162,40,0.5)'; c.lineWidth = 2; for (let x = 0; x <= w; x += 128) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); c.beginPath(); c.moveTo(0, x); c.lineTo(w, x); c.stroke(); }
    }, [10, 3]);
    const floor = add(new THREE.PlaneGeometry(1600, 360), new THREE.MeshStandardMaterial({ map: ftex, roughness: 0.18, metalness: 0.15, envMapIntensity: 0.8 }), 240, 0, 90, { recv: true });
    floor.rotation.x = -Math.PI / 2;
    const carpet = add(new THREE.PlaneGeometry(1600, 50), new THREE.MeshStandardMaterial({ color: '#6a0a20', roughness: 0.95 }), 240, 0.3, -20, { recv: true });
    carpet.rotation.x = -Math.PI / 2; carpet.receiveShadow = true;
    for (const z of [-45, 5]) { const tr = add(new THREE.PlaneGeometry(1600, 2.4), basic('#c8a228', 1.1), 240, 0.4, z); tr.rotation.x = -Math.PI / 2; }
    // mangallar
    const fireMats = ['#ff1e56', '#ff7a00', '#ffd23f'].map(c => basic(c, 2.6));
    for (const bx of [50, 190, 290, 430]) {
      add(new THREE.CylinderGeometry(2, 3, 34, 8), gold, bx, 17, -80, { shadow: true });
      add(new THREE.CylinderGeometry(12, 6, 8, 16), gold, bx, 38, -80, { shadow: true });
      const flames = [];
      for (let k = 0; k < 7; k++) { const f = add(new THREE.ConeGeometry(3, 12, 8), fireMats[k % 3], bx + (k - 3) * 2.6, 48, -80 + ((k * 7) % 5 - 2) * 2); flames.push(f); }
      const pl = point('#ff6a2a', 40, bx, 60, -70, 180);
      S.updates.push(t => { flames.forEach((f, k) => { const s = 0.7 + 0.5 * Math.abs(Math.sin(t * 0.2 + k * 1.3 + bx)); f.scale.set(1, s * 1.4, 1); f.position.y = 42 + 8 * s; }); pl.intensity = 36 + Math.sin(t * 0.3 + bx) * 6 + Math.random() * 4; });
    }
    S.weather = 'embers';
  }
  return S;
}
