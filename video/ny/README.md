# Nasıl Yapıldı · otomatik 3D kısa video hattı

Kanal: **Nasıl Yapıldı** (@nasilyapildiogren) · havuz kodu `NY` · format 9:16, ~60 sn, Türkçe, altyazılı.
Tek dosya YouTube Shorts + Instagram Reels + TikTok'a uyar. Her parti **3 video**.

## Akış (hepsi GitHub üzerinde, ücretsiz; bilgisayar ve sunucu gerekmez)
1. **Metin** → `kuyruk/<KOD>.json` (parça parça seslendirme metni; sayılar yazıyla).
   Push edilince `ny_gtts.yml` Google TTS (gTTS) ile `ses/<KOD>/sNN.mp3` üretir.
2. **Konu kartı** → `konular/<KOD>.json` (öğeler, değerler, renkler, sahne sırası, kaynaklar).
3. **İstek** → `istek/<KOD>.json` `{"kod": "...", "mod": "onizleme" | "final"}`.
   `ny_render.yml`: hazırla (anlatım hızlandırma + kodla ses tasarımı + kurgu) → 3D kare kare paralel render → birleştir.
   Çıktı: `cikti/onizleme/<KOD>.mp4` (540×960) ya da `cikti/final/<KOD>.mp4` (1080×1920).
   TTS bitince render kendiliğinden yeniden dener (sesi gelmemiş istek beklemede kalır).
4. Ömer önizlemeyi onaylar → `final` isteği → Yükleme Yöneticisi havuzuna teslim (`kanal: NY`).
   Yayın planını yönetici yapar, Ömer tek tıkla onaylar. Görmediği video yayınlanmaz.

## Motor
- `motor/sahne.html` — three.js 3D sahne: gerçek yükselti (AWS Terrain Tiles / SRTM, `dem.png`),
  Türkiye maskesi ve parlak sınır, Natural Earth nehir/göl verisi (kamu malı).
- Öğe tipleri: `nehir` (parlayan çizim + akış parçacıkları), `dag` (ışık sütunu, volkan etiketi),
  `gol` (dolma animasyonu). Yeni tip eklenirse buraya yaz.
- Sahne türleri (`parcalar[].sahne`): `kanca` (merak sorusu, büyük sayı + damga), `soru` (?),
  `sira` (#N kart + sayaç), `bir_giris` (karartma + gerilim + 1 numaranın adı), `ek` (bilgi çipleri),
  `kapanis` (çubuk grafik + yorum çağrısı).
- Altyazı: kelime kelime sarı vurgulu, sayılar rakam + birim (2.800 KM). Platform arayüzüne denk gelmeyen bantta.
- Ses tasarımı tamamen kodla sentez (telifsiz): müzik yatağı (Am-F-C-G, 100 bpm, anlatımda kısılır),
  atmosfer (nehir/göl: su, dağ: rüzgâr), whoosh geçişleri, sayaç tıkları, damga vuruşu, #1 öncesi yükselen + patlama, çip zilleri.
- Font: Montserrat (OFL).

## Yerelde deneme
`python3 arac/uret.py <KOD> onizleme` (yavaş; asıl üretim GitHub'da).
Kare kontrolü: `NY_ANLAR="1.5,12,30" node arac/kayit.js motor is/<KOD>/kurgu.json /tmp/kare 540 30 0 0 900`

## İçerik kuralları
- Kanca merak uyandırır, cevap sona saklanır ("Fırat 2.800 km ama en uzun değil. Neden?").
- Verilerin en az %90'ı kaynaklı; kaynaklar `konular/<KOD>.json → kaynaklar`.
- Çelişkili kaynaklı değer kullanma (ör. Büyük Menderes uzunluğu 307/548/584) — listeden çıkar.
- Sağlık tavsiyesi, şiddet, telifli görsel/müzik yok. Kapanışta tek yorum sorusu.
- Sıradaki konular: `KONU_HAVUZU.md`.
