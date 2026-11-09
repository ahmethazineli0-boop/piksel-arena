/* PİKSEL ARENA — sentezlenmiş chiptune sesler ve müzik */
(function () {
  'use strict';
  let ac = null, master, sfx, mus, noiseBuf, musicTimer = null, musicStep = 0, nextTime = 0, track = null;
  const st = { muted: false, music: true, volume: 0.6 };

  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ac = new AC();
    master = ac.createGain(); master.gain.value = st.muted ? 0 : st.volume; master.connect(ac.destination);
    sfx = ac.createGain(); sfx.gain.value = 0.55; sfx.connect(master);
    mus = ac.createGain(); mus.gain.value = st.music ? 0.16 : 0; mus.connect(master);
    noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  function tone(freq, dur, type, vol, slide, delay, dest) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type || 'square'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
    g.gain.setValueAtTime(vol || 0.2, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(dest || sfx); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(dur, vol, freq, type, delay, slide) {
    if (!ac) return;
    const t = ac.currentTime + (delay || 0);
    const s = ac.createBufferSource(); s.buffer = noiseBuf;
    const f = ac.createBiquadFilter(); f.type = type || 'lowpass'; f.frequency.setValueAtTime(freq || 2000, t);
    if (slide) f.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol || 0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(sfx); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
  }

  const S = {
    hit(h) {
      noise(0.08 + h * 0.05, 0.35 + h * 0.1, 1800 + h * 600, 'lowpass', 0, 300);
      tone(160 - h * 30, 0.12 + h * 0.05, 'square', 0.25, 50);
      if (h >= 2) tone(90, 0.3, 'sawtooth', 0.2, 30);
    },
    block() { noise(0.05, 0.25, 4000, 'highpass'); tone(900, 0.05, 'square', 0.08, 600); },
    swing(h) { noise(0.07 + h * 0.03, 0.12, 1200, 'bandpass', 0, 3000); },
    special(c, m) {
      if (c === 'kaan' && m === 's1') { noise(0.3, 0.25, 800, 'lowpass', 0, 3000); tone(200, 0.25, 'sawtooth', 0.12, 400); }
      else if (c === 'volt') { tone(1200, 0.2, 'square', 0.1, 300); noise(0.2, 0.18, 6000, 'highpass'); }
      else if (c === 'ayaz') { tone(1800, 0.25, 'triangle', 0.15, 2600); tone(2400, 0.2, 'sine', 0.08, 1800, 0.05); }
      else if (c === 'yildiz') { noise(0.1, 0.2, 5000, 'bandpass', 0, 1500); tone(1400, 0.06, 'square', 0.06); }
      else if (c === 'demir') { tone(110, 0.3, 'square', 0.25, 50); noise(0.3, 0.25, 400, 'lowpass'); }
      else { noise(0.18, 0.2, 2000, 'bandpass', 0, 5000); tone(500, 0.15, 'triangle', 0.12, 900); }
    },
    ult() {
      [262, 330, 392, 523, 659].forEach((f, i) => tone(f, 0.25, 'square', 0.12, null, i * 0.06));
      noise(0.8, 0.2, 300, 'lowpass', 0.1, 4000);
      tone(65, 0.9, 'sawtooth', 0.2, 130);
    },
    ko() { tone(220, 0.6, 'sawtooth', 0.25, 40); noise(0.9, 0.35, 1200, 'lowpass', 0, 80); tone(110, 0.8, 'square', 0.2, 30, 0.1); },
    round() { tone(523, 0.1, 'square', 0.12); tone(659, 0.15, 'square', 0.12, null, 0.1); },
    fight() { [392, 523, 659, 784].forEach((f, i) => tone(f, 0.15, 'square', 0.14, null, i * 0.05)); noise(0.3, 0.15, 3000, 'highpass', 0.2); },
    clash() { tone(1500, 0.15, 'square', 0.12, 300); noise(0.15, 0.25, 5000, 'highpass'); },
    teleport() { tone(300, 0.12, 'sine', 0.15, 1800); },
    freeze() { tone(2000, 0.4, 'triangle', 0.15, 3000); noise(0.4, 0.15, 7000, 'highpass'); },
    shatter() { noise(0.5, 0.4, 8000, 'highpass', 0, 1500); for (let i = 0; i < 6; i++) tone(1500 + Math.random() * 2500, 0.08, 'triangle', 0.08, null, i * 0.04); },
    counter() { tone(1600, 0.08, 'square', 0.15); tone(2400, 0.2, 'triangle', 0.15, null, 0.06); },
    armor() { tone(300, 0.1, 'square', 0.15, 200); noise(0.08, 0.3, 3000, 'highpass'); },
    quake() { tone(55, 0.8, 'sawtooth', 0.35, 25); noise(1, 0.45, 300, 'lowpass', 0, 60); },
    land() { noise(0.12, 0.25, 500, 'lowpass'); tone(80, 0.1, 'square', 0.15, 40); },
    jump() { tone(400, 0.08, 'square', 0.06, 800); },
    bolt() { noise(0.35, 0.35, 8000, 'highpass', 0, 800); tone(80, 0.3, 'sawtooth', 0.2, 40); },
    ui() { tone(880, 0.05, 'square', 0.08); },
    select() { tone(660, 0.06, 'square', 0.08); tone(990, 0.08, 'square', 0.08, null, 0.05); },
    chat() { tone(1046, 0.06, 'triangle', 0.08); tone(1318, 0.08, 'triangle', 0.06, null, 0.05); },
    ready() { [523, 659, 784].forEach((f, i) => tone(f, 0.1, 'square', 0.1, null, i * 0.05)); },
    count() { tone(440, 0.12, 'square', 0.12); }
  };

  // ---- müzik (basit sekanslayıcı)
  const n = s => 440 * Math.pow(2, (s - 9) / 12); // 0 = C4
  const TRACKS = {
    menu: { bpm: 104, bass: [-24, -24, -17, -17, -20, -20, -19, -19], lead: [12, null, 7, null, 10, 12, null, 15, 14, null, 10, null, 7, null, 5, 7] },
    fight: { bpm: 150, bass: [-24, -24, -12, -24, -21, -21, -9, -21, -19, -19, -7, -19, -17, -17, -5, -17], lead: [0, 3, 7, 10, 12, 10, 7, 3, 2, 5, 9, 12, 14, 12, 9, 5] }
  };
  function scheduleMusic() {
    if (!ac || !track) return;
    const T = TRACKS[track], step = 60 / T.bpm / 2;
    while (nextTime < ac.currentTime + 0.25) {
      const i = musicStep;
      const b = T.bass[i % T.bass.length];
      const tt = nextTime - ac.currentTime;
      if (b != null) tone(n(b), step * 0.9, 'triangle', 0.5, null, tt, mus);
      const l = T.lead[i % T.lead.length];
      if (l != null && (track === 'fight' || i % 2 === 0)) tone(n(l + 12), step * 0.6, 'square', 0.13, null, tt, mus);
      if (track === 'fight' && i % 4 === 0) {
        const s = ac.createBufferSource(); s.buffer = noiseBuf; const g = ac.createGain();
        const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = i % 8 === 4 ? 1500 : 6000;
        g.gain.setValueAtTime(i % 8 === 4 ? 0.35 : 0.15, nextTime); g.gain.exponentialRampToValueAtTime(0.001, nextTime + 0.08);
        s.connect(f); f.connect(g); g.connect(mus); s.start(nextTime); s.stop(nextTime + 0.1);
      }
      nextTime += step; musicStep++;
    }
  }
  function playMusic(name) {
    init(); if (!ac) return;
    if (track === name) return;
    track = name; musicStep = 0; nextTime = ac.currentTime + 0.05;
    if (!musicTimer) musicTimer = setInterval(scheduleMusic, 60);
  }
  function stopMusic() { track = null; }

  function say(text) {
    try {
      if (st.muted || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      const v = speechSynthesis.getVoices().find(v => /^tr/i.test(v.lang));
      if (v) u.voice = v; u.lang = 'tr-TR'; u.rate = 1.05; u.pitch = 0.7; u.volume = st.volume;
      speechSynthesis.cancel(); speechSynthesis.speak(u);
    } catch (e) { }
  }

  window.SFX = {
    init, play(name, ...a) { try { init(); if (ac && S[name]) S[name](...a); } catch (e) { } },
    playMusic, stopMusic, say,
    setMuted(m) { st.muted = m; if (master) master.gain.value = m ? 0 : st.volume; },
    setMusic(on) { st.music = on; if (mus) mus.gain.value = on ? 0.16 : 0; },
    setVolume(v) { st.volume = v; if (master && !st.muted) master.gain.value = v; },
    state: st
  };
})();
