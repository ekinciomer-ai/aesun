# Kozmos Lab · Merak Lab (otomatik Shorts hattı)

Format: chionglab tarzı "soru → 3D mekanizma → adım adım hesap → net cevap → yorum çağrısı". Türkçe, ~60 sn, dikey 1080×1920, 30 fps.
Kanal: Kozmos Lab TR (`KZ_TR`). Seri: **Merak Lab**. Kod: `KZ_MRK_<NN>_<KISA_AD>`.

## Akış (bilgisayar gerekmez)
1. Senaryo JSON'u `video/merak/kuyruk/` klasörüne push edilir.
2. `.github/workflows/merak_uret.yml` kendiliğinden çalışır: sunucuda Gemini seslendirme (onaylı ses kütüphanesi `sunucu/tts/kutuphane`, ses `charon`) → kurgu → 3D kare kare render (three.js, headless Chrome) → kodla ses tasarımı → mp4.
3. Video sunucuya (`/opt/aesun/video_bekleyen/`) ve `video-onizleme` dalına gider, Yükleme Yöneticisi'ne kart teslim edilir (`sunucu/havuz/teslim/`).
4. **Ömer onaylamadan hiçbir şey yayınlanmaz.** Plan ve yayın saati Yükleme Yöneticisi'nde.
5. Günlük zamanlanmış görev her gün 2 yeni senaryo yazar (konu bankasından), kuyruğa koyar.

## Ses
- gTTS ve edge-tts **kullanılmaz** (Ömer 17.11.2026: gerçekçi değil). Ses yalnız onaylı kütüphaneden (Gemini: puck = canlı Shorts anlatıcısı, charon = tok, kore = kadın). **Ömer 22.11.2026: ses Charon (tok erkek anlatıcı); bütün bölüm tek ses, tek model (Gemini TTS), araya farklı ses girmez.** Senaryoda `"ses":"charon"`. Video başına **tek** Gemini isteği: `canli` yönergesi cümleden cümleye ton değiştirir (soruda merak, sayıda vurgu, karşılaştırmada oyunbaz, kapanışta sıcak); ses sonra faster-whisper ile parçalara bölünür. Neden: ücretsiz anahtar günde ~10 istek veriyor; parça başına istek günde 1 video demek. Anahtar: kasa `gemini_api_anahtar_kozmos` (yoksa ortak anahtar).

## Senaryo kuralları
- 8–10 parça, toplam ~140–160 kelime (≈ 55–65 sn). Parça başına 1–2 cümle.
- Parça 1: kanca soru (merak boşluğu) + "tahminini aklında tut" / "cevap: hemen değil" gibi bekletme.
- Ortada: her parçada **tek** sayı/işlem; sayılar ekranda (`ekran`), sayılar metinde yazıyla okunur.
- Son parça: cevabı tekrar göster + "Yorumlara yaz" (yorum = algoritma sinyali).
- Bilgi %100 doğrulanmış olmalı; `kaynaklar` alanı zorunlu, güvenilir kaynak (NASA, ESA, bakanlık, hakemli makale, üretici veri sayfası). Tartışmalı rakamda temkinli ifade ("yaklaşık", "altına").
- Metin TTS için yazılır: kısaltma yok, sayılar yazıyla ("yüz elli milyon"), `°C`/`km` gibi birimler yazıyla.
- **Hayatın içinden örnek zorunlu:** her büyük sayının yanına gündelik bir karşılaştırma (ör. 8 dk = bir çay demi, −18 °C = derin dondurucu, 19 Wh = su ısıtıcısında 35 sn, 150 milyon km = 330 bin kez İstanbul–Ankara). Karşılaştırma da doğrulanır ve kaynaklara yazılır; ekranda `etiket` olarak gösterilir.
- Sağlık tavsiyesi, siyaset, marka/logo, telifli karakter yok.

