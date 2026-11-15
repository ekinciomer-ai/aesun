# 80 Günde Evren Turu (Kozmos Lab TR/EN)

Hibrit üretim: gerçek NASA/ESA fotoğrafı + kodla çizilen mürettebat (Kaptan Derin, Ela, Tosun, Piksel) + HUD + altyazı.
Video modeli (Kling) kullanılmaz; maliyet neredeyse sıfır.

## Rota kuralı
Her bölüm sonunda 3 seçenek:
- **A** ve **B**: izleyiciye sunulan iki durak
- **C – Akışına bırak**: bizim ana rotamızdaki sıradaki durak (`rota.json → ana_rota`)

`oyla.py <gün>` yorumları (`docs/yayin/yayin.json`, TR+EN birlikte) sayar:
- Kişi başı 1 oy, son yazdığı geçerli. Yorum "A", "B" ya da "C" ile başlamalı.
- Toplam oy `esik_oy` (5) altındaysa ya da berabere ise → **C** (kendi rotamız).
- `--kaydet` ile sonuç `rota.json`'a işlenir.

## Dosyalar
- `rota.json` – ana rota, bölümler, seçenekler, sonuçlar
- `oyla.py` – oy sayımı
