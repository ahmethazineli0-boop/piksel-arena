# 🥊 PİKSEL ARENA (v3.1 · 3D · Telefonda da oynanır)

Arkadaşınla farklı bilgisayarlardan online oynayabileceğin, Street Fighter / Tekken tarzı **3D** dövüş oyunu.

- **6 karakter**, her birinin farklı istatistikleri, pasif yeteneği, 2 özel hareketi ve 1 ultisi var
- **3 oyun modu:** Düello (1v1), **Üçlü Kapışma** (3 kişi herkes herkese), **Hikaye: Boss Avı** (1-3 kişi birlikte bosslara karşı)
- **Hikaye modu:** 6 bölüm, 6 farklı boss, sonra her turda güçlenen **Sonsuz Tur**
- **Dükkan:** bosslardan kazandığın altınla ekipman al, güçlen (sadece hikayede etkili)
- Boş koltuklara **bot** eklenebilir (rakip ya da takım arkadaşı) + izleyici modu
- **Oyun içi ve lobi sohbeti**, laf atma balonları (1-4 tuşları)
- **Özelleştirme:** kostüm renkleri, hazır paletler, aura rengi, aksesuar (taç, şapka, gözlük...), unvan
- **3 arena:** Gece Boğazı, Gün Batımı Dojosu, Neon Sokaklar
- Kombo sistemi, blok, zırh, karşı saldırı, ulti sinematiği, chiptune müzik ve efektler
- Tuş atama ekranı ve gamepad desteği
- **3D grafik:** Three.js ile ışık, gölge, ışık patlaması (bloom), yağmur/kar/kıvılcım, sinematik ulti kamerası
- **Kurulum yok:** hiçbir paket indirmez, sadece Node.js gerekir (3D kütüphanesi oyunun içinde, internet olmadan da çalışır)

### Grafik ayarı
- Oyun bilgisayarın hızına göre grafik kalitesini **otomatik** düşürür (Yüksek → Orta → Düşük).
- Maç sırasında **G** tuşuyla elle değiştirebilirsin. Seçimin kaydedilir.
- En iyi sonuç için **Chrome** veya **Edge** kullan. Ekran kartı sürücülerin güncel olsun.

---

## 1) Başlatma (oyunu kuran kişi)

1. **Node.js** kur: https://nodejs.org → "LTS" sürümü (bir kere yapman yeterli).
2. Bu klasörü bir yere çıkar.
3. **Windows:** `baslat.bat` dosyasına çift tıkla.
   **macOS / Linux:** terminalde `./baslat.sh` (ya da `node server.js`).
4. Tarayıcı açılır (`http://localhost:3000`). Adını yaz → **ODA KUR**.
5. Üstteki **ODA kodunu** arkadaşına söyle (ya da koda tıklayıp davet linkini kopyala).

> Windows ilk açılışta güvenlik duvarı izni sorarsa **"İzin ver"** de (özel ağlar).

Sunucu açılınca pencerede adresler yazar:

```
Bu bilgisayardan:  http://localhost:3000
Aynı ağdan (LAN):  http://192.168.1.25:3000
```

## 2) Arkadaşın nasıl bağlanır?

Arkadaşının hiçbir şey kurmasına gerek yok, sadece tarayıcı yeter.

### A) Aynı evdeyseniz / aynı Wi-Fi'deyseniz
Arkadaşın tarayıcıya sunucu penceresindeki **"Aynı ağdan (LAN)"** adresini yazar, oda koduyla katılır. Bu kadar.

### B) Farklı evlerdeyseniz (internet üzerinden)

**En kolayı — tek tık (Windows):** `internetten_oyna.bat` dosyasına çift tıkla.
Sunucuyu açar, tünel programını kendisi indirir (ilk seferde) ve ekrana `https://....trycloudflare.com` gibi bir link yazar. Link panoya da kopyalanır.
Bu linki arkadaşına gönder. **Sen de oyuna aynı linkten gir**, oda kur, kodu arkadaşına söyle.
Pencereleri kapatma; her açışta link değişir.

> ⚠️ Arkadaşın asla `localhost` yazmasın. Localhost kendi bilgisayarı demek.

Diğer yollar:

**Yol 1 — Cloudflare hızlı tünel (önerilen, en kolay):**
1. `cloudflared` programını indir: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/
2. Oyun sunucusu açıkken ayrı bir terminalde çalıştır:
   ```
   cloudflared tunnel --url http://localhost:3000
   ```
3. Ekranda `https://xxxx.trycloudflare.com` gibi bir adres çıkar. Bu adresi arkadaşına gönder, ikiniz de o adresten girin.

