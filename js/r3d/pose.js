/* Poz sistemi: dövüş durumundan eklem açıları üretir (2D ve 3D ortak) */
const GD = window.GameData;
  function P(o) { return Object.assign({ lean: 6, head: 0, aF: [60, 95], aB: [35, 100], lF: [22, 18], lB: [-18, 12], rot: 0, ground: true, flip: false }, o); }
const CROUCH = { lean: 18, aF: [75, 100], aB: [45, 110], lF: [85, 135], lB: [15, 125] };
const AIR = { lean: 4, aF: [110, 70], aB: [70, 80], lF: [75, 115], lB: [35, 120] };
const HURT = { lean: -22, head: -12, aF: [25, 40], aB: [10, 30], lF: [12, 10], lB: [-26, 12] };
const ANIMS = {
  jab: [P({ lean: 8, aF: [72, 85], lF: [26, 16], lB: [-22, 10] }), P({ lean: 14, aF: [92, 2], aB: [40, 110], lF: [30, 14], lB: [-26, 8] })],
  strong: [P({ lean: -6, aF: [30, 130], aB: [50, 90], lF: [28, 18], lB: [-24, 10] }), P({ lean: 24, aF: [96, 0], aB: [10, 50], lF: [38, 22], lB: [-34, 4] })],
  kick: [P({ lean: -8, aF: [50, 100], aB: [30, 90], lF: [65, 95], lB: [-8, 6] }), P({ lean: -22, aF: [45, 90], aB: [20, 70], lF: [98, 0], lB: [-6, 4] })],
  cjab: [P({ ...CROUCH, aF: [75, 80] }), P({ ...CROUCH, aF: [95, 0] })],
  cupper: [P({ ...CROUCH, aF: [60, 120] }), P({ lean: -2, aF: [172, 8], aB: [30, 90], lF: [40, 60], lB: [-10, 40] })],
  sweep: [P({ ...CROUCH, lean: 30, aF: [95, 60] }), P({ lean: 36, aF: [110, 40], aB: [70, 20], lF: [90, 0], lB: [-20, 140] })],
  jpunch: [P({ ...AIR, aF: [80, 80] }), P({ ...AIR, aF: [118, 0] })],
  jstrong: [P({ ...AIR, aF: [40, 120] }), P({ ...AIR, lean: 18, aF: [100, 0] })],
  jkick: [P({ ...AIR }), P({ ...AIR, lean: -12, lF: [72, 0], lB: [20, 120] })],
  fireball: [P({ lean: -4, aF: [25, 130], aB: [25, 130], lF: [34, 20], lB: [-34, 12] }), P({ lean: 16, aF: [90, 0], aB: [86, 8], lF: [38, 22], lB: [-36, 6] })],
  uppercut: [P({ ...CROUCH, aF: [40, 120] }), P({ ...AIR, lean: -4, aF: [176, 0], aB: [30, 90], lF: [10, 40], lB: [-25, 70] })],
  throw: [P({ lean: -8, aF: [160, 70] }), P({ lean: 14, aF: [100, 0], aB: [30, 100] })],
  vanish: [P({ ...CROUCH }), P({ ...CROUCH })],
  charge: [P({ lean: 20, aF: [30, 110], lF: [40, 60], lB: [-20, 60] }), P({ lean: 42, aF: [40, 130], aB: [20, 100], lF: [45, 30], lB: [-45, 8] })],
  slam: [P({ lean: -6, aF: [176, 15], aB: [172, 15] }), P({ ...CROUCH, lean: 34, aF: [80, 10], aB: [75, 10] })],
  cast: [P({ lean: -2, aF: [30, 130] }), P({ lean: 12, aF: [92, 0], aB: [30, 100] })],
  icecast: [P({ lean: -4, aF: [25, 130], aB: [25, 130] }), P({ lean: 14, aF: [88, 0], aB: [80, 6], lF: [38, 22], lB: [-36, 6] })],
  field: [P({ ...CROUCH, aF: [60, 140], aB: [60, 140] }), P({ lean: 0, aF: [160, 20], aB: [150, 20], lF: [30, 10], lB: [-30, 10] })],
  counter: [P({ lean: -4, aF: [130, 150], aB: [110, 150] }), P({ lean: -6, aF: [138, 150], aB: [118, 150], lF: [28, 20], lB: [-26, 14] })],
  spin: [P({ lean: -6, lF: [60, 90] }), P({ lean: -14, aF: [90, 10], aB: [90, 10], lF: [95, 0], lB: [-8, 6] })],
  flip: [P({ ...CROUCH }), P({ ...AIR, lF: [90, 10], lB: [30, 100] })],
  rush: [P({ ...CROUCH }), P({ lean: 40, aF: [20, 40], aB: [10, 30], lF: [50, 30], lB: [-50, 10] })],
  quake: [P({ ...CROUCH }), P({ ...AIR, aF: [176, 15], aB: [172, 15] })],
  storm: [P({ lean: -8, aF: [176, 10], aB: [172, 10] }), P({ lean: -8, aF: [176, 10], aB: [172, 10] })],
  tornado: [P({ lean: -6 }), P({ lean: -10, aF: [95, 5], aB: [95, 5], lF: [95, 0], lB: [-8, 6] })]
};
ANIMS.beam = ANIMS.fireball;

