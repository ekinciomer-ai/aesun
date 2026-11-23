# Efrâsiyâb'ın Hikâyeleri: Ölüm'le Okey Masasına Oturan Kabadayı (yumurta kafa stili)

Onaylı senaryo: `icerik/senaryolar/efrasiyab_okey_yumurta.md` (Ömer 23.11.2026'da onayladı; açık gündüz teması, göz almayan mat ışık).

## Ne var
| Dosya | Ne |
|---|---|
| `story.js` | 3 set (aydınlık gündüz kahvehanesi, pastel taş sokak/kapı, yakın masa), yumuşak göz almayan ışık (`bloom 0.16-0.18`), 4 karakter (`abdurrahman`, `azrail`, `kankardes`, `kahveci`). Zamanlama parçalara bağlı (`P01-P10`). |
| `metin_tr.json` | Türkçe seslendirme parçaları ve boşluk süreleri |
| `mix.py` | Özgün kahvehane noir (Re Hicaz) müzik + okey taşı, darbe, fısıltı, yağmur efektleri (kodla, telifsiz) |
| `efrasiyab_okey_karakter_sayfasi.png` | Onaylı tam boy karakter sayfası (4 karakter x 11 ifade) |

## Ses
- İş dosyası: `sunucu/tts_kuyruk/EFRASIYAB_OKEY_TR.json` (Gemini günlük kotası dolu olduğu için sunucu tek ses kuralıyla 10/10 parçayı baştan Google Cloud `tr-TR` tek sesle okudu).

## Final ölçümü (1080x1920, 30 fps, 52,00 sn, 21,12 MB)
- Boş kare: `0` · Ortalama kontrast: `0,679` · Sıcak pay: `%36,0` · Sabit kamera: `%0,0`
- Ses: `-14,4 LUFS`, True Peak `-2,7 dBFS` (`256k AAC`)
- Render: 15 paralel sunucu parçası (`.github/workflows/yumurta_render.yml`, `scale=0.75` -> `lanczos 1080x1920`, `-crf 17`).

## Açıklama notu
"kodla üretilmiş animasyon; yapay zekâ seslendirme"