**Yol 2 — Sanal LAN (Radmin VPN, ZeroTier veya Tailscale):**
İkiniz de aynı programı kurup aynı ağa katılın. Arkadaşın tarayıcıya `http://SENİN-VPN-IP-ADRESİN:3000` yazar.

**Yol 3 — Modemden port yönlendirme:**
Modem arayüzünden **3000 TCP** portunu bilgisayarına yönlendir. Arkadaşın `http://GERÇEK-IP-ADRESİN:3000` ile girer (IP'ni "what is my ip" diye aratarak bulabilirsin).

**Kalıcı sunucu istersen:** Klasörü Render, Railway veya Fly.io gibi bir Node.js barındırma servisine yükleyebilirsin. Başlatma komutu `node server.js`; sunucu `PORT` ortam değişkenini otomatik kullanır.

> İpucu: Ping ne kadar düşükse o kadar akıcı olur. Lobide sağ üstte ping görünür.

---

## 📱 Telefonda oynama

Sunucu yine **bilgisayarda** çalışır (`baslat.bat` / `internetten_oyna.bat`). Telefon sadece tarayıcıdan bağlanır, hiçbir şey kurmak gerekmez.

1. **Aynı Wi-Fi'deysen:** Telefonun tarayıcısına sunucu penceresindeki `http://192.168.x.x:3000` adresini yaz.
   **Farklı yerdeysen:** `internetten_oyna.bat` ile çıkan `https://....trycloudflare.com` linkini aç.
2. Adını yaz, odaya katıl. Lobi dikey ekranda rahatça kullanılır.
3. **HAZIRIM**'a basınca oyun tam ekrana geçer. Maç için **telefonu yan çevir**.

**Dokunmatik kontroller**
- **Sol taraf: joystick.** Ekranın soluna nereye dokunursan orada açılır. Sağa/sola yürü, yukarı zıpla, aşağı çömel. **Rakibin ters yönüne çekmek = blok.**
- **Sağ taraf:** HAFİF / AĞIR yumruk, TEKME, **Ö1 / Ö2** (karakterinin özel hareketleri, adları butonda yazar) ve **ULTİ** (bar dolunca parlar, telefon titrer).
- 💬 sohbet, 😄 laf atma butonları sağ kenarda.
- Vurulunca telefon hafifçe titrer.

**Uygulama gibi kullanmak (önerilir)**
- **Android (Chrome):** Menü ⋮ → **"Ana ekrana ekle"**. Oyun simgesinden tam ekran açılır.
- **iPhone (Safari):** Paylaş □↑ → **"Ana Ekrana Ekle"**. iPhone'da gerçek tam ekran sadece bu yolla olur.

**Telefonda performans:** Oyun telefonda "Orta" grafik ayarıyla başlar, kasarsa kendisi düşürür.
Sağ üstteki butonlarla sesi kapatabilirsin. Eski veya zayıf telefonlarda 3D akıcı olmayabilir.

## Telefonda tek başına (v3.2)

Oyun artık **bilgisayar ve internet olmadan** telefonda çalışabiliyor. Sunucu yoksa oyun bunu fark eder ve
oda/maç mantığını telefonun içinde (ayrı bir iş parçacığında) çalıştırır: botlara karşı düello, üçlü kapışma
ve hikaye modu, dükkan ve altınlar dahil. Menüde buton **OYNA** olur, odaya girince otomatik bir bot rakip gelir.

- **iPhone:** oyunun yayınlandığı adresi Safari'de aç → Paylaş □↑ → **Ana Ekrana Ekle**. İlk açılıştan sonra internetsiz de açılır.
- **Android:** Chrome'da aç → ⋮ → **Ana ekrana ekle** / **Uygulamayı yükle**.
- Arkadaşınla **online** oynamak için yine bilgisayarda `baslat.bat` / `internetten_oyna.bat` ile sunucuyu aç
  ve o linke gir; oyun sunucuyu görünce otomatik online moda geçer.

Kod tarafı: `public/js/sim.js` (dövüş) ve `public/js/roomcore.js` (odalar) artık hem `server.js` hem de
telefondaki `public/js/localworker.js` tarafından kullanılıyor. `public/sw.js` dosyaları önbelleğe alır.

## 3) Kontroller (Tuşlar menüsünden değiştirilebilir)

| Hareket | Tuş |
|---|---|
| Sola / Sağa | A / D (veya ← →) |
| Zıpla | W (veya ↑) |
| Çömel | S (veya ↓) |
| Hafif yumruk | J |
| Ağır yumruk | K |
| Tekme | L |
| Özel hareket 1 | U |
| Özel hareket 2 | I |
| **ULTİ** (bar dolunca) | O (veya Boşluk) |
| **Blok** | Rakibin ters yönüne basılı tut |
| Sohbet | Enter |
| Laf at | 1, 2, 3, 4 |
| Ses aç/kapa · Tam ekran · Grafik kalitesi | M · F · G |

**Kombo ipuçları**
- Hafif yumruk isabet edince hemen ağır yumruk / tekme / özel hareketle zincirle.
- Ağır yumruk ve tekmeler özel harekete ya da ultiye iptal edilebilir.
- Çömelip ağır yumruk havadan geleni düşürür; çömelip tekme rakibi yere serer.
- Havadan gelen saldırılar ayakta, alttan gelenler çömelerek bloklanır.
- Ulti barı vurdukça ve hasar aldıkça dolar. Dolunca karakterin parlar.

## 4) Oyun modları

Lobide sağ üstteki **Mod** menüsünden oda sahibi seçer.

- **Düello (1v1):** Klasik. Üçüncü kişi "yedek" koltukta bekler.
- **Üçlü Kapışma:** 3 kişi aynı anda, herkes herkese. Canı biten elenir, son kalan raundu alır. Eksik kişiyi botla doldurabilirsin.
- **Hikaye: Boss Avı:** 1-3 kişi aynı takımda, devasa bir bossa karşı.

### Hikaye modu
İstanbul'un ışığını sağlayan Piksel Kristali çalındı ve 6 parçaya bölündü. Her parça bir bossta:

| Bölüm | Boss | Arena | Dikkat et |
|---|---|---|---|
| 1 | **Kara Rıfkı**, Sokak Kabadayısı | Neon Sokaklar | Şişeleri blokla, hücumdan zıpla |
| 2 | **Demir Golem**, Kadim Bekçi | Gün Batımı Dojosu | Süpürmeden zıpla, iniş şok dalgaları |
| 3 | **Ateş Cini**, Lambadan Kaçan | Gece Boğazı | Cehennem Işınında ÇÖMEL |
| 4 | **Kar Kraliçesi** | Karlı Boğaz | Buz yavaşlatır, Don Dalgasından zıpla |
| 5 | **Karabasan**, Gölge Suikastçı | Neon Sokaklar | Arkana ışınlanır, ters yöne blokla |
| 6 | **Gölge İmparatoru**, Son Hükümdar | Gölge Sarayı | Hepsini yapar! |

6. bölümden sonra **Sonsuz Tur** açılır: bosslar baştan gelir ama her turda çok daha güçlüdür.

- Boss can barı yarıya inince **ÖFKELENİR**: hızlanır ve yeni saldırılar açar.
- Boss saldırmadan önce kırmızı yanıp söner ve başında **!** çıkar. Yere düşecek şeylerin yerinde kırmızı işaret belirir, oradan kaç!
- Can barının altındaki sarı çizgi **sersemleme** barıdır. Dolunca boss birkaç saniye sersemler, kombo zamanı!
- **Diriltme:** Arkadaşın düşerse yanına git ve **↓ (çömel) basılı tut**. Halka dolunca dirilir. Herkes düşerse bölüm kaybedilir.
- Kazanınca bölüm ödülü (altın) gelir ve sonraki bölüm açılır. Kaybedince de ödülün %30'unu alırsın.
- Arkadaşınla oynarken, odadakilerden en ileri gidenin bölümleri seçilebilir. Kişi sayısı arttıkça boss canı artar.

### Dükkan (lobide ortadaki DÜKKAN sekmesi)
| Ekipman | Etki | Seviye |
|---|---|---|
| 🥊 Ejder Eldiveni | Hasar +%8 | 5 |
| 🛡️ Çelik Zırh | Alınan hasar -%6 | 5 |
| ❤️ Can Tılsımı | Maks. can +%12 | 5 |
| 👟 Rüzgar Çizmesi | Hız +%5 | 4 |
| 💎 Enerji Kristali | Ulti barı +%15 hızlı | 4 |
| 💍 Vampir Yüzüğü | Verdiğin hasarın %3'ü kadar can | 4 |
| 🪶 Anka Tüyü | Ölünce %40 canla otomatik diril (tek kullanımlık, en fazla 3) | — |

Altın ve ekipmanlar **kendi tarayıcına** kaydedilir (aynı bilgisayar ve aynı tarayıcıdan girersen kaybolmaz). Ekipmanlar Düello ve Üçlü Kapışmada etkisizdir, PvP adil kalır.

## 5) Karakterler

| Karakter | Tarz | Pasif | Özel 1 | Özel 2 | ULTİ |
|---|---|---|---|---|---|
| **KAAN** – Alev Ronin | Dengeli | Öfke: %30 can altında +%15 hasar | Ateş Topu | Ejder Yumruğu (dokunulmaz aparkat) | **Ejder Fırtınası** – ekranı kesen ışın |
| **YILDIZ** – Gölge Ninja | Çok hızlı | Çift zıplama | Kunai (havada çapraz) | Gölge Adımı (arkaya ışınlanma) | **Gölge Dansı** – 9 darbelik ışınlanma |
| **DEMİR** – Çelik Pehlivan | Ağır & güçlü | %15 az hasar, zırhlı ağır yumruk | Boğa Hücumu (zırhlı) | Yer Sarsıntısı (alçak şok dalgası) | **Deprem** – zıplamazsan çok acıtır |
| **VOLT** – Şimşek Çocuk | Alan kontrolü | Ulti barı %35 hızlı dolar | Şimşek Küre (3 vuruş) | Elektrik Alanı (anti-hava) | **Yıldırım Yağmuru** – 5 yıldırım |
| **AYAZ** – Buz Bekçisi | Uzun menzil | Normal vuruşlar daha uzun | Buz Kristali (yavaşlatır) | Buz Kalkanı (karşı saldırı) | **Kutup Fırtınası** – dondurup parçalar |
| **NEON** – Kickboks Yıldızı | Akrobatik kombo | Kombo hasarı az düşer, uzun tekmeler | Kasırga Tekme (havada da) | Ay Takla (dokunulmaz) | **Neon Kasırga** – rakibi içine çeker |

## 6) Oda ayarları (oda sahibi değiştirir)
Mod, raunt sayısı (tek / 3'te 2 / 5'te 3), raunt süresi (45 / 60 / 99 sn / sınırsız), arena ve can çarpanı (%50–%200). Boş koltuğa **bot** ekleyebilirsin; botun karakterini koltuğundaki menüden seçersin. Maç ortasında biri çıkarsa (Üçlü/Hikaye) yerine bot devam eder. Odaya üçüncü biri girerse izleyici olur, sohbete katılabilir.

## 7) Dosyalar

```
server.js            → Web + WebSocket sunucusu, odalar, sohbet (bağımlılıksız)
sim.js               → Dövüş motoru + boss yapay zekası (60 kare/sn, sunucuda çalışır)
public/index.html    → Arayüz
public/style.css     → Tasarım
public/js/characters.js → Karakterler, bosslar, hikaye metinleri, dükkan fiyatları
public/js/render3d.js → 3D grafik motoru: kamera, efektler, HUD, lobi önizlemeleri
public/js/r3d/        → 3D karakter üretici, pozlar, arenalar, efektler
public/vendor/        → Three.js 3D kütüphanesi (MIT lisansı)
public/js/audio.js   → Sentezlenmiş chiptune sesler ve müzik
public/js/main.js    → İstemci: ağ, tuşlar, lobi, sohbet
```

**Kendin değiştirmek istersen:** karakter canı/hızı/gücü `public/js/characters.js` içinde `stats`, vuruş hasarları `sim.js` içindeki `NORMALS`, `SPECIALS` ve boss saldırıları `BOSS_MOVES` tablolarında. Boss canı/gücü ve dükkan fiyatları `characters.js` içinde.

## Sorun giderme
- **"Bağlantı yok"**: Sunucu penceresi açık mı? Kapattıysan oyun durur.
- **Arkadaşım bağlanamıyor**: Güvenlik duvarı izni ver, doğru IP'yi yazdığından emin ol veya Cloudflare tünelini dene.
- **Takılma / gecikme**: Kablolu bağlantı ve aynı ülkede sunucu en iyisi. Sunucuyu ikinizden internet bağlantısı daha iyi olan açsın.
- **Oyun kasıyor / yavaş**: Maç sırasında G tuşuna basıp grafiği Düşük yap. Tarayıcıda donanım hızlandırma açık olmalı (Chrome: Ayarlar → Sistem → "Kullanılabilir olduğunda grafik hızlandırmayı kullan").
- **Siyah ekran / 3D açılmıyor**: Tarayıcın WebGL desteklemiyor olabilir. Chrome veya Edge'i güncelle.
- **Ses yok**: Sayfaya bir kez tıkla (tarayıcılar sesi ilk tıklamadan sonra açar), M tuşuyla sessiz modda olmadığını kontrol et.

İyi kapışmalar! 🎮
