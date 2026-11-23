# Kara Kutu · "Mit mi Gerçek mi?" — Üretim Rehberi

Video, ses, ekran yazısı ve senaryo nasıl üretiliyor? Her bölüm bu sırayla yapılır. Tamamı sunucuda, ücretsiz araçlarla.

---

## 1. Konu ve dava seçimi (senaryo öncesi)

1. **Mit seç:** Toplumun yanlış bildiği bir trafik inancı. Örnek: "Kemer takmamak sadece trafik cezasıdır", "Alkollüysen kaza otomatik senin suçundur".
2. **Lexara'da dava bul:** `ictihat_ara` ile Yargıtay kararı ara, filtre `hukum: onama` (karar kesinleşmiş olmalı).
3. **Şart:** Sonu net olmalı (beraat / mahkûmiyet / tazminat tutarı). Sonu belirsiz dava kullanılmaz.
4. `karar_oku` ile tam metni oku: olay nasıl oldu, kim kusurlu, mahkeme ne dedi, Yargıtay ne yaptı.
5. Güncel bir rakam söylenecekse (ceza tutarı vb.) `madde_oku` + web araması ile doğrula.

**Yasaklar:** kişi adı, plaka, şehir adı, Yargıtay esas/karar numarası, daire adı, tarih videoda yer almaz. Bunlar yalnız teslim kartındaki `kaynaklar` alanında (iç kayıt) durur.

---

## 2. Senaryo (7 parça kalıbı)

Her bölüm ~60–70 sn, 7 seslendirme parçası:

| # | Bölüm | Ton | İçerik |
|---|-------|-----|--------|
| V1 | Kanca | gerilim | Mit cümlesi + "Herkes böyle bilir. Peki mahkeme ne dedi?" |
| V2 | Olay 1 | normal | Yer ve başlangıç (şehir adı yok: "şehir içinde ışıklı bir kavşak") |
| V3 | Olay 2 | gerilim | Kaza anı ve kilit bilgi (promil, kusur oranı…) |
| V4 | Oylama | soru | "Sizce ne oldu? A, B, yoksa C? Cevabını yoruma yaz." |
| V5 | Geri sarma | gizem | "Geri saralım…" + 3 ipucu |
| V6 | Karar | vurgu | Mahkemenin gerekçesi + sonuç + "Yargıtay onadı." |
| V7 | Ders | vurgu | Mitin çöküşü + uyarı + "Sen hangi şıkkı seçtin?" |

Kurallar:
- Kısa cümle, konuşma dili, 2. şahıs ("sen").
- Sayılar yazıyla yazılır (TTS doğru okusun): "sıfır virgül elli yedi promil", "yirmi beş bin lira".
- Oylama 3 şık; doğru şık karar ekranında gösterilir ("Doğru şık: B").
- Hassas an: çarpma anı gösterilmez veya siyah ekran + yazıyla geçilir; dava dosyasında detay yoksa "TEMSİLİ CANLANDIRMA" etiketi.

---

## 3. Ses (seslendirme)

- **Motor:** Gemini TTS, ses **Charon** (tok erkek anlatıcı). Tüm bölüm **tek ses, tek model** — araya farklı ses girmez.
- **İş dosyası:** `aesun/sunucu/tts_kuyruk/<KOD>.json` push edilir, sunucu okur.

```json
{"kod":"KK_MIT_05","motor":"gemini","ses":"charon",
 "model_tercih":"gemini-3.1-flash-tts-preview","model_kilit":true,
 "parcalar":[{"ad":"V1","ses":"charon","tek_istek":true,"ton":"gerilim","metin":"..."}]}
```

- `model_kilit: true` → kota dolsa bile başka modele geçmez (ses karakteri değişmesin). Kota dolarsa kalan parçalar ayrı iş olarak (`KOD_B`) ertesi gün ya da başka anahtarla aynı modelde okutulur.
- Çıktı: `sunucu/tts_kuyruk/cikti/<KOD>__V1.mp3 …`; günlük: `cikti/gunluk.txt`.
- Baş/son sessizlik kırpılır (ffmpeg `silenceremove`), süreler ölçülür → zaman çizelgesi bu sürelere göre kurulur.

**Efekt + müzik:** `audio_mitN.py` (numpy ile sentez; telif yok): motor, fren, çarpma, geri sarma, ipucu "blip", gerilim altlığı.
**Miks:** sesler `adelay` ile yerine konur → `loudnorm` (−16 LUFS) → efekt sesin altında kalsın diye `sidechaincompress` (ducking) → limiter.