## JSON biçimi
```json
{"kod":"KZ_MRK_03_AY","no":"MERAK #03","tema":"acik","soru":{"ust":"MERAK LAB","t":"AY'A ARABAYLA<br><i>KAÇ GÜNDE?</i>"},
 "ses_modu":"uzay",          // uzay | enerji (atmosfer akoru)
 "parcalar":[{"id":"s01","sahne":"gunes","p":{"mod":"son"},"metin":"...","ekran":[]},
   {"id":"s02","sahne":"isik","p":{"mod":"mesafe","kart":52},"metin":"...",
    "ekran":[{"tip":"sayi","ust":"ETİKET","say":384400,"dec":0,"on":"≈ ","ek":"km","k":"üç"},
             {"tip":"formul","y":"384.400 <em>÷</em> 100","k":"böl"},
             {"tip":"etiket","y":"≈ 160 gün","k":"yüz"}]}],
 "yayin":{"baslik":"... #shorts","aciklama":"... kaynaklar ... #kozmoslab","etiketler":["..."]},
 "kaynaklar":["..."]}
```
- `k`: ekrandaki öğe bu kelime söylendiğinde çıkar (kelimenin başı). `say`: sayaç animasyonu; `den`: başlangıç (ör. 15 → −18); `sure`: sayma süresi; `soguk`: mavi.
- `p.kart`: kartın dikey yeri (% ekran, varsayılan 57). Ardışık aynı sahneli parçalar tek 3D blok olur (kamera akar).

