---
name: ai-kisa-video-fikir-kutusu
description: AI ile üretilen kısa dikey videolar (TikTok/Reels/Shorts) için ilham ve fikir üretme skill'i — 9 farklı video yapısı, her biri için örnek, performans, bizim kanallara uyarlama ve fikir üretme adımları. Kopya değil, esinlenme aracı.
---

# AI Kısa Video Fikir Kutusu

**Amaç:** Başka hesapların videolarını kopyalamak değil, onlardan **yapı** öğrenip kendi kanallarımıza özgün fikir üretmek.
**İlk kaynak:** TikTok @shoof14 (SHOOF). 7 Kasım 2026'da 55 video incelendi; hesapta 8.037 takipçi ve 47,3K beğeni var.
Yeni bir hesap incelendikçe Bölüm 2'ye yeni yapı veya örnek eklenir.

---

## 1. Ortak teknik çerçeve (bütün yapılar için)
- Format: 9:16, 720×1280 veya üstü, süre **15–35 sn**.
- Konuşma yok, sakin enstrümantal müzik kullanılır. Böylece video dil bağımsız olur ve global kitleye ulaşır.
- Açıklama: 1 kısa duygusal cümle ve 1–2 etiket, hedef dilde.
- Platformun "AI ile oluşturuldu" etiketi her zaman açık olmalı.
- Üretim ücretsiz araçlarla sunucuda yapılır:
  - Görsel: açık kaynak görsel modeli
  - Hareket: açık kaynak image-to-video modeli (kendi GPU'muzda)
  - Kurgu: ffmpeg

---

## 2. Video yapıları

### Y1 — Canlanan Tablo (sakin an)
- **Ne:** Tek yağlıboya kare. Karakter göz kırpar, saç ve kumaş kıpırdar, kamera yavaşça yaklaşır.
- **SHOOF örneği:** İskelede şapkalı kadın, gül bahçesindeki kadın.
- **Performans:** 6–10K. Hesabın en istikrarlı yapısı.
- **Zorluk:** Çok kolay (1 görsel + 1 hareket).
- **Bize uyarlama:**
  - Tablo yorum kanalı: ünlü bir tablonun *tarzında* özgün bir sahne canlanır, altına tek cümlelik yorum yazılır.
  - Ambient kanal: aynı yapı 1 saatlik döngü videoya uzatılır.

### Y2 — Ressam Müdahalesi / Dördüncü Duvar (VİRAL YAPI)
- **Ne:** Tablo canlanır, kamera geri çekilir ve **dev bir fırça** sahneye bir şey ekler (kar, yağmur, eşya). Karakter fırçayı fark eder, tepki verir ve kendini yeni duruma uydurur.
- **SHOOF örneği:** Pencerede kitap okuyan kadın, üstüne kar boyanır, kadın sinirlenir ve şala sarınır. **519,6K izlenme, 36,8K beğeni, 884 yorum, 5.449 kayıt.** Hesabın beğenilerinin %78'i bu videodan geldi.
- **Zorluk:** Orta. 3–4 kare gerekir ve karakter bütün karelerde aynı görünmelidir.
- **Kural:** Tanıdık sakin açılış → beklenmeyen müdahale → karakterin tepkisi → tatlı bir son. Mümkünse mevsim veya özel günle bağlantı kurulur.
- **Bize uyarlama:**
  - **Antik Stüdyo:** Tarihî bir sahne açılır (Osmanlı kahvehanesi, Roma senatosu). Fırça modern bir eşya çizer (telefon, wifi modemi). Tarihî karakter şaşırır ve eşyayı kendi dönemine göre kullanır. Kanalın mizah çizgisiyle birebir örtüşür.
  - Aynı karakterle haftalık seri yapılabilir ("Ressam yine karıştırdı").

### Y3 — Mini Hikâye (3D / kil karakter)
- **Ne:** Sevimli bir 3D karakter 3–4 kısa sahnede küçük bir duygusal hikâye yaşar.
- **SHOOF örneği:** Yaşlı çift kafede buluşur ve sarılır, açıklamada "aşk yaşla bitmez" yazar (5,5K). Örgü atkılı kız (5,9K).
- **Performans:** 3,6–5,9K.
- **Zorluk:** Orta (karakter tutarlılığı gerekir).
- **Bize uyarlama:**
  - Hayat hikâyeleri kanalı: tarihî bir kişinin hayatı 30 saniyede kil karakterle anlatılır (çocukluk → dönüm noktası → miras).
  - Aynı karakterin tekrar eden seri haline getirilmesi takipçiyi bağlar.

### Y4 — Tek Metafor + Felsefi Cümle
- **Ne:** Sade arka plan, tek karakter ve tek sembolik hareket (karahindiba üflemek gibi). Açıklamada şiir tadında 3–4 satır olur.
- **SHOOF örneği:** Sarı paltolu kız karahindiba üfler, açıklama "tek tohum, tek nefes, gerisi rüzgârın" anlamında (3,8K).
- **Zorluk:** Kolay.
- **Bize uyarlama:**
  - Günlük motivasyon serisi.
  - Tarihî bir özlü sözü sembolik bir sahneyle görselleştirmek. Söz telifsiz ve kamu malı olmalı.

### Y5 — Günün Selamı (#Morning / #goodnight)
- **Ne:** Sabah veya gece temalı tek sahne (kahve, pencere, yatak, ay) ve kısa selam etiketi.
- **SHOOF örneği:** #Morning (3,4K, 4,6K), #goodnight'ta ördek çift yatakta (3,7K, 4,3K).
- **Zorluk:** Çok kolay. Seri slotu olarak kullanılır.
- **Bize uyarlama:** Her sabah ve her gece sabit saatte yayın yapılır. Algoritmaya düzenli sinyal gider ve izleyicide alışkanlık oluşur.

### Y6 — Takvim / Özel Gün
- **Ne:** Ayın ilk günü, Cadılar Bayramı, düğün sezonu, doğum günü gibi tarihlere özel sahne.
- **SHOOF örneği:** #Hello_November çiçekli yazı (4,1K), #Halloween sevimli hayalet (3,5K), #wedding (3,2K), #happy-birthday (2K).
- **Zorluk:** Kolay. Tarihten **en az 1 hafta önce** üretilir.
- **Bize uyarlama:** Türkiye ve hedef ülkelerin bayram ve özel günleri ile tarihte bugün olan olaylar. Antik Stüdyo için "Tarihte bugün" serisi yapılabilir.

### Y7 — Kıyafet / Masal Prensesi Vitrini
- **Ne:** Parıltılı elbiseli figür döner veya dans eder, saray ya da bahçe arka planı kullanılır.
- **SHOOF örneği:** Balo salonu, kırmızı elbise, gelin-damat (1,8–3,2K).
- **Performans:** Zayıf. Ayrıca Disney benzeri prenses görüntüsü **telif riski** taşır.
- **Bize uyarlama:** Tarihî dönem kıyafetleri seçilebilir (Osmanlı kaftanı, Bizans saray giysisi). Özgün ve eğitici olur, telif riski yoktur.

### Y8 — Atmosfer / Manzara (karakter yok veya siluet)
- **Ne:** Gece sahili, yağmurlu sokak, sisli bahçe, fener ışığı; uzaktan görünen bir siluet.
- **SHOOF örneği:** Gece sahili (2,1K), yağmurlu sokakta şemsiyeli siluet (1,5K).
- **Performans:** Kısa formatta zayıf.
- **Bize uyarlama:** Arka plan ve ambient müzik kanalı için ideal. Kısa versiyonu uzun videonun fragmanı olarak kullanılır.

### Y9 — Hesap Kilometre Taşı / Kolaj
- **Ne:** Eski videolardan hızlı bir kolaj ve büyük yazıyla "Bin izlenme / yeni başarı" kartı.
- **SHOOF örneği:** #milestone (2,8K).
- **Zorluk:** Çok kolay, ek üretim gerektirmez.
- **Bize uyarlama:** Ayda bir teşekkür videosu. Topluluk bağı kurar.

---

## 3. Performans özeti (SHOOF verisinden)
| Sıra | Yapı | Ortalama izlenme | Not |
|---|---|---|---|
| 1 | Y2 Ressam müdahalesi | 519K (tek örnek) | Kayıt oranı çok yüksek → asıl büyüme motoru |
| 2 | Y1 Canlanan tablo (impasto yağlıboya) | 6–10K | İstikrarlı taban |
| 3 | Y3 Mini hikâye 3D | 3,6–5,9K | Seri yapılırsa yükselir |
| 4 | Y5–Y6 Selam / özel gün | 3–4,6K | Düzen ve alışkanlık sağlar |
| 5 | Y4 Metafor | ~3,8K | Ucuz ve hızlı |
| 6 | Y7–Y8–Y9 | 1,5–3K | Tamamlayıcı, ana gövde olamaz |

**Öğrenilenler:**
- Tek hikâyeli bir kırılma anı, düzinelerce sakin videodan daha çok büyütüyor.
- Kalın fırçalı yağlıboya ile nostaljik sahne, masal prensesi tarzından daha iyi çalışıyor.
- Film alıntısı (Shawshank, 1,4K) hem telif riski taşıyor hem düşük getiri sağlıyor.

## 4. Haftalık karışım önerisi (günde 2–3 video)
- 1× **Y2** ressam müdahalesi (haftanın ana videosu)
- 5× **Y1** canlanan tablo
- 3× **Y3** mini hikâye (aynı karakter)
- 7× **Y5** sabah/gece selamı
- Takvime göre **Y6**
- Kalan slotlar **Y4**
- Ayda 1× **Y9**

---

## 5. Fikir üretme adımları
Bu skill çağrıldığında Claude şu sırayla ilerler:
1. **Hedef kanalı sor/belirle:** Antik Stüdyo, hayat hikâyeleri, tablo kanalı, ambient, CutkodA müşteri içeriği vb.
2. **Takvime bak:** Önümüzdeki 7–14 günün özel günlerini ve mevsim geçişlerini çıkar.
3. **Her yapı için fikir üret:** Hedef kanala uyan yapılardan her biri için 2–3 özgün fikir yaz. Her fikirde şunlar bulunur:
   - Başlık
   - Yapı kodu (Y1–Y9)
   - 3–4 karelik sahne akışı (açılış → gelişme → kırılma → son)
   - Görsel istem iskeleti (İngilizce)
   - Açıklama cümlesi ve etiketler
   - Telif kontrolü notu
4. **Puanla (1–5):**
   - Kırılma anı var mı?
   - Kayıt ettirir mi?
   - Üretim kolay mı?
   - Telif riski yok mu?
   - Seri olabilir mi?
5. **Seç:** En yüksek puanlı 3 fikri haftalık plana yerleştir.

### Görsel istem iskeletleri
- **Y1/Y2 yağlıboya:**
  `thick impasto oil painting, visible palette-knife strokes, [karakter] [eylem] at [mekân], soft pastel blue and cream palette, warm light, nostalgic, vertical 9:16`
- **Y2 kırılma karesi:**
  `same scene zoomed out, a giant paintbrush entering frame painting [öğe] onto the canvas, the character looking up at the brush, surprised/annoyed`
- **Y3 kil/3D:**
  `whimsical 3D clay character, [karakter tanımı], muted warm background, soft studio light, cute proportions, vertical 9:16`
- **Y4 metafor:**
  `minimal illustration, plain beige background, single character [sembolik eylem], lots of negative space, vertical 9:16`

---

## 6. Esinlenme ve telif kuralları (zorunlu)
- Başka hesabın videosunun sahnesi, karakteri, açıklaması veya müziği **birebir kopyalanmaz**. Sadece yapı ve formül alınır.
- Tanınmış karakterler (Disney, Sindirella vb.), filmler, afişler ve repliklerden uzak durulur.
- Tanınmış tablolar birebir kopyalanmaz. Sadece *tarzından* esinlenilir.
- Müzik telifsiz ya da kendi üretimimiz olur. Trend ses gerekiyorsa sadece platformun ticari kütüphanesinden alınır.
- Gerçek kişilerin yüzü kullanılmaz.

## 7. Yayın öncesi kontrol listesi
- [ ] 9:16 format, 15–35 sn, ilk saniyede güçlü bir kare
- [ ] Yapı kodu belli (Y1–Y9) ve haftalık karışıma uyuyor
- [ ] Kırılma anı var (Y2/Y3 için zorunlu)
- [ ] Telif kontrolü yapıldı
- [ ] AI etiketi açık
- [ ] Açıklama 1 cümle ve 1–2 etiketten oluşuyor

## 8. Eksikler / sonra eklenecekler
- Bu dosya şimdilik tek hesabın (SHOOF) verisine dayanıyor. Yeni bir hesap incelendiğinde Bölüm 2'ye o hesaptan örnekler ve yeni yapılar eklenecek.
- Kendi videolarımızın performans verisi geldikçe Bölüm 3 güncellenecek.
