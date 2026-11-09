/* PİKSEL ARENA — istemci */
(function () {
  'use strict';
  const GD = window.GameData, R = window.Renderer, SFX = window.SFX;
  const $ = id => document.getElementById(id);
  const B = { L: 1, R: 2, U: 4, D: 8, LP: 16, HP: 32, K: 64, S1: 128, S2: 256, ULT: 512 };
  const STEP = 1000 / 60, INTERP = 55;
  const SLOT_COLORS = ['#ffd23f', '#7df9ff', '#ff6bd0'];

  const ACTIONS = [
    ['L', 'Sola git'], ['R', 'Sağa git'], ['U', 'Zıpla'], ['D', 'Çömel'],
    ['LP', 'Hafif yumruk'], ['HP', 'Ağır yumruk'], ['K', 'Tekme'],
    ['S1', 'Özel hareket 1'], ['S2', 'Özel hareket 2'], ['ULT', 'ULTİ']
  ];
  const DEFAULT_KEYS = {
    L: ['KeyA', 'ArrowLeft'], R: ['KeyD', 'ArrowRight'], U: ['KeyW', 'ArrowUp'], D: ['KeyS', 'ArrowDown'],
    LP: ['KeyJ'], HP: ['KeyK'], K: ['KeyL'], S1: ['KeyU'], S2: ['KeyI'], ULT: ['KeyO', 'Space']
  };

  // ------------------------------------------------------------ profil
  const PKEY = 'pikselArena.v1';
  let profile;
  try { profile = JSON.parse(localStorage.getItem(PKEY)) || {}; } catch { profile = {}; }
  profile = Object.assign({ name: '', char: 'kaan', customs: {}, keys: null, muted: false }, profile);
  if (!profile.keys) profile.keys = JSON.parse(JSON.stringify(DEFAULT_KEYS));
  profile.story = Object.assign({ gold: 0, unlocked: 1, items: {} }, profile.story || {});
  profile.story.items = GD.cleanEquip(profile.story.items);
  const save = () => { try { localStorage.setItem(PKEY, JSON.stringify(profile)); } catch { } };
  function customFor(id) {
    const ch = GD.getChar(id);
    return Object.assign({ primary: ch.defaults.primary, secondary: ch.defaults.secondary, aura: ch.look.glow, acc: 'none', title: '' }, profile.customs[id] || {});
  }
  SFX.setMuted(profile.muted);

  // ------------------------------------------------------------ durum
  const S = {
    ws: null, myId: null, room: null, code: '', screen: 'menu', players: [], settings: {}, mySlot: -1,
    snaps: [], offset: null, lastEvFr: 0, ended: null, held: 0, pressed: 0, lastSent: -1, lastSendT: 0, ping: 0,
    chat: []
  };

  function show(name) {
    S.screen = name;
    for (const s of document.querySelectorAll('.screen')) s.classList.toggle('active', s.id === name);
    document.body.className = 'scr-' + name;
    if (window.Touch) window.Touch.show(name === 'fight' && S.mySlot >= 0);
    if (name === 'fight' || name === 'menu') R.resize();
    if (name === 'fight') SFX.playMusic('fight');
    else SFX.playMusic('menu');
  }
  let toastT;
  function toast(text) { const t = $('toast'); t.textContent = text; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2600); }

  // ------------------------------------------------------------ ağ
  function connect(roomCode) {
    const name = $('nameInput').value.trim();
    if (!name) { $('menuStatus').textContent = 'Önce bir isim yaz!'; $('nameInput').focus(); return; }
    profile.name = name; save();
    $('menuStatus').textContent = 'Bağlanıyor...';
    SFX.init();
    // Sunucu yoksa (telefonda ana ekrandan açıldıysa) oyun mantığı telefonun içinde çalışır
    const ws = S.online ? new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host) : new window.Local.LocalSocket();
    S.autoBot = !S.online;
    S.ws = ws;
    ws.onopen = () => {
      send({ t: 'hello', name, room: roomCode, char: profile.char, custom: customFor(profile.char), equip: profile.story.items, unlocked: profile.story.unlocked });
    };
    ws.onmessage = e => { let m; try { m = JSON.parse(e.data); } catch { return; } onMsg(m); };
    ws.onclose = () => {
      if (S.ws !== ws) return;
      S.ws = null; S.room = null;
      if (S.screen !== 'menu') toast('Sunucu bağlantısı koptu.');
      $('menuStatus').textContent = S.online ? 'Bağlantı yok. Sunucu açık mı?' : '';
      show('menu');
    };
  }
  function send(o) { if (S.ws && S.ws.readyState === 1) S.ws.send(JSON.stringify(o)); }
  setInterval(() => send({ t: 'ping', ts: performance.now() }), 2000);

  function onMsg(m) {
    switch (m.t) {
      case 'welcome':
        S.myId = m.id; S.code = m.code;
        $('menuStatus').textContent = '';
        S.chat = []; $('chatLog').innerHTML = '';
        for (const c of m.history || []) addChat(c, true);
        if (S.online) history.replaceState(null, '', '?oda=' + m.code);
        show('lobby');
        break;
      case 'room':
        onRoom(m);
        // çevrimdışı: odaya girer girmez bir rakip bot ekle
        if (S.autoBot && m.host === S.myId) { S.autoBot = false; if (!m.slots.some(x => x && x.bot)) send({ t: 'bot', on: true }); }
        break;
      case 'chat': addChat(m); break;
      case 'error': $('menuStatus').textContent = m.text; toast(m.text); break;
      case 'pong': S.ping = Math.round(performance.now() - m.ts); $('ping').textContent = S.ping + ' ms'; break;
      case 'start': onStart(m); break;
      case 'st': onSnap(m.s); break;
      case 'end': onEnd(m); break;
      case 'taunt': if (S.screen === 'fight' && m.fi >= 0) R.taunt(m.fi, GD.TAUNTS[m.i]); else addChat({ from: m.name, slot: m.slot, text: GD.TAUNTS[m.i] }); break;
    }
  }

  // ------------------------------------------------------------ lobi
  const charCards = {};
  function buildLobby() {
    const grid = $('charGrid');
    for (const ch of GD.CHARACTERS) {
      const d = document.createElement('div'); d.className = 'char-card';
      const cv = document.createElement('canvas'); cv.width = 140; cv.height = 136;
      const nm = document.createElement('div'); nm.className = 'nm'; nm.textContent = ch.name;
      d.append(cv, nm);
      d.onclick = () => selectChar(ch.id);
      grid.append(d);
      charCards[ch.id] = { el: d, cv };
    }
    for (const a of GD.ACCESSORIES) {
      const b = document.createElement('button'); b.className = 'btn small'; b.textContent = a.name; b.dataset.id = a.id;
      b.onclick = () => updateCustom({ acc: a.id });
      $('accList').append(b);
    }
    for (const st of GD.STAGES) { const o = document.createElement('option'); o.value = st.id; o.textContent = st.name; $('setStage').append(o); }
    for (const md of GD.MODES) { const o = document.createElement('option'); o.value = md.id; o.textContent = md.name; $('setMode').append(o); }
    $('setMode').onchange = () => send({ t: 'settings', mode: $('setMode').value });
    $('setChapter').onchange = () => send({ t: 'settings', chapter: +$('setChapter').value });
    for (const tb of document.querySelectorAll('.tab')) tb.onclick = () => showTab(tb.dataset.tab);
    buildShop();
    $('colPrimary').oninput = e => updateCustom({ primary: e.target.value });
    $('colSecondary').oninput = e => updateCustom({ secondary: e.target.value });
    $('colAura').oninput = e => updateCustom({ aura: e.target.value });
    $('titleInput').oninput = e => updateCustom({ title: e.target.value });
    $('btnResetCustom').onclick = () => { delete profile.customs[profile.char]; save(); refreshCharUI(); sendSelect(); };
    for (const id of ['setWins', 'setTime', 'setStage', 'setHp']) $(id).onchange = sendSettings;
    $('btnReady').onclick = () => { const me = mySlotObj(); if (!me) return; send({ t: 'ready', v: !me.ready }); SFX.play('ready'); if (!me.ready && window.Touch) window.Touch.fullscreen(); };
    $('btnBot').onclick = () => send({ t: 'bot', on: true });
    $('btnLeave').onclick = () => { send({ t: 'leave' }); const ws = S.ws; S.ws = null; if (ws) ws.close(); history.replaceState(null, '', location.pathname); show('menu'); };
    $('roomChip').onclick = () => {
      const link = location.origin + '/?oda=' + S.code;
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => toast('Davet linki kopyalandı: ' + link), () => toast('Oda kodu: ' + S.code));
    };
    $('chatForm').onsubmit = e => { e.preventDefault(); const v = $('chatInput').value.trim(); if (v) send({ t: 'chat', text: v }); $('chatInput').value = ''; };
    $('btnSound').onclick = toggleMute; $('btnMute2').onclick = toggleMute;
    $('btnKeys').onclick = openKeys; $('btnHelp').onclick = openKeys;
    $('btnFull').onclick = toggleFull;
  }
  function toggleMute() {
    profile.muted = !profile.muted; save(); SFX.setMuted(profile.muted);
    $('btnSound').textContent = $('btnMute2').textContent = profile.muted ? '🔇' : '🔊';
  }
  function toggleFull() { if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => { }); else document.exitFullscreen(); }

  function selectChar(id) {
    if (S.room && S.room.phase !== 'lobby' && S.room.phase !== 'countdown') return;
    profile.char = id; save(); SFX.play('select'); demoT = 0;
    refreshCharUI(); sendSelect();
  }
  function updateCustom(patch) {
    profile.customs[profile.char] = Object.assign(customFor(profile.char), patch); save();
    refreshCustomUI(); sendSelectSoon();
  }
  let selTimer;
  function sendSelectSoon() { clearTimeout(selTimer); selTimer = setTimeout(sendSelect, 160); }
  function sendSelect() { send({ t: 'select', char: profile.char, custom: customFor(profile.char), equip: profile.story.items, unlocked: profile.story.unlocked }); }

  // ------------------------------------------------------------ sekmeler, dükkan, hikaye
  function showTab(id) {
    for (const tb of document.querySelectorAll('.tab')) tb.classList.toggle('sel', tb.dataset.tab === id);
    for (const b of document.querySelectorAll('.tab-body')) b.classList.toggle('hidden', b.id !== id);
    S.tab = id;
  }
  function buildShop() {
    const list = $('shopList'); list.innerHTML = '';
    for (const it of GD.SHOP) {
      const row = document.createElement('div'); row.className = 'shop-item';
      const ic = document.createElement('div'); ic.className = 'ic'; ic.textContent = it.icon;
      const mid = document.createElement('div');
      const nmEl = document.createElement('div'); nmEl.className = 'nm'; nmEl.textContent = it.name;
      const ds = document.createElement('div'); ds.className = 'ds'; ds.textContent = it.desc;
      const lv = document.createElement('div'); lv.className = 'lv';
      for (let k = 0; k < it.max; k++) lv.append(document.createElement('i'));
      mid.append(nmEl, ds, lv);
      const btn = document.createElement('button'); btn.className = 'btn small primary';
      btn.onclick = () => buy(it);
      row.append(ic, mid, btn);
      list.append(row);
      it._ui = { lv, btn };
    }
    refreshShop();
  }
  function refreshShop() {
    const st = profile.story;
    $('goldAmt').textContent = st.gold;
    for (const it of GD.SHOP) {
      const lvl = st.items[it.id] || 0, ui = it._ui; if (!ui) continue;
      [...ui.lv.children].forEach((x, k) => x.classList.toggle('on', k < lvl));
      if (lvl >= it.max) { ui.btn.textContent = it.consumable ? 'DOLU' : 'MAKS'; ui.btn.disabled = true; }
      else { const price = it.prices[lvl]; ui.btn.textContent = `${price} 💰`; ui.btn.disabled = st.gold < price; }
    }
    const e = st.items;
    $('powerInfo').textContent = `Hikaye bonusların: Hasar +%${e.glove * 8} · Alınan hasar -%${e.armor * 6} · Can +%${e.heart * 12} · Hız +%${e.boots * 5} · Ulti +%${e.crystal * 15} · Can emme %${e.ring * 3} · Anka tüyü ${e.feather}`;
  }
  function buy(it) {
    const st = profile.story, lvl = st.items[it.id] || 0;
    if (lvl >= it.max) return;
    const price = it.prices[lvl];
    if (st.gold < price) { toast('Yeterli altının yok!'); return; }
    if (S.room && S.room.phase === 'countdown') { toast('Geri sayım sırasında alışveriş yapılamaz.'); return; }
    st.gold -= price; st.items[it.id] = lvl + 1; save();
    SFX.play('ready'); toast(`${it.icon} ${it.name} ${it.consumable ? 'alındı' : 'seviye ' + (lvl + 1)}!`);
    refreshShop(); sendSelect();
  }
  function refreshStory() {
    const m = S.room; if (!m) return;
    const ch = m.settings.chapter, info = GD.chapterInfo(ch);
    const boss = GD.getBoss(info.boss);
    $('storyTitle').textContent = info.title;
    $('storyBoss').textContent = boss.name; $('storyBossTitle').textContent = boss.title;
    $('storyLevel').textContent = 'Seviye ' + info.level;
    $('storyStage').textContent = (GD.STAGES.find(x => x.id === info.stage) || {}).name || '';
    $('storyReward').textContent = info.reward;
    $('storyIntro').textContent = info.intro;
    $('storyTip').textContent = info.tip;
    $('myProgress').textContent = 'Bölüm ' + profile.story.unlocked;
    const sel = $('setChapter'), max = m.maxChapter;
    if (sel.options.length !== max) {
      sel.innerHTML = '';
      for (let c = 1; c <= max; c++) { const o = document.createElement('option'); o.value = c; o.textContent = GD.chapterInfo(c).title + ' — ' + GD.getBoss(GD.chapterInfo(c).boss).name; sel.append(o); }
    }
    sel.value = ch; sel.disabled = m.host !== S.myId;
    const dots = $('chapterDots'); dots.innerHTML = '';
    for (let c = 1; c <= Math.max(6, max); c++) { const d = document.createElement('i'); d.textContent = c; d.className = c === ch ? 'cur' : c < max ? 'done' : ''; dots.append(d); }
    S.bossPrev = { ch: boss, cu: boss.custom };
    $('storySettings').innerHTML = '';
    const mini = $('storySettings');
    const b1 = document.createElement('b'); b1.textContent = info.title;
    mini.append(b1, document.createTextNode(` — ${boss.name} (Seviye ${info.level}). Ödül: ${info.reward} altın. Hikaye ve dükkan için ortadaki sekmelere bak.`));
  }
  function sendSettings() {
    send({ t: 'settings', wins: +$('setWins').value, time: +$('setTime').value, stage: $('setStage').value, hp: +$('setHp').value });
  }

  function keyName(code) {
    if (!code) return '—';
    if (code.startsWith('Key')) return code.slice(3);
    if (code.startsWith('Digit')) return code.slice(5);
    return ({ ArrowLeft: '←', ArrowRight: '→', ArrowUp: '↑', ArrowDown: '↓', Space: 'Boşluk', ShiftLeft: 'Shift', ShiftRight: 'Shift', ControlLeft: 'Ctrl', Semicolon: 'Ş', Comma: ',', Period: '.', Slash: '/' })[code] || code;
  }
  function refreshCharUI() {
    const ch = GD.getChar(profile.char);
    for (const id in charCards) charCards[id].el.classList.toggle('sel', id === ch.id);
    $('cName').textContent = ch.name; $('cTitle').textContent = ch.title;
    $('cDesc').textContent = ch.desc;
    $('cPassive').textContent = ch.passive.name + ':'; $('cPassiveDesc').textContent = ch.passive.desc;
    const bars = $('cBars'); bars.innerHTML = '';
    for (const [k, v] of Object.entries(ch.bars)) {
      const l = document.createElement('span'); l.textContent = k;
      const b = document.createElement('div'); b.className = 'bar';
      for (let i = 0; i < 5; i++) { const x = document.createElement('i'); if (i < v) x.className = 'on'; b.append(x); }
      bars.append(l, b);
    }
    const K = profile.keys, mv = $('cMoves'); mv.innerHTML = '';
    const mk = (key, name, desc, ult) => {
      const d = document.createElement('div'); d.className = 'move' + (ult ? ' ult' : '');
      const k = document.createElement('span'); k.className = 'k'; k.textContent = key;
      const b = document.createElement('b'); b.textContent = name;
      const p = document.createElement('p'); p.textContent = desc;
      d.append(k, b, p); mv.append(d);
    };
    mk(keyName(K.S1[0]), ch.moves.s1.name, ch.moves.s1.desc);
    mk(keyName(K.S2[0]), ch.moves.s2.name, ch.moves.s2.desc);
    mk(keyName(K.ULT[0]), ch.moves.ult.name, ch.moves.ult.desc, true);
    // paletler
    const pals = $('palettes'); pals.innerHTML = '';
    ch.palettes.forEach(([a, b]) => {
      const d = document.createElement('div'); d.className = 'pal';
      const t1 = document.createElement('div'); t1.style.background = a;
      const t2 = document.createElement('div'); t2.style.background = b;
      d.append(t1, t2); d.title = 'Palet';
      d.onclick = () => updateCustom({ primary: a, secondary: b });
      pals.append(d);
    });
    refreshCustomUI();
  }
  function refreshCustomUI() {
    const ch = GD.getChar(profile.char), cu = customFor(profile.char);
    $('colPrimary').value = cu.primary; $('colSecondary').value = cu.secondary; $('colAura').value = cu.aura;
    if (document.activeElement !== $('titleInput')) $('titleInput').value = cu.title;
    for (const b of $('accList').children) b.classList.toggle('sel', b.dataset.id === cu.acc);
    [...$('palettes').children].forEach((d, i) => d.classList.toggle('sel', ch.palettes[i][0] === cu.primary && ch.palettes[i][1] === cu.secondary));
  }
  function mySlotObj() { return S.room ? S.room.slots.find(s => s && s.id === S.myId) : null; }

  function onRoom(m) {
    const prevPhase = S.room && S.room.phase, prevMode = S.room && S.room.settings.mode;
    S.room = m; S.code = m.code;
    $('roomCode').textContent = m.code;
    const isHost = m.host === S.myId, mode = m.settings.mode, story = mode === 'story';
    for (let i = 0; i < 3; i++) renderSlot(i, m.slots[i], m, isHost);
    $('spectators').textContent = m.spectators.length ? 'İzleyiciler: ' + m.spectators.join(', ') : '';
    const s = m.settings;
    $('setMode').value = mode; $('setMode').disabled = !isHost;
    $('setWins').value = s.wins; $('setTime').value = s.time; $('setStage').value = s.stage; $('setHp').value = s.hp;
    for (const id of ['setWins', 'setTime', 'setStage', 'setHp']) $(id).disabled = !isHost;
    $('pvpSettings').classList.toggle('hidden', story);
    $('storySettings').classList.toggle('hidden', !story);
    const active = mode === 'duel' ? [0, 1] : [0, 1, 2];
    $('btnBot').disabled = !isHost || !active.some(i => !m.slots[i]);
    $('btnBot').textContent = story ? '🤖 Bot takım arkadaşı ekle' : '🤖 Boş koltuğa bot ekle';
    const me = mySlotObj(), myIdx = m.slots.indexOf(me);
    const bench = me && !active.includes(myIdx);
    $('btnReady').disabled = !me || bench;
    $('btnReady').textContent = !me ? 'İZLEYİCİSİN' : bench ? 'YEDEKTESİN (sıradaki maç)' : (me.ready ? 'HAZIR ✔ (iptal)' : (story ? 'SAVAŞA HAZIRIM' : 'HAZIRIM'));
    $('btnReady').classList.toggle('on', !!(me && me.ready));
    $('btnReady').classList.toggle('primary', !(me && me.ready));
    const cd = $('countdown');
    if (m.phase === 'countdown') { cd.classList.remove('hidden'); cd.textContent = `Maç ${m.countdown} saniye içinde başlıyor!`; if (prevPhase !== 'countdown' || m.countdown !== S.lastCd) SFX.play('count'); S.lastCd = m.countdown; }
    else cd.classList.add('hidden');
    const others = m.slots.filter(x => x && x.id !== S.myId).map(x => x.char);
    for (const id in charCards) charCards[id].el.classList.toggle('opp', !story && others.includes(id));
    refreshStory();
    if (story && prevMode !== 'story' && prevMode) showTab('tabStory');
    if (m.phase === 'lobby' && S.screen === 'fight' && !S.ended) show('lobby');
  }
  const slotCanvases = [];
  function renderSlot(i, p, m, isHost) {
    const el = $('slot' + i), mode = m.settings.mode, bench = mode === 'duel' && i === 2;
    el.innerHTML = '';
    el.className = 'slot' + (p ? '' : ' empty') + (p && p.id === S.myId ? ' me' : '') + (bench ? ' bench' : '');
    if (!p) {
      el.textContent = bench ? 'Yedek koltuk (düelloda sırada bekler)' : (mode === 'story' ? 'Takım arkadaşı bekleniyor...' : 'Rakip bekleniyor... Oda kodunu gönder!');
      slotCanvases[i] = null; return;
    }
    const ch = GD.getChar(p.char);
    const cv = document.createElement('canvas'); cv.width = 150; cv.height = 145;
    const pn = document.createElement('div'); pn.className = 'pn'; pn.textContent = p.name + (p.bot ? ' 🤖' : ''); pn.style.color = SLOT_COLORS[i];
    const pc = document.createElement('div'); pc.className = 'pc'; pc.textContent = ch.name + (p.custom.title ? ' · ' + p.custom.title : '');
    const badge = document.createElement('div'); badge.className = 'badge' + (p.ready ? ' ok' : ''); badge.textContent = bench ? 'yedek' : (p.ready ? 'HAZIR' : 'bekliyor');
    el.append(cv, pn, pc, badge);
    if (mode === 'story' && p.equip) {
      const e = p.equip, tot = Object.entries(e).filter(([k]) => k !== 'feather').reduce((a, [, v]) => a + v, 0);
      const eq = document.createElement('div'); eq.className = 'eq'; eq.textContent = `⚔ Ekipman gücü ${tot}` + (e.feather ? ` · 🪶${e.feather}` : '');
      el.append(eq);
    }
    if (p.id === m.host) { const h = document.createElement('div'); h.className = 'host'; h.textContent = '♛'; h.title = 'Oda sahibi'; el.append(h); }
    if (p.bot && isHost) {
      const ctl = document.createElement('div'); ctl.className = 'botctl';
      const sel = document.createElement('select');
      for (const c of GD.CHARACTERS) { const o = document.createElement('option'); o.value = c.id; o.textContent = c.name; sel.append(o); }
      sel.value = p.char; sel.onchange = () => send({ t: 'botchar', slot: i, char: sel.value });
      const x = document.createElement('button'); x.className = 'btn small danger'; x.textContent = '✖'; x.title = 'Botu çıkar';
      x.onclick = () => send({ t: 'bot', on: false, slot: i });
      ctl.append(sel, x); el.append(ctl);
    }
    slotCanvases[i] = { cv, ch, cu: p.custom, d: i === 1 ? -1 : 1 };
  }

  function addChat(m, quiet) {
    const line = document.createElement('div'); line.className = 'm';
    if (!m.from) { line.classList.add('sys'); line.textContent = m.text; }
    else {
      const b = document.createElement('b'); b.textContent = m.from + ':'; b.style.color = SLOT_COLORS[m.slot] || '#c9b8ff';
      line.append(b, document.createTextNode(m.text));
      if (!quiet && S.screen !== 'menu') SFX.play('chat');
    }
    const log = $('chatLog'); log.append(line); log.scrollTop = log.scrollHeight;
    while (log.children.length > 80) log.firstChild.remove();
    // dövüş ekranı katmanı
    const fl = line.cloneNode(true);
    const fc = $('fightChat'); fc.append(fl);
    while (fc.children.length > 6) fc.firstChild.remove();
    setTimeout(() => fl.classList.add('old'), 9000);
  }

  // ------------------------------------------------------------ önizleme animasyonları
  const DEMO = [['idle', '', 70], ['attack', 'lp', 16], ['idle', '', 14], ['attack', 'k', 26], ['idle', '', 26], ['attack', 's1', 42], ['idle', '', 26], ['attack', 's2', 42], ['idle', '', 26], ['attack', 'ult', 70], ['win', '', 70]];
  const DEMO_LEN = DEMO.reduce((a, d) => a + d[2], 0);
  let demoT = 0;
  function demoState(t, chId) {
    let x = t % DEMO_LEN;
    for (const [s, mv, dur] of DEMO) {
      if (x < dur) {
        if (s !== 'attack') return { s, st: x, mv: '', mp: -1, mt: 0, a: 0 };
        const mp = x < dur * 0.3 ? 0 : x < dur * 0.78 ? 1 : 2;
        const mt = mp === 1 ? Math.floor(x - dur * 0.3) : x;
        const anim = GD.moveAnim(chId, mv);
        const air = mp === 1 && ['uppercut', 'flip', 'quake'].includes(anim) ? 1 : 0;
        return { s, st: x, mv, mp, mt, a: air };
      }
      x -= dur;
    }
    return { s: 'idle', st: t, mv: '', mp: -1, mt: 0 };
  }

  function bossDemo(t, b) {
    const ks = Object.keys(b.moves), per = 110, k = Math.floor(t / per) % ks.length, x = t % per;
    if (x < 50) return { s: 'idle', st: t, mv: '', mp: -1, mt: 0, a: 0 };
    const y = x - 50, mp = y < 20 ? 0 : y < 45 ? 1 : 2, anim = GD.moveAnim(b.id, ks[k]);
    return { s: 'attack', st: y, mv: ks[k], mp, mt: mp === 1 ? y - 20 : y, a: mp === 1 && anim === 'quake' ? 1 : 0 };
  }

  // ------------------------------------------------------------ dövüş
  function onStart(m) {
    S.players = m.players; S.settings = m.settings;
    S.mySlot = m.players.findIndex(p => p.id === S.myId && !p.bot && !p.boss);
    if (window.Touch && S.mySlot >= 0) { const mc = GD.getChar(m.players[S.mySlot].char); window.Touch.setMoves(mc.moves.s1.name, mc.moves.s2.name); window.Touch.setUlt(false); }
    S.story = m.story || null;
    S.snaps = []; S.offset = null; S.lastEvFr = 0; S.ended = null; S.held = 0; S.pressed = 0;
    R.matchWins = m.settings.wins;
    R.setMatch(m.players, m.settings, m.story);
    $('result').classList.add('hidden');
    $('spectatorTag').classList.toggle('hidden', S.mySlot >= 0);
    $('fightHint').textContent = `Enter: sohbet · 1-4: laf at · M: ses · F: tam ekran · G: grafik · Hareket: ${keyName(profile.keys.L[0])}${keyName(profile.keys.U[0])}${keyName(profile.keys.R[0])}${keyName(profile.keys.D[0])} · Vuruş: ${['LP', 'HP', 'K', 'S1', 'S2', 'ULT'].map(a => keyName(profile.keys[a][0])).join(' ')}`;
    show('fight');
  }
  function onSnap(s) {
    const now = performance.now();
    const o = now - s.fr * STEP;
    if (S.offset == null || o < S.offset) S.offset = o; else S.offset += (o - S.offset) * 0.02;
    S.snaps.push(s);
    if (S.snaps.length > 120) S.snaps.splice(0, S.snaps.length - 120);
  }
  function onEnd(m) {
    S.ended = m;
    // hikaye ödülünü hemen kaydet
    if (m.story) {
      const st = profile.story, fi = S.mySlot;
      const iPlayed = fi >= 0 && m.fighters[fi] && m.fighters[fi].id === S.myId;
      if (iPlayed) {
        st.gold += m.story.gold;
        if (m.story.win) st.unlocked = Math.max(st.unlocked, m.story.chapter + 1);
        const used = (m.stats[fi] && m.stats[fi].feathers) || 0;
        if (used) st.items.feather = Math.max(0, (st.items.feather || 0) - used);
        save(); refreshShop(); sendSelect();
      }
      m.story.mine = iPlayed;
    }
    setTimeout(() => showResult(m), 700);
  }
  function showResult(m) {
    if (S.screen !== 'fight') return;
    const P = S.players, w = m.winner, story = m.mode === 'story';
    const idxs = P.map((p, i) => i).filter(i => !P[i].boss);
    $('resultStory').classList.add('hidden'); $('resultGold').classList.add('hidden');
    if (story) {
      const win = m.story && m.story.win;
      $('resultTitle').textContent = m.forfeit ? 'SAVAŞ YARIDA KALDI' : (win ? 'ZAFER!' : 'YENİLDİNİZ...');
      $('resultSub').textContent = m.story ? m.story.title : '';
      if (win && m.story.outro) { $('resultStory').textContent = m.story.outro; $('resultStory').classList.remove('hidden'); }
      if (m.story && m.story.mine && m.story.gold) {
        $('resultGold').textContent = `+${m.story.gold} altın kazandın! (Toplam: ${profile.story.gold})` + (win ? '' : ' — Dükkândan ekipman alıp tekrar dene!');
        $('resultGold').classList.remove('hidden');
      }
      const bi = P.findIndex(p => p.boss);
      const showI = win ? (S.mySlot >= 0 ? S.mySlot : idxs[0]) : bi;
      S.winnerDraw = showI >= 0 ? { ch: GD.getChar(P[showI].char), cu: P[showI].custom } : null;
      $('btnRematch').textContent = win ? 'SONRAKİ BÖLÜM ▶' : 'TEKRAR DENE';
      if (win) SFX.say('Zafer!'); else SFX.say('Yenildiniz');
    } else {
      $('resultTitle').textContent = w === -1 ? 'BERABERE!' : `${(P[w] ? P[w].name : '?').toUpperCase()} KAZANDI!`;
      $('resultSub').textContent = m.forfeit ? 'Rakip maçtan ayrıldı.' : 'Skor ' + idxs.map(i => m.wins[i]).join(' - ');
      S.winnerDraw = w >= 0 ? { ch: GD.getChar(P[w].char), cu: P[w].custom } : null;
      $('btnRematch').textContent = 'RÖVANŞ!';
      if (w >= 0 && w === S.mySlot) SFX.say('Kazandın!'); else if (w >= 0 && S.mySlot >= 0) SFX.say('Kaybettin!');
    }
    const tb = $('resultStats'); tb.innerHTML = '';
    const row = (cells, th) => { const tr = document.createElement('tr'); cells.forEach(c => { const td = document.createElement(th ? 'th' : 'td'); td.textContent = c; tr.append(td); }); tb.append(tr); };
    row([''].concat(idxs.map(i => P[i].name)), true);
    row(['Verilen hasar'].concat(idxs.map(i => m.stats[i].dmg)));
    row(['En uzun kombo'].concat(idxs.map(i => m.stats[i].combo)));
    row(['İsabet'].concat(idxs.map(i => m.stats[i].hits)));
    row(['Ulti'].concat(idxs.map(i => m.stats[i].ults)));
    $('btnRematch').classList.toggle('hidden', S.mySlot < 0);
    $('result').classList.remove('hidden');
    if (window.Touch) window.Touch.show(false);
  }
  $('btnRematch').onclick = () => { $('result').classList.add('hidden'); S.ended = null; show('lobby'); send({ t: 'ready', v: true }); if (window.Touch) window.Touch.fullscreen(); };
  if (window.Touch) {
    window.Touch.onChat = () => { $('fightChatForm').classList.remove('hidden'); $('fightChatInput').focus(); };
    window.Touch.onTaunt = i => send({ t: 'taunt', i });
  }
  $('btnToLobby').onclick = () => { $('result').classList.add('hidden'); S.ended = null; show('lobby'); };

  function interpSnap() {
    const arr = S.snaps;
    if (!arr.length) return null;
    const rf = (performance.now() - S.offset - INTERP) / STEP;
    let a = arr[0], b = arr[arr.length - 1];
    for (let i = arr.length - 1; i >= 0; i--) { if (arr[i].fr <= rf) { a = arr[i]; b = arr[i + 1] || arr[i]; break; } }
    if (rf < arr[0].fr) { a = b = arr[0]; }
    // olaylar
    for (const s of arr) {
      if (s.fr > S.lastEvFr && s.fr <= b.fr) { for (const e of s.e) handleEvent(e, s); S.lastEvFr = s.fr; }
    }
    // eski görüntüleri at
    while (arr.length > 3 && arr[1].fr < rf - 30) arr.shift();
    if (a === b) return b;
    const k = Math.max(0, Math.min(1, (rf - a.fr) / (b.fr - a.fr)));
    const out = Object.assign({}, a);
    out.f = a.f.map((fa, i) => {
      const fb = b.f[i];
      const teleport = Math.abs(fb.x - fa.x) > 30;
      return Object.assign({}, fa, { x: teleport ? fb.x : fa.x + (fb.x - fa.x) * k, y: fa.y + (fb.y - fa.y) * k });
    });
    out.p = a.p.map(pa => { const pb = b.p.find(q => q.i === pa.i); return pb ? Object.assign({}, pa, { x: pa.x + (pb.x - pa.x) * k, y: pa.y + (pb.y - pa.y) * k }) : pa; });
    return out;
  }
  function handleEvent(e, snap) {
    R.event(e, snap);
    switch (e.t) {
      case 'hit': SFX.play('hit', e.h); if (e.k === 'bolt') SFX.play('bolt'); if (window.Touch && window.Touch.isTouch && e.i === S.mySlot) window.Touch.vibrate(e.h >= 2 ? 45 : 18); break;
      case 'block': SFX.play('block'); break;
      case 'swing': SFX.play('swing', e.h); break;
      case 'special': SFX.play('special', e.c, e.m); break;
      case 'ult': SFX.play('ult'); break;
      case 'ko': SFX.play('ko'); SFX.say('Nakavt!'); break;
      case 'round': SFX.play('round'); SFX.say(S.story ? 'Bölüm ' + S.story.ch : (e.n === 1 ? 'Birinci raunt' : `Raunt ${e.n}`)); break;
      case 'fight': SFX.play('fight'); SFX.say(S.story ? 'Savaş!' : 'Dövüş!'); break;
      case 'bossmove': SFX.play('special', e.c === 'cin' ? 'kaan' : e.c === 'kar' ? 'ayaz' : e.c === 'golem' ? 'demir' : e.c === 'karabasan' ? 'yildiz' : 'demir', 's1'); break;
      case 'enrage': SFX.play('ult'); SFX.say('Öfkelendi!'); break;
      case 'stagger': SFX.play('counter'); break;
      case 'revive': case 'feather': SFX.play('ready'); break;
      case 'out': SFX.play('ko'); break;
      case 'pop': SFX.play('block'); break;
      case 'leap': SFX.play('jump'); break;
      case 'timeup': SFX.play('ko'); SFX.say('Süre doldu'); break;
      case 'clash': SFX.play('clash'); break;
      case 'teleport': SFX.play('teleport'); break;
      case 'freeze': SFX.play('freeze'); break;
      case 'shatter': SFX.play('shatter'); break;
      case 'counter': SFX.play('counter'); break;
      case 'armor': SFX.play('armor'); break;
      case 'quake': SFX.play('quake'); break;
      case 'land': SFX.play('land'); break;
      case 'djump': SFX.play('jump'); break;
    }
  }

  // ------------------------------------------------------------ tuş girişi
  function bitFor(code) {
    for (const [act, codes] of Object.entries(profile.keys)) if (codes.includes(code)) return B[act];
    return 0;
  }
  let rebinding = null;
  window.addEventListener('keydown', e => {
    if (rebinding) {
      e.preventDefault();
      if (e.code !== 'Escape') {
        for (const k in profile.keys) profile.keys[k] = profile.keys[k].filter(c => c !== e.code);
        profile.keys[rebinding.act][rebinding.idx] = e.code;
        profile.keys[rebinding.act] = profile.keys[rebinding.act].filter(Boolean);
        save();
      }
      rebinding = null; renderKeys(); refreshCharUI();
      return;
    }
    const typing = document.activeElement && (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT');
    if (S.screen !== 'fight') return;
    if (typing) {
      if (e.code === 'Escape') { document.activeElement.blur(); $('fightChatForm').classList.add('hidden'); }
      return;
    }
    if (e.code === 'Enter' || e.code === 'NumpadEnter') {
      e.preventDefault(); S.held = 0;
      $('fightChatForm').classList.remove('hidden'); $('fightChatInput').focus(); return;
    }
    if (e.code === 'KeyM') { toggleMute(); return; }
    if (e.code === 'KeyG' && !bitFor('KeyG')) { R.cycleQuality(); return; }
    if (e.code === 'KeyF' && !bitFor('KeyF')) { toggleFull(); return; }
    if (/^Digit[1-4]$/.test(e.code) && !bitFor(e.code)) { send({ t: 'taunt', i: +e.code.slice(5) - 1 }); return; }
    const bit = bitFor(e.code);
    if (bit) {
      e.preventDefault();
      if (!(S.held & bit)) { S.held |= bit; S.pressed |= bit; }
    }
  });
  window.addEventListener('keyup', e => { const bit = bitFor(e.code); if (bit) S.held &= ~bit; });
  window.addEventListener('blur', () => { S.held = 0; });
  $('fightChatForm').onsubmit = e => {
    e.preventDefault();
    const v = $('fightChatInput').value.trim();
    if (v) send({ t: 'chat', text: v });
    $('fightChatInput').value = ''; $('fightChatInput').blur(); $('fightChatForm').classList.add('hidden');
  };
  $('fightChatInput').onblur = () => setTimeout(() => $('fightChatForm').classList.add('hidden'), 50);

  // gamepad desteği (bonus)
  function pollPad() {
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    const p = pads && [...pads].find(x => x);
    if (!p) return 0;
    let h = 0;
    const ax = p.axes[0] || 0, ay = p.axes[1] || 0, bt = i => p.buttons[i] && p.buttons[i].pressed;
    if (ax < -0.4 || bt(14)) h |= B.L; if (ax > 0.4 || bt(15)) h |= B.R;
    if (ay < -0.5 || bt(12)) h |= B.U; if (ay > 0.5 || bt(13)) h |= B.D;
    if (bt(2)) h |= B.LP; if (bt(3)) h |= B.HP; if (bt(0)) h |= B.K; if (bt(1)) h |= B.S1; if (bt(5)) h |= B.S2; if (bt(7) || bt(4)) h |= B.ULT;
    return h;
  }
  let padPrev = 0;
  function sendInput() {
    if (S.screen !== 'fight' || S.mySlot < 0) return;
    const pad = pollPad();
    const padPressed = pad & ~padPrev; padPrev = pad;
    const TT = window.Touch;
    const held = S.held | pad | (TT ? TT.held() : 0), pressed = S.pressed | padPressed | (TT ? TT.take() : 0);
    const now = performance.now();
    if (held !== S.lastSent || pressed || now - S.lastSendT > 250) {
      send({ t: 'input', h: held, p: pressed });
      S.lastSent = held; S.pressed = 0; S.lastSendT = now;
    }
  }

  // ------------------------------------------------------------ tuş ayarları penceresi
  function openKeys() { renderKeys(); $('keysModal').classList.remove('hidden'); }
  function renderKeys() {
    const l = $('keysList'); l.innerHTML = '';
    for (const [act, label] of ACTIONS) {
      const s = document.createElement('span'); s.textContent = label;
      const wrap = document.createElement('div'); wrap.style.display = 'flex'; wrap.style.gap = '6px';
      for (let idx = 0; idx < 2; idx++) {
        const b = document.createElement('button'); b.className = 'btn small';
        const waiting = rebinding && rebinding.act === act && rebinding.idx === idx;
        b.textContent = waiting ? 'Tuşa bas...' : keyName(profile.keys[act][idx]) + (idx === 1 && !profile.keys[act][1] ? ' (ekle)' : '');
        if (waiting) b.classList.add('wait');
        b.style.minWidth = '90px';
        b.onclick = () => { rebinding = { act, idx: Math.min(idx, profile.keys[act].length) }; renderKeys(); };
        wrap.append(b);
      }
      l.append(s, wrap);
    }
  }
  $('btnKeysClose').onclick = () => { rebinding = null; $('keysModal').classList.add('hidden'); refreshCharUI(); };
  $('btnKeysReset').onclick = () => { profile.keys = JSON.parse(JSON.stringify(DEFAULT_KEYS)); save(); renderKeys(); refreshCharUI(); };

  // ------------------------------------------------------------ ana döngü
  const menuChars = (() => {
    const a = GD.CHARACTERS[Math.floor(Math.random() * 6)];
    let b; do { b = GD.CHARACTERS[Math.floor(Math.random() * 6)]; } while (b === a);
    return [a, b];
  })();
  let t = 0;
  function loop() {
    t++;
    if (S.screen === 'menu') {
      const [a, b] = menuChars;
      R.menuFrame(t,
        [a, customFor(a.id), demoState(t, a.id), 150, 1],
        [b, customFor(b.id), demoState(t + 180, b.id), 330, -1]);
    } else if (S.screen === 'lobby') {
      demoT++;
      const ch = GD.getChar(profile.char), cu = customFor(ch.id);
      const f = demoState(demoT, ch.id);
      R.drawPreview($('preview'), ch, cu, f, t, { aura: f.mv === 'ult', fx: true });
      for (const c of GD.CHARACTERS.filter((_, k) => k === t % 6)) {
        const cc = charCards[c.id];
        R.drawPreview(cc.cv, c, c.id === profile.char ? cu : customFor(c.id), { s: c.id === profile.char ? 'idle' : 'idle', st: c.id === profile.char ? t : 0 }, t);
      }
      slotCanvases.forEach((sc, k) => { if (sc && (t % 3 === k)) R.drawPreview(sc.cv, sc.ch, sc.cu, { s: 'idle', st: t }, t, { facing: sc.d }); });
      if (S.tab === 'tabStory' && S.bossPrev) R.drawPreview($('bossPreview'), S.bossPrev.ch, S.bossPrev.cu, bossDemo(t, S.bossPrev.ch), t, { aura: true, fx: true });
    } else if (S.screen === 'fight') {
      sendInput();
      const snap = interpSnap();
      if (snap) { R.frame(snap, S.mySlot); if (window.Touch && S.mySlot >= 0 && snap.f[S.mySlot]) window.Touch.setUlt(snap.f[S.mySlot].m >= 100); }
      if (S.winnerDraw && !$('result').classList.contains('hidden')) {
        R.drawPreview($('winnerCanvas'), S.winnerDraw.ch, S.winnerDraw.cu, { s: 'win', st: t }, t, { aura: true });
      }
    }
    requestAnimationFrame(loop);
  }

  // ------------------------------------------------------------ başlat
  function boot() {
    R.init($('game'), $('hud'));
    const ld = $('loading'); if (ld) ld.remove();
    window.addEventListener('resize', () => R.resize());
    document.addEventListener('fullscreenchange', () => setTimeout(() => R.resize(), 50));
    buildLobby(); refreshCharUI();
    $('nameInput').value = profile.name || '';
    const q = new URLSearchParams(location.search).get('oda');
    if (q) $('roomInput').value = q.toUpperCase();
    $('btnCreate').onclick = () => connect('');
    $('btnJoin').onclick = () => { const c = $('roomInput').value.trim().toUpperCase(); if (!c) { $('menuStatus').textContent = 'Oda kodunu yaz.'; return; } connect(c); };
    $('roomInput').onkeydown = e => { if (e.key === 'Enter') $('btnJoin').click(); };
    $('nameInput').onkeydown = e => { if (e.key === 'Enter') (q ? $('btnJoin') : $('btnCreate')).click(); };
    $('btnSound').textContent = $('btnMute2').textContent = profile.muted ? '🔇' : '🔊';
    document.addEventListener('pointerdown', () => { SFX.init(); if (S.screen === 'menu') SFX.playMusic('menu'); }, { once: true });
    if (document.fonts && document.fonts.load) document.fonts.load('16px "Teko"').catch(() => { });
    loop();
    setMode(false);
    window.Local.detectServer().then(setMode);
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('sw.js').catch(() => { });
  }
  // Çevrimiçi (bilgisayardaki sunucu) / çevrimdışı (telefonda tek başına) menü görünümü
  function setMode(online) {
    S.online = online;
    document.body.classList.toggle('offline', !online);
    $('btnCreate').textContent = online ? 'ODA KUR' : 'OYNA';
    $('tagline').textContent = online ? 'Arkadaşınla online, piksel piksel kapış.' : 'Cebinde 3D dövüş. İnternetsiz oyna.';
    $('modeNote').textContent = online
      ? 'Sunucuyu açan kişi odayı kurar, kodu arkadaşına söyler.'
      : 'Telefon modu: internet ve bilgisayar gerekmez. Botlara karşı düello, üçlü kapışma ve hikaye modu. Arkadaşınla online oynamak için oyunu bilgisayardaki sunucudan aç.';
  }
  boot();
})();
