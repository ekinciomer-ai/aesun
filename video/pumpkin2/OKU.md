# Pumpkin 2: İstanbul'da Kaybolan Aslan (yumurta kafa stili)

Senaryo taslağı: `icerik/senaryolar/pumpkin_2_kaybolan_aslan.md` (Masal Bebek 3B için yazılmıştı). Ömer 23.11.2026'da
yumurta kafa stilini seçti; uyarlanmış metin: `icerik/senaryolar/pumpkin_2_kaybolan_aslan_yumurta.md`.

## Ne var
| Dosya | Ne |
|---|---|
| `story.js` | Sahneler, kamera, ışık, karakterler (Türkçe). Zamanlar kelimeye değil ses PARÇASINA bağlı (P01–P10), bu yüzden aynı dosya İngilizce seste de çalışır |
| `en/story.js` | İngilizce: sahneleri Türkçe dosyadan alır, yalnız sesi ve adı farklı |
| `metin_tr.json`, `en/metin_en.json` | Seslendirme parçaları ve parçadan sonraki sessizlikler |
| `mix.py` | Özgün müzik (Re majör pentatonik, 96 bpm, kalimba + pizzikato bas) ve efektler, kodla; telif yok |
| `motor/parcalar.py` | Ses parçalarını tek dosyaya dizer, kelime saatlerini ve ağız zarfını çıkarır |
| `motor/toon_pumpkin.patch` | Karakter çizimine eklenenler: uzun saç, etek, bot, yanak, aslan yelesi/kulak/burun, kuyruk, fular, simit, `drop` (kısa bacak) |
| `motor/faces_full.patch` | Karakter sayfasına tam boy (ayaklar dahil) görünüm |
| `pumpkin_limon_karakter_sayfasi.png` | Onaylanan karakter sayfası |

## Ses
- Gemini TTS, ses **Kore**, tek model **gemini-2.5-flash-preview-tts** (`model_kilit`). İş dosyaları:
  `sunucu/tts_kuyruk/tamam/PUMPKIN2_TR_B.json`, `PUMPKIN2_EN_B.json`; çıktılar `sunucu/tts_kuyruk/cikti/PUMPKIN2_*_B__P01..P10.mp3`.
- 23.11.2026: gemini-3.1-flash-tts-preview'ün günlük kotası dolduğu için bütün metin 2.5 flash ile baştan okutuldu
  (videoda iki farklı ses karışmasın diye).

## Nasıl üretilir (sunucuda)
Motor: GitHub `kodlaciz/yumurta-stili` (MIT). Tampon bölgeye klonlanır, `motor/*.patch` uygulanır, bu klasör
`stories/pumpkin-aslan/` (İngilizce: `stories/pumpkin-aslan-en/`) olarak kopyalanır.
```bash
cd engine && npm install && git apply ../video_pumpkin2/motor/toon_pumpkin.patch   # (yol örnektir)
python3 -I parcalar.py <mp3_klasörü> PUMPKIN2_TR_B metin_tr.json ../stories/pumpkin-aslan
node render.mjs pumpkin-aslan --cues && python3 -I ../stories/pumpkin-aslan/mix.py ../stories/pumpkin-aslan
node render.mjs pumpkin-aslan --scale=0.75          # ekran kartsız sunucuda yavaş: 38 sn video ≈ 1,5 saat
```
Sonra 1080×1920'ye büyütülür (lanczos). Kontrol: `yumurta-stili-analiz` skill'i (boş kare 0, her planda kontrast ≥ 0,57,
-14 LUFS, TP ≤ -2,3).

## Taslak ölçümü (yarım çözünürlük, Türkçe)
Boş kare 0 · kontrast plan başına 0,73–0,89 · sabit kamera %2,6 · itme %0,27/kare · 6 whip · sert kesme 0 ·
-14,0 LUFS, tepe -2,7 dB.