## Sahne kütüphanesi (`sahneler.js`)
| sahne | p | ne gösterir |
|---|---|---|
| `gunes` | `mod: son` (an: sönme anı 0–1) / `halka` (tutulma halkası, kapanış) | Güneş yakın plan |
| `isik` | `mod: hiz / mesafe / sure / son` | Güneş→Dünya ışık yolu, ölçü çizgisi, sayaç, son ışık kabuğu |
| `yorunge` | (2 parça: dönüş + teğetten kaçış) | Yörünge, kütleçekim dalgası, hız oku |
| `jupiter` | — | Güneş→Jüpiter→Dünya ışık yolu |
| `donma` | — | Dünya buz tutar |
| `panel` | `mod: soru / olcu / isin`, `son:true` (kapanış) | Güneş paneli, ölçüler, ışın → %21 elektrik / %79 ısı |
| `gun` | — | 1 m² üzerine gün boyu güneş, enerji sütunu |
| `enerji` | — | Batarya dolar, kayıplar kopar |
| `telefon` | — | Telefon %0 → %100 |
| `izgara` | — | 85 telefon ızgarası (ekran[1] anında dolar) |
| `santral` | — | 1 MW GES sahası uçuş |
| `ay` | `mod: soru / mesafe / hiz / saat / takvim / uyku / roket / isik / son` | Dünya→Ay yolu, araba (saat/gün/ay sayacı), roket, ışık, Ay'a park |
| `iss` | `mod: soru / irtifa / hiz / harita (gec:true geçiş) / tur / gun / son` | Uzay İstasyonu: 400 km ölçü, hız izi + uçak, Türkiye şeridi geçiş sayacı, 90 dk tur, 16 gün doğumu |
| `ev` | `mod: soru / kwh / test / km / yuru / benzin / son` | Elektrikli araba: 1 kWh pil, 100 km test sayacı, 5 km yol (üstten), yürüyen insan, elektrik/benzin enerji çubukları |
| `turbin` | `mod: soru / olcu / tur / uc / enerji / telefon / son` | 5 MW rüzgâr türbini (12,1 dev/dk), çap ölçüsü, tur yayı, uç izi, batarya, 300 telefon duvarı |
| `donus` | `mod: soru / cevre / hiz / enlem / sonuc / ses / hisset / gun (yeni:true) / son` | Dönen Dünya durur, ekvator çemberi, İstanbul (41°) işareti, doğuya hız okları (ekvator/İstanbul/ses), dönmeyen Dünya çevresinde Güneş (gün=yıl) |
| `mars` | `mod: soru / gun / fark / uzak / yil / iki / sol / yas / son` | Mars yakın plan; Dünya–Mars yan yana dönüş (24 sa / 24 sa 37 dk, hafta sayacı); üstten yörüngeler (1× / 1,5× ölçü, gün/tur/sol sayacı); yaş karşılaştırması |
| `toz` | `mod: soru / uret / toz / isin / takvim / telefon / yil / robot / son` | Panel + kirlenme örtüsü, tozda duran ışınlar, 365 günlük takvim (11–18 gün gri), yan telefonlar, temizlik robotu |
| `ucak` | `mod: soru / mesafe / hiz / saat / gun / yil / hava / parker / hizli / son` | Güneş↑–Dünya↓ yolu, 150 milyon km ölçü, yolcu uçağı (saat/gün/yıl sayacı), atmosfer halkası + düşen uçak, Parker sondası (iz, gün sayacı) |
| `trafo` | `mod: soru / frekans / cekirdek / uzama / olcu / iki / hesap / nota / abd / son` | Lamine demir çekirdek + bakır bobinler, ses halkaları (100/120 Hz), yan alanda akım/boy grafiği (sin → sin²), saç teli vs 1 µm, piyano (sol tuşu) |
| `kilit` | `mod: soru / tur / eksen / masa / siskin / fren / kilit / yuzde / son` | Dünya çevresinde Ay (Dünya'ya bakan kırmızı yüz işareti), tur çizgisi + gün sayacı, eksen + dönüş oku, 3 hayalet konum (masa deneyi), gelgit şişkinliği, fren (hızlı dönüş yavaşlar), yalpalama + 10 dilimlik pizza (%59) |
| `baraj` | `mod: soru / turbin / yukseklik / debi / ton / havuz / sekiz / son` | Baraj kesiti (rezervuar, cebri boru, Francis çarkı, su akışı), 151 m ölçü + 45 katlı bina, 8 ünite sırası, 241 küp ızgarası, boşalan olimpik havuz (sn sayacı) |
| `boyut` | `mod: soru / cap / dizi / top / kup / hesap / gun / kutle / son` | Jüpiter + Dünya, 11× çap ölçüsü, 11 Dünya dizisi, golf topu→47 cm + 2 basketbol topu, 11×11×11 küp, hayalet Jüpiter içinde 1.321 küre (sayaç/yıl), terazi (318 Dünya) |
| `kablo` | `mod: soru / tel / direnc / akim / formul / bir / iki / seksen / son` | Uzatma + çoklu priz + 2 ısıtıcı, büyütülmüş kablo kesiti (gidiş/dönüş damarı, elektron akışı), ısınan bakır + ısı dalgaları, W ısı sütunu, 60 W akkor ampul |
| `yildiz` | `mod: soru / hiz / yil / mesafe / lise / voyager / sure / gobekli / son` | Güneş↓–Proxima↑ yolu, ışık atımı (yıl sayacı), ışık yılı çentikleri + lise sınıfları, Dünya çevresinde 7,5 tur, Voyager sondası (yıl sayacı), Göbeklitepe T dikili taşı vs yolculuk sütunu |
| `sicak` | `mod: soru / stc / katsayi / yaz / kayip / kis / neden / gun / son` | Eğik panel, termometre (°C), güç/voltaj sütunu (%), sıcakta ısı dalgası + turuncu örtü, kışta kar, yaz/kış güneş yayları |
| `saturn` | `mod: soru / hacim / kutle / yogun / su / buz / bat / gaz / son` | Halkalı Satürn + okyanus yüzeyi, hayalet içinde 766 küre (95'i turuncu), su tankında 1 cm³ küpler (buz %90, Satürn %69 batar), Satürn'ün %70 batışı + buzdağı |
| `maden` | `mod: soru / guc / saat / gun / araba / camasir / telefon / yil / son` | Madencilik cihazı (fanlar), W sayacı, 2 su ısıtıcısı, 24 saat kadranı, kWh sütunu, İstanbul→Ankara yolu + araba, 84 çamaşır makinesi, 3.650 telefon, 365 gün takvimi |
| `zipla` | `mod: soru / cekim / tarti / dunya / hesap / pota / sure / giysi / son` | Ay yüzeyi (kraterler, gökte Dünya), zıplayan kişi + gölge, m cetveli ve anlık yükseklik, Dünya/Ay çekim okları (9,8 / 1,62), tartı (80→13 kg) + damacana, basketbol potası (3,05 m), havada kalma sayacı, astronot giysisi (84 kg) |
| `alan` | `mod: soru / tuketim / isin / verim / kayip / hesap / istanbul / turkiye / gece / son` | Şematik Türkiye haritası (1 birim = 111 km), Konya civarında ölçekli GES karesi (1.316 km²) + kırmızı halka, İstanbul ili karesi (5.712 km², 4 çeyrek), 365 günlük takvim, 1 m² panel + Güneş ışınları + kWh sütunları (%23 elektrik / %77 ısı, %20 kayıp), Ay + batarya |
| `pedal` | `mod: soru / guc / eski / sure / mac / led / ledsure / sarki / son` | Jeneratörlü bisiklet + pedal çeviren kişi, kablo, ampul (akkor/LED), 60 dk saat kadranı (dolum, ilk yarı 45 dk çentiği) |
| `notron` | `mod: soru / kutle / cap / sikis / atom / kup / dag / insan / donus / son` | Nötron yıldızı (meridyenler, pulsar ışınları), terazi (Güneş vs mini yıldız; şeker küpü vs dağ / insan kalabalığı), 20 km ölçü + şehir silueti, küçülen Güneş, atom vs nötron yığını, şeker küpü + ton sayacı |
| `kaynat` | `mod: soru / isi / fark / hesap / wh / telefon / sure / kayip / ipucu / son` | Cam su ısıtıcısı (su seviyesi, kabarcık, buhar), termometre (°C), Wh sütunu, ısı kaybı dalgaları, 5 telefon (sırayla dolar), 4 dk'lık kronometre (178 sn) |
| `kacis` | `mod: soru / dunya / gunes / sikis / misket / isik / ufuk / kat / son` | Kara delik (birikim diski, kesik olay ufku çemberi, düşen/kaçan ışık parçacıkları), Dünya'dan ve Güneş'ten kaçan roket (iz + km/s sayacı), küçülen Güneş (yarıçap sayacı 695.700→3 km), misket kadar Dünya, Dünya çevresinde ışık turu (tur sayacı), 11,2 vs 299.792 km/s sütunları |
| `buzdolabi` | `mod: soru / etiket / yil / gun / telefon / guc / motor / eski / kaynat / son` | Buzdolabı (kapakta A–G enerji etiketi, yan motor + titreşim), kWh sütunları (2020: 181 / 1990: 477), günlük dilim (0,5 kWh), 26 telefon ızgarası, LED ampuller (≈ 21 W), motor aç-kapa grafiği, 5 su ısıtıcısı |

Konu kütüphanedeki sahnelerle anlatılamıyorsa: `sahneler.js`'e yeni sahne eklenir (aynı arayüz: `S.ad=()=>({sc,c,bl,kur(o)})`, `kur` yalnız `o`'ya bakar). Yardımcılar `motor.js` (`M.*`): gunes, dunya, jupiter, panel, telefon, olcu, yazi, dyazi, cizgi, pts, uzay, izgara…
Yerel deneme: `python3 arac/uret.py kuyruk/X.json --sahte-ses --adim ses,kurgu,goruntu --kareler 60,300,900` → `arac/sayfa.py` ile kontrol sayfası.

## Görsel kurallar
- **Tema: açık** (Ömer 17.11.2026): chionglab gibi kâğıt beyazı zemin, ince koyu kontur, düz renkler, bloom yok. `tema` alanı yoksa açık kabul edilir (`"koyu"` yalnız istenirse).
- Ana nesne ekranın %20–55 bandında (üstte soru başlığı, %57'de hesap kartı, %73'te altyazı, alt %18 platform arayüzü).
- Koyu temada: ACES + bloom; Güneş beyaza patlamasın. Altyazı kelime kelime, sarı vurgu.
- Ses: atmosfer akoru konuşma altında −9 dB kısılır; geçişte yumuşak ton süzülmesi + darbe, sayıda tık + çan. Müzik sesi bastırmaz.
- **Gürültü (fış/hışırtı) efekti yok** (Ömer 23.11.2026: "fış" sesi itici): whoosh, rüzgâr ve tık hışırtısı kaldırıldı; efektler yalnız tonal.

## Durum
- Bölüm 1 (Güneş yok olsa) ve 2 (Tek panel kaç telefon) — 17.11.2026, ilk üretim.
- Bölüm 3 (Ay'a arabayla) ve 4 (Türbinin tek turu) — 18.11.2026, günlük görev.
- Bölüm 5 (Uzay İstasyonu) ve 6 (Elektrikli araba 1 kWh) — 18.11.2026.
- Bölüm 7 (Dünya dursa kaç km/sa) ve 8 (Ampul için kaç dakika pedal) — 19.11.2026, günlük görev; yeni sahneler `donus`, `pedal`.
- Bölüm 9 (Mars'ta gün/yıl) ve 10 (Panel tozlanınca kayıp) — 20.11.2026, günlük görev; yeni sahneler `mars`, `toz`.
- Bölüm 11 (Güneş'e uçakla) ve 12 (Trafo neden uğuldar) — 21.11.2026, günlük görev; yeni sahneler `ucak`, `trafo` (kamera parçalar arasında önceki pozdan akar).
- Bölüm 13 (Ay neden hep aynı yüz) ve 14 (Baraj türbininden saniyede kaç ton) — 22.11.2026, günlük görev; yeni sahneler `kilit`, `baraj` (kamera pozları parametreyle akar: hedef, uzaklık, açı).
- Bölüm 15 (Jüpiter'e kaç Dünya sığar) ve 16 (Akım 2 kat → ısı 4 kat, I²R) — 23.11.2026, günlük görev; yeni sahneler `boyut`, `kablo`.
- Bölüm 17 (Işık hızıyla Proxima'ya) ve 18 (Panel sıcakta mı soğukta mı) — 23.11.2026, Ömer isteğiyle ek üretim; yeni sahneler `yildiz`, `sicak`.
- Bölüm 19 (Satürn suda yüzer mi) ve 20 (Bitcoin cihazı günde kaç kWh) — 23.11.2026, Ömer isteğiyle ek üretim; yeni sahneler `saturn`, `maden`.
- Bölüm 21 (Ay'da zıplasan kaç metre) ve 22 (Türkiye'nin elektriği için kaç km² panel) — 24.11.2026, günlük görev; yeni sahneler `zipla`, `alan`.
- Bölüm 23 (Nötron yıldızından şeker küpü kaç ton) ve 24 (1 litre su kaynatmak kaç telefon) — 25.11.2026, günlük görev; yeni sahneler `notron`, `kaynat`.
- Bölüm 25 (Kara delikten kaçış hızı) ve 26 (Buzdolabı günde kaç kWh) — 26.11.2026, günlük görev; yeni sahneler `kacis`, `buzdolabi`.
- Düzeltme 18.11: parçalar arası 0,22 sn boşlukta sahne son parçanın moduna sıçrıyordu (kısa titreme); artık önceki parçada kalır (`calistir.js`). #01–#04 bu hatayla üretildi.
- TikTok/Reels: Kozmos Lab hesapları sunucu oturumuna bağlanınca kartlara `tiktok`/`instagram` eklenecek (şu an yalnız YouTube Shorts).