---

## 4. Ekran yazısı (altyazı + kartlar)

Zaman çizelgesi dosyası `mitN_tl.json` her şeyi yönetir:

| Alan | Ne |
|------|----|
| `kaza, poll, rew, slow, karar, ders, next, end` | Bölüm geçiş saniyeleri |
| `map` | Gerçek zaman → sahne simülasyon zamanı eşlemesi |
| `cd0` | Oylama geri sayımının başlangıcı (5 sn) |
| `rwTo, slowRate` | Geri sarma hedefi ve yavaş çekim hızı |
| `clues` | Yavaş çekimde çıkan 3 ipucu kartı |
| `reasons, hukum, onay` | Gerekçe satırları, SONUÇ satırı, "YARGITAY ONADI" mührü |
| `caps` | Altyazılar `[başlangıç, bitiş, "metin<br>satır2"]` |

- Altyazı: her ses parçası noktalama yerlerinden bölünür, süre karakter oranıyla dağıtılır, sayılar rakamla gösterilir (0,57 promil, 25.000 TL). Satır başına ~26 karakter, en fazla 2 satır.
- Sabit katmanlar: KARA KUTU logosu, ilerleme çubuğu (MİT · KAZA · OYLA · KARAR · DERS), alt satırda kaynak notu ("Yargıtay kararı · Kişi, plaka ve yer bilgisi verilmemiştir").
- 3D etiketler araçların üstünde: "ALKOLLÜ SÜRÜCÜ", "SAĞDAKİ ARAÇ", "KUSUR?".

---

## 5. Video (görüntü)

- **Sahne:** `proj/scene.html` — Three.js ile kodla 3D: asfalt, kaldırım, binalar, ağaç, trafik ışığı; gerçek dokular three.js deposundan (MIT), gökyüzü/ışık Poly Haven HDRI (CC0).
- **Araçlar:** kodla modellenmiş sıradan sedan / kamyon / motosiklet (lüks araç yok, dosyada ne yazıyorsa o). Sağdan trafik kuralına uygun şeritler.
- **İnsanlar:** yüzsüz manken, aksesuar yok.
- **Kamera:** geniş açı, yukarıdan-arkadan; kaza tam görünür.
- **Hareket:** her sahnenin fizik benzeri simülasyonu (`upd`, `upd2`): kalkış ivmesi, dönüş yayı, çarpma sonrası savrulma, cam kırığı, toz.
- **Render:** `render.mjs` (Playwright + başsız Chrome) her kareyi tek tek çeker:
  `RF=renderMitN node render.mjs 540 960 24 0 33 fmN` ve `… 33 66 fmN` (iki paralel iş).
- **Birleştirme:** ffmpeg → `kara_kutu_mitNN_<konu>.mp4` (540×960 önizleme).

---

## 6. Önizleme → teslim → yayın

1. Önizleme Ömer'e gönderilir.
2. Yayın kopyası: 1080×1920, ilk siyah kare atlanır (`-ss 0.35`), renk `eq=saturation=1.3:contrast=1.04`, `crf 24 maxrate 6M` (<100 MB).
3. Yükleme Yöneticisi'ne teslim:
   - video → `sunucu/havuz/gelen/<KOD>.mp4`
   - kart → `sunucu/havuz/teslim/<KOD>.json` (kanal KK_TR, Short, kategori 27, `sentetik: true`, başlık, açıklama + uyarı notu, etiketler, kaynaklar, lisans)
   - işlem → `sunucu/islem_havuz_kk_mitN.sh` (yalnız **teslim + planla**)
4. **Yayın onayını yalnız Ömer verir** (panelde tek tık). Onaysız hiçbir video yayınlanmaz.

---

## 7. Bölüm kontrol listesi

- [ ] Karar kesinleşmiş (onama) ve sonu net
- [ ] Videoda isim / plaka / şehir / karar numarası yok
- [ ] Tek ses (Charon, tek model)
- [ ] Sayılar doğru ve güncel (kaynakla doğrulandı)
- [ ] Şeritler ve yön mantıklı, kaza geniş açıdan görünüyor
- [ ] Oylama 3 şık + doğru şık karar ekranında
- [ ] Sıradaki mit duyurusu doğru bölümü gösteriyor
- [ ] Açıklamada "genel bilgilendirme, hukuki danışmanlık değildir; kodla üretilmiş canlandırma; yapay zekâ seslendirme" notu
