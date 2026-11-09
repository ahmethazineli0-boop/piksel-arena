/* PİKSEL ARENA — telefon/tablet dokunmatik kontroller */
(function () {
  'use strict';
  const B = { L: 1, R: 2, U: 4, D: 8, LP: 16, HP: 32, K: 64, S1: 128, S2: 256, ULT: 512 };
  const isTouch = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const T = { isTouch, joy: 0, btn: 0, pressed: 0, onChat: null, onTaunt: null, visible: false };
  if (isTouch) document.documentElement.classList.add('touch');
  const vib = ms => { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) { } };
  T.vibrate = vib;

  function build() {
    const fight = document.getElementById('fight');
    const el = document.createElement('div');
    el.id = 'touch'; el.className = 'touch-ui hidden';
    el.innerHTML = `
      <div class="joy-zone" id="joyZone"><div class="joy-base" id="joyBase"><div class="joy-knob" id="joyKnob"></div></div>
        <div class="joy-hint">Hareket · geri çek = BLOK</div></div>
      <div class="tbtns">
        <button class="tb sp" data-b="S1"><b>Ö1</b><small id="tbS1"></small></button>
        <button class="tb sp" data-b="S2"><b>Ö2</b><small id="tbS2"></small></button>
        <button class="tb ult" data-b="ULT" id="tbUlt"><b>ULTİ</b></button>
        <button class="tb" data-b="LP"><b>HAFİF</b><small>yumruk</small></button>
        <button class="tb" data-b="HP"><b>AĞIR</b><small>yumruk</small></button>
        <button class="tb" data-b="K"><b>TEKME</b></button>
      </div>
      <div class="ttop">
        <button class="tsm" id="tChat">💬</button>
        <button class="tsm" id="tTaunt">😄</button>
        <div class="taunts hidden" id="tTaunts"></div>
      </div>`;
    fight.appendChild(el);
    const rot = document.createElement('div');
    rot.id = 'rotate'; rot.className = 'rotate';
    rot.innerHTML = '<div class="rot-ic">📱</div><div>Telefonunu <b>yan çevir</b></div><small>Dokun: tam ekran</small>';
    rot.addEventListener('click', () => T.fullscreen());
    document.body.appendChild(rot);
    el.addEventListener('contextmenu', e => e.preventDefault());

    // ---- joystick (dokunduğun yerde açılır)
    const zone = el.querySelector('#joyZone'), base = el.querySelector('#joyBase'), knob = el.querySelector('#joyKnob');
    let jid = null, cx = 0, cy = 0;
    const R = () => Math.min(64, window.innerHeight * 0.13);
    const setJoy = (dx, dy) => {
      const r = R(), d = Math.hypot(dx, dy), k = d > r ? r / d : 1;
      knob.style.transform = `translate(${dx * k}px, ${dy * k}px)`;
      let bits = 0;
      if (dx > r * 0.35) bits |= B.R; else if (dx < -r * 0.35) bits |= B.L;
      if (dy < -r * 0.5) bits |= B.U; else if (dy > r * 0.5) bits |= B.D;
      if ((bits & B.U) && !(T.joy & B.U)) vib(6);
      T.joy = bits;
    };
    zone.addEventListener('pointerdown', e => {
      if (jid !== null) return;
      jid = e.pointerId; zone.setPointerCapture(jid);
      const zr = zone.getBoundingClientRect();
      cx = e.clientX; cy = e.clientY;
      base.style.left = (cx - zr.left) + 'px'; base.style.top = (cy - zr.top) + 'px';
      base.classList.add('on'); setJoy(0, 0);
      e.preventDefault();
    });
    zone.addEventListener('pointermove', e => { if (e.pointerId === jid) { setJoy(e.clientX - cx, e.clientY - cy); e.preventDefault(); } });
    const endJoy = e => { if (e.pointerId !== jid) return; jid = null; T.joy = 0; base.classList.remove('on'); knob.style.transform = ''; };
    zone.addEventListener('pointerup', endJoy); zone.addEventListener('pointercancel', endJoy);

    // ---- butonlar (çoklu dokunma)
    for (const b of el.querySelectorAll('.tb')) {
      const bit = B[b.dataset.b];
      let pid = null;
      b.addEventListener('pointerdown', e => {
        pid = e.pointerId; b.setPointerCapture(pid);
        T.btn |= bit; T.pressed |= bit; b.classList.add('down'); vib(bit === B.ULT ? 30 : 8);
        e.preventDefault();
      });
      const up = e => { if (e.pointerId !== pid) return; pid = null; T.btn &= ~bit; b.classList.remove('down'); };
      b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
    }
    // ---- sohbet ve laf atma
    el.querySelector('#tChat').addEventListener('click', () => T.onChat && T.onChat());
    const tl = el.querySelector('#tTaunts');
    el.querySelector('#tTaunt').addEventListener('click', () => tl.classList.toggle('hidden'));
    (window.GameData ? window.GameData.TAUNTS : []).forEach((txt, i) => {
      const x = document.createElement('button'); x.className = 'tsm wide'; x.textContent = txt;
      x.addEventListener('click', () => { tl.classList.add('hidden'); T.onTaunt && T.onTaunt(i); });
      tl.appendChild(x);
    });
  }

  T.held = () => T.joy | T.btn;
  T.take = () => { const p = T.pressed; T.pressed = 0; return p; };
  T.show = (on) => {
    const el = document.getElementById('touch'); if (!el) return;
    T.visible = on && isTouch;
    el.classList.toggle('hidden', !T.visible);
    if (!T.visible) { T.joy = 0; T.btn = 0; T.pressed = 0; }
  };
  T.setMoves = (s1, s2) => { const a = document.getElementById('tbS1'), b = document.getElementById('tbS2'); if (a) a.textContent = s1 || ''; if (b) b.textContent = s2 || ''; };
  let lastUlt = false;
  T.setUlt = (ready) => { if (ready === lastUlt) return; lastUlt = ready; const u = document.getElementById('tbUlt'); if (u) u.classList.toggle('ready', ready); if (ready) vib([20, 40, 20]); };
  T.fullscreen = () => {
    if (!isTouch) return;
    const d = document.documentElement;
    try {
      const p = d.requestFullscreen ? d.requestFullscreen({ navigationUI: 'hide' }) : (d.webkitRequestFullscreen ? d.webkitRequestFullscreen() : null);
      const lock = () => { try { screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => { }); } catch (e) { } };
      if (p && p.then) p.then(lock).catch(() => { }); else lock();
    } catch (e) { }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build); else build();
  window.Touch = T;
})();
