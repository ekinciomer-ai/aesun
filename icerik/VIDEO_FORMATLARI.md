# Video formatları kataloğu (Antik Stüdyo ve diğer kanallar)

**Kalıcı kural (Ömer, 12 Kas 2026):** "Video içerik hazırla" dendiğinde önce bu listedeki tüm formatlar gösterilir; Ömer seçer, üretim ondan sonra başlar.
Her format: ne olduğu · örnek · araç · maliyet · süre. Yeni format eklendikçe bu dosyaya yazılır.

| # | Format | Nasıl görünür | Örnek | Araç | Maliyet |
|---|---|---|---|---|---|
| 1 | **2D vektör çizgi film** ("Cevahir tarzı") | Kalın mürekkep çizgi, parşömen renkler, sade sarıklı karakterler; ekranda sayaç, bilgi paneli, el yazısı altyazı. Karakterler kodla çizilip canlandırılır. | Cevahir Minaresi Short'u (5.180 izlenme, kanalın 1 numarası); Gece Sakız 2D (`video/gece_sakiz_2d`) | Kodla çizim (`sahne.html`) + sunucu kaydı | **Ücretsiz** |
| 2 | **Fotogerçekçi sinematik** ("Celtic konsepti") | YZ ile üretilmiş gerçekçi sahneler, 3–4 sn kesim, yavaş yakınlaşma, beyaz-sarı kalın başlık, açık tema | Beşiktaş–Celtic Short'u; Gece Yapma Denen 4 Şey (`icerik/gece`) | Topview görsel + `karma_gece.py` | ~0,2 kredi/görsel |
| 3 | **Gerçek görüntülü belgesel** | Gerçek drone/stok klipler, uydu haritası, klon ses | Tuna Nehri videoları | Pixabay klipleri + uydu (`gercek-goruntulu-belgesel`) | Ücretsiz |
| 4 | **Gündem + tarih illüstrasyon** | Uydu harita açılışı + animasyonlu illüstrasyon, hayat hikâyesi anlatımı | Boğazkesen, Don–Volga Short'ları | `gundem-tarih-video` | Düşük |
| 5 | **3D sahne / nasıl yapıldı** | Kodla kurulan 3D sahne, kamera turu, parça parça montaj | Kumdan panele (`video/kumdan`), atom, rüzgâr türbini | Three.js sahne + `video_render` | Ücretsiz |
| 6 | **Canlanan tablo** (yağlıboya) | Yağlıboya/masal görseli 15–35 sn'de canlanır | Tablo serisi | `yagliboya-ai-kisa-video` | Düşük |
| 7 | **Karanlık doğa / ambiyans** | Puslu orman, yağmur, ay ışığı; uzun müzik/ambiyans | Kozmos Lab, Akşam | `aksam` | Ücretsiz |
| 8 | **Söz kartı** (tek fotoğraf) | Tarihî kişinin sözü, 4:5 ve 9:16 | Lao Tzu kartı | `antik-studyo-icerik` | Düşük |
| 9 | **Kâğıt eskiz hikâye** ("Onun Hikâyesi" tarzı) | Krem kâğıt zemin, alt kenarı yırtık kâğıt; elle çizilmiş sade ikonlar (dükkân, kişi, ürün); sol üstte el yazısı tarih/yer etiketi ("1995 · İstanbul") + kırmızı alt satır; kırmızı keçeli kalemle daire, ok, üstünü çizme, "İLK" damgası; ortada kalın altyazı, anahtar kelime kırmızı. Marka/kişi hayat hikâyesi, 2–3 dk. | tiktok.com/@onun.hikayesi_/video/7706961895240125717 (BİM hikâyesi, 2:45) | Kodla çizim + sunucu kaydı (format 1 ile aynı hat) | **Ücretsiz** |
| 10 | **POV hayatta kalma çizgi filmi** ("Gün Gün Hayatta Kal" tarzı) | Koyu, sinematik 2D anime çizim; tek ana karakter (kırmızı atkılı genç) her sahnede; "sen" diliyle anlatım ("aşağı iniyorsun"); üstte büyük sayaç ("GÜN 180", "10 DAKİKA"); ekran ortasında 1–2 kelimelik dev beyaz altyazı, anahtar kelime sarı; görseller hafif hareketli. ~1 dk, devamı YouTube'da. 13,9 bin beğeni · 120 yorum · 485 paylaşım. TikTok'ta "YZ ile üretildi" etiketli. | tiktok.com/@gungunhayattakal/video/7699518032691121429 (Sığınak, 1:05) | YZ görsel + kamera hareketi (`karma_gece.py`); karakter tutarlılığı için karakter kartı | Görsel başı düşük kredi (ücretsiz yol: kodla çizim, daha sade) |
| 11 | **Fotoya 2D Karikatür Ekleme** (çizgi karakter × gerçek dünya, skill: `fotoya-2d-karikatur-ekleme`) | Gerçek fotoğraf/çekim üstünde özgün çizgi karakter (Tutu: Frig külahlı, kırmızı tunikli çocuk); karakter gerçek nesneye dokununca nesne tepki verir: suya atlayınca sıçrama + halka halka dalga, sütuna dokununca toz, panele dokununca ışık. Üstte sonuç, altta "ORİJİNAL ÇEKİM" paneli (önce/sonra). 10–15 sn. Esin: storyboard.co.th, 252 kaydetme / 427 beğeni (kaydetme oranı %59). | Onaylı deneme: Tutu × Galata yağmur (araba su sıçratıyor, sonda orijinal fotoğraf, 10 sn) | Higgsfield: GPT Image 2.6 (gerçek foto + karakter + yağmur) → Seedance 2.5 (8 sn, 9:16) → ffmpeg ile sona orijinal kare. Kodla çizim yolu (`video/dokunma_efekti/motor.py`) kalitesiz bulundu, kullanılmaz. | ~56 kredi/video |
| 12 | **Merak Lab** (soru → 3D mekanizma → hesap → cevap; chionglab tarzı, otomatik) | Kanca soru, kodla 3D animasyon (three.js + bloom), ekranda adım adım hesap kartı ve sayaçlar, kelime kelime altyazı, kodla ses tasarımı (whoosh, vurgu, atmosfer). ~60 sn, Türkçe. Günde 2 senaryo otomatik yazılır, render sunucuda, havuza teslim. | tiktok.com/@chionglab · Kozmos Lab Merak #01 Güneş, #02 Panel | `video/merak` + `merak_uret.yml` (Google TTS) | **Ücretsiz** |

## Ses seçenekleri (formatla birlikte seçilir)
- **benim2** (Ömer'in klon sesi): ciddi/haber anlatımı. Not: 2D çizgi film anlatımına uymadığı söylendi (12 Kas 2026); çizgi film için daha sıcak, masalcı bir ses denenmeli.
- **Uğur**: Tablo serisi anlatıcısı.
- Yeni ses gerekiyorsa: ElevenLabs ses kütüphanesinden az kullanılan, formatın tonuna uyan ses (popüler hazır sesler kullanılmaz).

## Not
- TikTok videoları sunucudan otomatik indirilemiyor (bot koruması). İnceleme masaüstü uygulamasındaki tarayıcı panelinde yapılır (yalnız görüntüleme; ses duyulmaz).
