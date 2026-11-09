/* PİKSEL ARENA — ortak oyun verisi (sunucu + tarayıcı) */
(function (root) {
  'use strict';

  const ACCESSORIES = [
    { id: 'none', name: 'Yok' },
    { id: 'bandana', name: 'Bandana' },
    { id: 'cap', name: 'Şapka' },
    { id: 'crown', name: 'Taç' },
    { id: 'shades', name: 'Gözlük' },
    { id: 'headset', name: 'Kulaklık' },
    { id: 'horns', name: 'Boynuz' }
  ];

  const CHARACTERS = [
    {
      id: 'kaan', name: 'KAAN', title: 'Alev Ronin',
      desc: 'Dengeli ve disiplinli. Ateş topuyla uzaktan baskı kurar, aparkatla havadakileri indirir.',
      stats: { hp: 1000, speed: 1.6, jump: 6.4, power: 1.0, defense: 1.0, meter: 1.0, reach: 0 },
      bars: { 'Güç': 3, 'Hız': 3, 'Dayanıklılık': 3, 'Menzil': 3 },
      passive: { name: 'Öfke', desc: 'Canı %30 altındayken %15 fazla hasar verir.' },
      moves: {
        s1: { name: 'Ateş Topu', anim: 'fireball', desc: 'Düz ilerleyen alev mermisi.' },
        s2: { name: 'Ejder Yumruğu', anim: 'uppercut', desc: 'Başlangıçta dokunulmaz, yükselen aparkat.' },
        ult: { name: 'EJDER FIRTINASI', anim: 'beam', desc: 'Ekranı boydan boya kesen dev alev ışını.' }
      },
      look: { build: 1, height: 1, hair: 'spiky', hairColor: '#1e140c', skin: '#efbf8c', accent: '#151515', glove: '#c81d25', shoe: '#3a2a1a', glow: '#ff8a1e', sleeves: true, band: '#c81d25', gi: true },
      defaults: { primary: '#ece6da', secondary: '#ece6da' },
      palettes: [['#ece6da', '#ece6da'], ['#c81d25', '#262626'], ['#24427e', '#24427e'], ['#2b2b2b', '#c9a227']]
    },
    {
      id: 'yildiz', name: 'YILDIZ', title: 'Gölge Ninja',
      desc: 'Çok hızlı ve çevik. Kunai yağdırır, rakibin arkasına ışınlanır, havada iki kez zıplar.',
      stats: { hp: 950, speed: 2.2, jump: 6.6, power: 1.0, defense: 1.0, meter: 1.0, reach: 0 },
      bars: { 'Güç': 2, 'Hız': 5, 'Dayanıklılık': 2, 'Menzil': 3 },
      passive: { name: 'Çift Zıplama', desc: 'Havadayken bir kez daha zıplayabilir.' },
      moves: {
        s1: { name: 'Kunai', anim: 'throw', desc: 'Hızlı bıçak. Havada çapraz aşağı atılır.' },
        s2: { name: 'Gölge Adımı', anim: 'vanish', desc: 'Rakibin arkasına ışınlanır.' },
        ult: { name: 'GÖLGE DANSI', anim: 'rush', desc: 'Değdiği an 9 darbelik ışınlanma saldırısına dönüşen atılma.' }
      },
      look: { build: 0.9, height: 0.98, hair: 'hood', hairColor: '#2b1d4a', skin: '#e8b48a', accent: '#e63946', glove: '#1a1a1a', shoe: '#111111', glow: '#b366ff', sleeves: true, mask: true, scarf: '#e63946' },
      defaults: { primary: '#2b1d4a', secondary: '#2b1d4a' },
      palettes: [['#2b1d4a', '#2b1d4a'], ['#1b1b1b', '#1b1b1b'], ['#e8e8e8', '#3a3a3a'], ['#14532d', '#1c1917']]
    },
    {
      id: 'demir', name: 'DEMİR', title: 'Çelik Pehlivan',
      desc: 'Dev gibi bir güreşçi. Yavaş ama her darbesi can yakar; zırhlı hücumlarla saldırıları göğüsler.',
      stats: { hp: 1150, speed: 1.2, jump: 5.6, power: 1.2, defense: 0.85, meter: 1.0, reach: 0 },
      bars: { 'Güç': 5, 'Hız': 1, 'Dayanıklılık': 5, 'Menzil': 2 },
      passive: { name: 'Çelik Beden', desc: '%15 az hasar alır, az geri itilir, ağır yumruğu zırhlıdır.' },
      moves: {
        s1: { name: 'Boğa Hücumu', anim: 'charge', desc: 'Zırhlı omuz hücumu, bir darbeyi göğüsler.' },
        s2: { name: 'Yer Sarsıntısı', anim: 'slam', desc: 'Yerde ilerleyen şok dalgası (çömelerek bloklanır).' },
        ult: { name: 'DEPREM', anim: 'quake', desc: 'Sıçrayıp yere çakılır: yerdeki rakibe devasa hasar. Zıplayarak kaçılabilir!' }
      },
      look: { build: 1.3, height: 1.08, hair: 'bald', hairColor: '#3b2416', skin: '#b97a48', accent: '#e0a800', glove: '#a51c1c', shoe: '#2b1d14', glow: '#ff4d2e', sleeves: false, beard: '#3b2416' },
      defaults: { primary: '#2e7d32', secondary: '#4e342e' },
      palettes: [['#2e7d32', '#4e342e'], ['#1f1f1f', '#7f1d1d'], ['#f5f5f5', '#1e3a8a'], ['#6b21a8', '#111111']]
    },
    {
      id: 'volt', name: 'VOLT', title: 'Şimşek Çocuk',
      desc: 'Elektrik yüklü taktikçi. Alanı kontrol eder, ulti barını herkesten hızlı doldurur.',
      stats: { hp: 950, speed: 1.75, jump: 6.4, power: 1.0, defense: 1.0, meter: 1.35, reach: 0 },
      bars: { 'Güç': 3, 'Hız': 3, 'Dayanıklılık': 3, 'Menzil': 4 },
      passive: { name: 'Aşırı Yük', desc: 'Ulti barı %35 daha hızlı dolar.' },
      moves: {
        s1: { name: 'Şimşek Küre', anim: 'cast', desc: 'Yavaş ilerleyen, 3 kez çarpan elektrik küresi.' },
        s2: { name: 'Elektrik Alanı', anim: 'field', desc: 'Etrafında elektrik patlaması, hava saldırılarını keser.' },
        ult: { name: 'YILDIRIM YAĞMURU', anim: 'storm', desc: 'Rakibin tepesine art arda 5 yıldırım düşürür.' }
      },
      look: { build: 1, height: 1, hair: 'spiky_tall', hairColor: '#ffe14d', skin: '#f2c79b', accent: '#ffe14d', glove: '#111827', shoe: '#f8fafc', glow: '#7df9ff', sleeves: true },
      defaults: { primary: '#1d4ed8', secondary: '#111827' },
      palettes: [['#1d4ed8', '#111827'], ['#facc15', '#1f2937'], ['#0f766e', '#0b1220'], ['#e11d48', '#1f1f1f']]
    },
    {
      id: 'ayaz', name: 'AYAZ', title: 'Buz Bekçisi',
      desc: 'Soğukkanlı ve sabırlı. Uzun menzilli vuruşlar, yavaşlatan buz ve ölümcül karşı saldırı.',
      stats: { hp: 1020, speed: 1.55, jump: 6.1, power: 1.1, defense: 1.0, meter: 1.0, reach: 6 },
      bars: { 'Güç': 3, 'Hız': 2, 'Dayanıklılık': 3, 'Menzil': 5 },
      passive: { name: 'Uzun Menzil', desc: 'Normal saldırıları daha uzağa erişir.' },
      moves: {
        s1: { name: 'Buz Kristali', anim: 'cast', desc: 'Değdiği rakibi 2 saniye yavaşlatır.' },
        s2: { name: 'Buz Kalkanı', anim: 'counter', desc: 'Karşı saldırı duruşu: vurulursan rakibi cezalandırırsın.' },
        ult: { name: 'KUTUP FIRTINASI', anim: 'icecast', desc: 'Buz dalgası rakibi buz kalıbına hapseder, sonra paramparça eder.' }
      },
      look: { build: 0.95, height: 1.03, hair: 'long', hairColor: '#eaf6ff', skin: '#f3d9c4', accent: '#dff6ff', glove: '#e0f2fe', shoe: '#1e3a5f', glow: '#9ff3ff', sleeves: true, coat: true },
      defaults: { primary: '#5fb8d6', secondary: '#1e3a5f' },
      palettes: [['#5fb8d6', '#1e3a5f'], ['#f1f5f9', '#334155'], ['#312e81', '#0f172a'], ['#0f172a', '#7dd3fc']]
    },
    {
      id: 'neon', name: 'NEON', title: 'Kickboks Yıldızı',
      desc: 'Akrobatik tekmeci. Dönen tekmelerle baskı kurar, uzun kombolarla en çok hasarı çıkarır.',
      stats: { hp: 950, speed: 2.0, jump: 6.6, power: 1.02, defense: 1.0, meter: 1.0, reach: 0 },
      bars: { 'Güç': 3, 'Hız': 4, 'Dayanıklılık': 2, 'Menzil': 3 },
      passive: { name: 'Ritim', desc: 'Kombo hasar düşüşü çok daha az, tekmeleri daha uzun.' },
      moves: {
        s1: { name: 'Kasırga Tekme', anim: 'spin', desc: 'İleri dönen çoklu tekme. Havada da yapılır.' },
        s2: { name: 'Ay Takla', anim: 'flip', desc: 'Takla atarak yükselen tekme.' },
        ult: { name: 'NEON KASIRGA', anim: 'tornado', desc: 'Rakibi içine çeken dev dönen tekme fırtınası.' }
      },
      look: { build: 0.9, height: 0.97, hair: 'ponytail', hairColor: '#ff3ea5', skin: '#e9b38d', accent: '#ff3ea5', glove: '#00e5ff', shoe: '#ffffff', glow: '#ff3ea5', sleeves: false, crop: true },
      defaults: { primary: '#161616', secondary: '#00bcd4' },
      palettes: [['#161616', '#00bcd4'], ['#ff3ea5', '#1f1f1f'], ['#f8fafc', '#7c3aed'], ['#facc15', '#111111']]
    }
  ];

  const STAGES = [
    { id: 'istanbul', name: 'Gece Boğazı' },
    { id: 'dojo', name: 'Gün Batımı Dojosu' },
    { id: 'neon', name: 'Neon Sokaklar' },
    { id: 'kis', name: 'Karlı Boğaz' },
    { id: 'saray', name: 'Gölge Sarayı' }
  ];

  const MODES = [
    { id: 'duel', name: 'Düello (1v1)', min: 2, max: 2 },
    { id: 'ffa', name: 'Üçlü Kapışma (3 kişi)', min: 3, max: 3 },
    { id: 'story', name: 'Hikaye: Boss Avı (1-3 kişi)', min: 1, max: 3 }
  ];

  // ------------------------------------------------------------ BOSSLAR
  // stats: hp (tek oyuncu, ilk tur), power (hasar çarpanı), speed, rest (saldırılar arası kare), pref (tercih ettiği mesafe)
  const BOSSES = [
    {
      id: 'rifki', boss: true, name: 'KARA RIFKI', title: 'Sokak Kabadayısı',
      stats: { hp: 2300, power: 1.0, speed: 1.15, rest: 62, pref: 6 },
      look: { build: 1.55, height: 1.22, hair: 'bald', hairColor: '#1a1a1a', skin: '#d29a62', accent: '#3b2a1a', glove: '#3b3b3b', shoe: '#1b1b1b', glow: '#ff5a1f', sleeves: true, beard: '#2a1a10', chain: '#ffd23f', eyes: '#ff3b3b' },
      custom: { primary: '#2b2b2b', secondary: '#2d4a7a', aura: '#ff5a1f', acc: 'shades', title: '' },
      moves: {
        jab: { name: 'Sert Yumruk', anim: 'strong' },
        haymaker: { name: 'Balyoz', anim: 'charge' },
        bottle: { name: 'Şişe Fırlatma', anim: 'throw' },
        charge: { name: 'Kafa Atma Hücumu', anim: 'charge' },
        stomp: { name: 'Yer Tepme', anim: 'quake' }
      },
      tip: 'Şişeleri blokla, hücumdan zıplayarak kaç. Arkasına geç!'
    },
    {
      id: 'golem', boss: true, name: 'DEMİR GOLEM', title: 'Kadim Bekçi',
      stats: { hp: 2700, power: 1.06, speed: 0.9, rest: 66, pref: 6 },
      look: { build: 1.95, height: 1.42, hair: 'bald', hairColor: '#555', skin: '#8a8f99', accent: '#4a4f5a', glove: '#5c616d', shoe: '#3e4250', glow: '#ffb000', sleeves: false, metal: true, eyes: '#ffb000', pads: '#6e7381' },
      custom: { primary: '#5b6070', secondary: '#3e4250', aura: '#ffb000', acc: 'none', title: '' },
      moves: {
        smash: { name: 'Ezici Darbe', anim: 'slam' },
        sweep: { name: 'Yer Süpürme', anim: 'sweep' },
        leap: { name: 'Gök Düşüşü', anim: 'quake' },
        rocks: { name: 'Kaya Yağmuru', anim: 'storm' }
      },
      tip: 'Süpürmeden zıpla, inişte çıkan şok dalgalarına dikkat et.'
    },
    {
      id: 'cin', boss: true, name: 'ATEŞ CİNİ', title: 'Lambadan Kaçan',
      stats: { hp: 2900, power: 1.1, speed: 1.2, rest: 74, pref: 40 },
      look: { build: 1.4, height: 1.38, hair: 'flame', hairColor: '#ff7a00', skin: '#c0392b', accent: '#ffd23f', glove: '#ffd23f', shoe: '#6a1b9a', glow: '#ff6a00', sleeves: false, eyes: '#fff3b0', chain: '#ffd23f' },
      custom: { primary: '#ffb000', secondary: '#6a1b9a', aura: '#ff6a00', acc: 'none', title: '' },
      moves: {
        fan: { name: 'Alev Yelpazesi', anim: 'fireball' },
        rain: { name: 'Ateş Yağmuru', anim: 'storm' },
        beam: { name: 'Cehennem Işını', anim: 'beam' },
        claw: { name: 'Pençe Işınlanma', anim: 'strong' }
      },
      tip: 'Cehennem Işını gelirken ÇÖMEL! Yağmurda kırmızı işaretlerden uzak dur.'
    },
    {
      id: 'kar', boss: true, name: 'KAR KRALİÇESİ', title: 'Ebedi Kışın Hükümdarı',
      stats: { hp: 3100, power: 1.15, speed: 1.3, rest: 70, pref: 45 },
      look: { build: 1.2, height: 1.36, hair: 'long', hairColor: '#f5fbff', skin: '#e4eef8', accent: '#bff6ff', glove: '#bff6ff', shoe: '#1e3a5f', glow: '#9ff3ff', sleeves: true, coat: true, crown: '#bff6ff', eyes: '#2ff3ff' },
      custom: { primary: '#5fb8d6', secondary: '#e0f2fe', aura: '#9ff3ff', acc: 'none', title: '' },
      moves: {
        shards: { name: 'Buz Kıymıkları', anim: 'cast' },
        icicles: { name: 'Sarkıt Yağmuru', anim: 'storm' },
        wave: { name: 'Don Dalgası', anim: 'slam' },
        dash: { name: 'Buz Kayışı', anim: 'rush' },
        blizzard: { name: 'Tipi', anim: 'storm' }
      },
      tip: 'Buz seni yavaşlatır. Don Dalgası yerden gelir: zıpla ya da çömelerek blokla.'
    },
    {
      id: 'karabasan', boss: true, name: 'KARABASAN', title: 'Gölge Suikastçı',
      stats: { hp: 3600, power: 1.24, speed: 1.9, rest: 54, pref: 40 },
      look: { build: 1.15, height: 1.3, hair: 'hood', hairColor: '#120a20', skin: '#6b5a7a', accent: '#b366ff', glove: '#0b0712', shoe: '#0b0712', glow: '#b366ff', sleeves: true, mask: true, scarf: '#7b2cbf', eyes: '#d9a3ff' },
      custom: { primary: '#1a1028', secondary: '#120a20', aura: '#b366ff', acc: 'none', title: '' },
      moves: {
        slash: { name: 'Gölge Kesiği', anim: 'strong' },
        blink: { name: 'Arkandayım', anim: 'strong' },
        kunai: { name: 'Kunai Yelpazesi', anim: 'throw' },
        pillars: { name: 'Gölge Sütunları', anim: 'storm' },
        dash: { name: 'Hayalet Atılma', anim: 'rush' }
      },
      tip: 'Arkana ışınlanınca hemen ters yöne blok yap. Mor işaretlerden kaç.'
    },
    {
      id: 'imparator', boss: true, name: 'GÖLGE İMPARATORU', title: 'Son Hükümdar',
      stats: { hp: 4000, power: 1.28, speed: 1.25, rest: 58, pref: 30 },
      look: { build: 1.6, height: 1.55, hair: 'helmet', hairColor: '#1b0b24', skin: '#5a4a66', accent: '#8a6a10', glove: '#1b0b24', shoe: '#0d0510', glow: '#ff1e56', sleeves: true, cape: '#7a0f2e', eyes: '#ff1e56', pads: '#4a1a3a' },
      custom: { primary: '#2a0a3a', secondary: '#140516', aura: '#ff1e56', acc: 'none', title: '' },
      moves: {
        strike: { name: 'Taht Darbesi', anim: 'slam' },
        beam: { name: 'Karanlık Işın', anim: 'beam' },
        meteors: { name: 'Kıyamet Yağmuru', anim: 'storm' },
        leap: { name: 'Hükümdar İnişi', anim: 'quake' },
        blink: { name: 'Gölge Adımı', anim: 'strong' },
        orbs: { name: 'Ruh Küreleri', anim: 'fireball' },
        doom: { name: 'SON HÜKÜM', anim: 'storm' }
      },
      tip: 'Her şeyi yapar. Işında çömel, yağmurda kaç, inişte zıpla. Birbirinizi diriltin!'
    }
  ];

  const CHAPTERS = [
    {
      boss: 'rifki', stage: 'neon', title: 'Neon Sokaklar',
      intro: 'Bir gece İstanbul\'un bütün ışıkları söndü. Şehrin kalbindeki Piksel Kristali çalınmış ve altı parçaya bölünmüş! İlk parça, Neon Sokaklar\'ın korkulu rüyası Kara Rıfkı\'nın cebinde. Mahalleli kepenkleri indirdi. Haddini bildirme vakti!',
      quote: 'Bu sokaklar benim, ufaklık!',
      outro: 'Rıfkı yere serildi ve ilk kristal parçası parıldıyor. Cebinden bir not düşüyor: "Golem uyandı. Dojoya kimse yaklaşmasın. — G.İ."'
    },
    {
      boss: 'golem', stage: 'dojo', title: 'Uyanan Bekçi',
      intro: 'Gün Batımı Dojosu\'nun altında yüzyıllardır uyuyan Demir Golem, gizemli bir büyüyle uyandırılmış. Göğsüne gömülü kristal parçası onu neredeyse durdurulamaz kılıyor. Dojo ustası yaralı. Sıra sizde!',
      quote: '...GİRİŞ... YASAK...',
      outro: 'Golem paramparça oldu. Yaralı usta fısıldıyor: "Bu işin arkasında Gölge İmparatoru var. Ateş Cini Boğaz\'ı yakmadan yetişin!"'
    },
    {
      boss: 'cin', stage: 'istanbul', title: 'Boğaz Yanıyor',
      intro: 'Yüzyıllarca bir lambaya hapsolan Ateş Cini, özgürlüğü karşılığında imparatora hizmet ediyor. Boğaz\'ın üzerine alev yağıyor, köprü kırmızıya boyandı. Lambayı geri doldurmanın tek yolu onu yenmek!',
      quote: 'Dileklerinizi söyleyin... son dilekleriniz olsun!',
      outro: 'Cin dumanlar içinde lambasına geri çekildi. Kristal soğurken hava aniden buz kesiyor. Temmuz ayında... kar mı yağıyor?'
    },
    {
      boss: 'kar', stage: 'kis', title: 'Ebedi Kış',
      intro: 'İstanbul\'a temmuzda kar yağıyor! Martılar bile dondu. Kar Kraliçesi, kristalin gücüyle şehri sonsuz bir kışa gömmeye çalışıyor. Onun soğuk kalbini eritin!',
      quote: 'Donun... sonsuza dek.',
      outro: 'Buzlar çözülüyor, şehre bahar geliyor. Ama karanlık bir sokakta biri sizi izliyor. Bir fısıltı: "Sıradaki benim..."'
    },
    {
      boss: 'karabasan', stage: 'neon', title: 'Gecenin Gözleri',
      intro: 'İmparatorun sağ kolu Karabasan, gölgelerin içinden avlanır. Onu göremezsiniz, sadece ensenizde hissedersiniz. Beşinci parça onda. Sırt sırta verin, kimse yalnız kalmasın!',
      quote: 'Arkana bak... çok geç.',
      outro: 'Karabasan dumana dönüşüp kayboldu ama beşinci parçayı bıraktı. Uzakta Gölge Sarayı\'nın kapıları gıcırdayarak açılıyor...'
    },
    {
      boss: 'imparator', stage: 'saray', title: 'Son Hüküm',
      intro: 'Gölge Sarayı. Kristalin son parçası İmparatorun tacında parlıyor. Şehrin ışığı ya bu gece geri gelecek ya da hiç gelmeyecek. Tüm güçlerinizi toplayın!',
      quote: 'Işığınız... benim sofram olacak!',
      outro: 'Kristal birleşti ve İstanbul yeniden ışıl ışıl! Ama imparatorun son sözleri kulaklarınızda yankılanıyor: "Gölgeler... her seferinde daha güçlü... geri dönecek..." (SONSUZ TUR açıldı: bosslar her turda güçleniyor!)'
    }
  ];

  // Bölüm bilgisi (7+ = sonsuz turlar)
  function chapterInfo(ch) {
    ch = Math.max(1, ch | 0);
    const idx = (ch - 1) % CHAPTERS.length, loop = Math.floor((ch - 1) / CHAPTERS.length);
    const c = CHAPTERS[idx], boss = getBoss(c.boss);
    const stars = '★'.repeat(loop);
    return {
      ch, idx, loop, level: ch, boss: c.boss, bossName: boss.name, bossTitle: boss.title, stage: c.stage,
      title: `Bölüm ${ch}: ${c.title}${loop ? ' ' + stars : ''}`,
      intro: loop ? `TUR ${loop + 1}: Gölgeler geri döndü! ${boss.name} eskisinden çok daha güçlü ve öfkeli. Kristal parçasını yeniden almak zorundasınız. (Boss seviyesi: ${ch})` : c.intro,
      quote: c.quote, outro: loop ? `${boss.name} yine yenildi! Ama gölgeler pes etmiyor...` : c.outro,
      tip: boss.tip, reward: 120 + 100 * ch
    };
  }

  // ------------------------------------------------------------ DÜKKAN (sadece Hikaye modunda etkili)
  const SHOP = [
    { id: 'glove', icon: '🥊', name: 'Ejder Eldiveni', desc: 'Verdiğin hasar +%8', max: 5, prices: [150, 300, 500, 800, 1200] },
    { id: 'armor', icon: '🛡️', name: 'Çelik Zırh', desc: 'Aldığın hasar -%6', max: 5, prices: [150, 300, 500, 800, 1200] },
    { id: 'heart', icon: '❤️', name: 'Can Tılsımı', desc: 'Maksimum can +%12', max: 5, prices: [120, 250, 420, 700, 1050] },
    { id: 'boots', icon: '👟', name: 'Rüzgar Çizmesi', desc: 'Hareket hızı +%5', max: 4, prices: [120, 250, 450, 750] },
    { id: 'crystal', icon: '💎', name: 'Enerji Kristali', desc: 'Ulti barı +%15 hızlı dolar', max: 4, prices: [200, 400, 700, 1100] },
    { id: 'ring', icon: '💍', name: 'Vampir Yüzüğü', desc: 'Verdiğin hasarın %3\'ü kadar can kazan', max: 4, prices: [250, 500, 850, 1300] },
    { id: 'feather', icon: '🪶', name: 'Anka Tüyü', desc: 'Ölünce otomatik dirilirsin (%40 can). Tek kullanımlık, en fazla 3 tane.', max: 3, consumable: true, prices: [300, 300, 300] }
  ];
  function cleanEquip(e) {
    const out = {};
    e = e || {};
    for (const it of SHOP) { const v = Math.floor(Number(e[it.id]) || 0); out[it.id] = Math.max(0, Math.min(it.max, v)); }
    return out;
  }

  const NORMAL_ANIMS = { lp: 'jab', hp: 'strong', k: 'kick', clp: 'cjab', chp: 'cupper', ck: 'sweep', jlp: 'jpunch', jhp: 'jstrong', jk: 'jkick' };

  const TAUNTS = ['Hadi gel!', 'Bu kadar mı?', 'Hahaha!', 'GG!'];

  function getBoss(id) { return BOSSES.find(b => b.id === id); }
  function getChar(id) { return CHARACTERS.find(c => c.id === id) || getBoss(id) || CHARACTERS[0]; }

  function moveAnim(charId, moveId) {
    if (!moveId) return '';
    if (NORMAL_ANIMS[moveId]) return NORMAL_ANIMS[moveId];
    const c = getChar(charId);
    return (c.moves[moveId] && c.moves[moveId].anim) || 'jab';
  }

  const api = { CHARACTERS, BOSSES, CHAPTERS, SHOP, MODES, ACCESSORIES, STAGES, NORMAL_ANIMS, TAUNTS, getChar, getBoss, moveAnim, chapterInfo, cleanEquip };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.GameData = api;
})(typeof window !== 'undefined' ? window : this);
