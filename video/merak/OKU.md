# Kozmos Lab · Merak Lab (otomatik Shorts hattı)

Format: chionglab tarzı "soru → 3D mekanizma → adım adım hesap → net cevap → yorum çağrısı". Türkçe, ~60 sn, dikey 1080×1920, 30 fps.
Kanal: Kozmos Lab TR (`KZ_TR`). Seri: **Merak Lab**. Kod: `KZ_MRK_<NN>_<KISA_AD>`.

## Akış (bilgisayar gerekmez)
1. Senaryo JSON'u `video/merak/kuyruk/` klasörüne push edilir.
2. `.github/workflows/merak_uret.yml` kendiliğinden çalışır: sunucuda Gemini seslendirme (onaylı ses kütüphanesi `sunucu/tts/kutuphane`, varsayılan `puck`) → kurgu → 3D kare kare render (three.js, headless Chrome) → kodla ses tasarımı → mp4.
3. Video sunucuya (`/opt/aesun/video_bekleyen/`) ve `video-onizleme` dalına gider, Yükleme Yöneticisi'ne kart teslim edilir (`sunucu/havuz/teslim/`).
4. **Ömer onaylamadan hiçbir şey yayınlanmaz.** Plan ve yayın saati Yükleme Yöneticisi'nde.
5. Günlük zamanlanmış görev her gün 2 yeni senaryo yazar (konu bankasından), kuyruğa koyar.

## Ses
- gTTS ve edge-tts **kullanılmaz** (Ömer 17.11.2026: gerçekçi değil). Ses yalnız onaylı kütüphaneden (Gemini: puck = canlı Shorts anlatıcısı, charon = tok, kore = kadın). Senaryoda `"ses":"puck"`, parçada isteğe bağlı `"ton"` (soru, heyecan, anlatici, gizem, vurgu...).

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

Konu kütüphanedeki sahnelerle anlatılamıyorsa: `sahneler.js`'e yeni sahne eklenir (aynı arayüz: `S.ad=()=>({sc,c,bl,kur(o)})`, `kur` yalnız `o`'ya bakar). Yardımcılar `motor.js` (`M.*`): gunes, dunya, jupiter, panel, telefon, olcu, yazi, dyazi, cizgi, pts, uzay, izgara…
Yerel deneme: `python3 arac/uret.py kuyruk/X.json --sahte-ses --adim ses,kurgu,goruntu --kareler 60,300,900` → `arac/sayfa.py` ile kontrol sayfası.

## Görsel kurallar
- **Tema: açık** (Ömer 17.11.2026): chionglab gibi kâğıt beyazı zemin, ince koyu kontur, düz renkler, bloom yok. `tema` alanı yoksa açık kabul edilir (`"koyu"` yalnız istenirse).
- Ana nesne ekranın %20–55 bandında (üstte soru başlığı, %57'de hesap kartı, %73'te altyazı, alt %18 platform arayüzü).
- Koyu temada: ACES + bloom; Güneş beyaza patlamasın. Altyazı kelime kelime, sarı vurgu.
- Ses: atmosfer akoru konuşma altında −9 dB kısılır; geçişte whoosh + darbe, sayıda tık + çan. Müzik sesi bastırmaz.

## Durum
- Bölüm 1 (Güneş yok olsa) ve 2 (Tek panel kaç telefon) — 17.11.2026, ilk üretim.
- TikTok/Reels: Kozmos Lab hesapları sunucu oturumuna bağlanınca kartlara `tiktok`/`instagram` eklenecek (şu an yalnız YouTube Shorts).