function getPose(f, chId) {
  const st = f.st || 0, b = Math.sin(st * 0.11);
  switch (f.s) {
    case 'idle': return P({ lean: 6 + b * 1.5, aF: [60 + b * 3, 95], aB: [35, 100 + b * 3], lF: [22, 18 + b * 5], lB: [-18, 12 + b * 5] });
    case 'walk': { const c = Math.sin(st * 0.24); return P({ lean: 8, aF: [60 + c * 6, 95], aB: [35 - c * 6, 100], lF: [16 + c * 24, 18 + Math.max(0, -c) * 30], lB: [-16 - c * 24, 18 + Math.max(0, c) * 30] }); }
    case 'crouch': case 'getup': return P(CROUCH);
    case 'jump': return P({ ...AIR, ground: false });
    case 'fall': return P({ ...AIR, ground: false, rot: -((st * 16) % 360) });
    case 'hitstun': case 'locked': return P({ ...HURT, lean: HURT.lean + (st % 4 < 2 ? -3 : 0) });
    case 'iced': return P(HURT);
    case 'blockstun': return f.cb ? P({ ...CROUCH, aF: [140, 150], aB: [120, 150] }) : P({ lean: -4, aF: [145, 150], aB: [125, 155], lF: [24, 16], lB: [-26, 10] });
    case 'airhit': return P({ ...HURT, ground: false, rot: -Math.min(95, st * 7) });
    case 'down': case 'ko': return P({ lean: 0, aF: [165, 10], aB: [150, 20], lF: [8, 6], lB: [-6, 10], rot: -90 });
    case 'win': return P({ lean: -4, aF: [172 + b * 4, 4], aB: [30, 100], lF: [20, 10], lB: [-20, 10] });
    case 'seq': return P(ANIMS.rush[1]);
    case 'attack': {
      const anim = GD.moveAnim(chId, f.mv);
      const a = ANIMS[anim] || ANIMS.jab;
      let p;
      if (anim === 'quake') p = f.a ? a[1] : (f.mp === 0 ? a[0] : ANIMS.slam[1]);
      else p = f.mp === 1 ? a[1] : a[0];
      p = P(p);
      if ((anim === 'spin' || anim === 'tornado') && f.mp === 1) p.flip = Math.floor(f.mt / (anim === 'tornado' ? 3 : 4)) % 2 === 1;
      if (anim === 'flip') { if (f.mp === 1) p.rot = -((f.mt * 30) % 360); else if (f.mp === 2) p = P({ ...AIR }); }
      if (f.a && !['quake'].includes(anim)) p.ground = anim === 'spin' ? true : p.ground;
      return p;
    }
    default: return P({});
  }
}


export { P, ANIMS, getPose };
