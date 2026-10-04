# aesun

Aksaray Enerji GES ve madencilik izleme paneli (Otocoin v3).

## Kapsam

1. OSOS sayaç verisi: 6 abone (T1, T2, A3, YD, Anka, AE) ve EPDK 14531 mahsuplaşması
2. İnverter izleme: Huawei FusionSolar, Sungrow iSolarCloud ve Inavitas
3. Analiz ve rapor
4. Uyarılar (panel ve WhatsApp)
5. Madencilik cihazlarının izlenmesi ve yönetimi
6. Mining gelir dağılımı

## Aboneler

| Kod | Ad | Tesisat | Çarpan | Mahsup | İnverter |
|---|---|---|---|---|---|
| T1 | Tekyıldız 1 | 11116344 | 1890 | Dahil | FusionSolar |
| T2 | Tekyıldız 2 | 11116968 | 1890 | Dahil | FusionSolar |
| A3 | Aksaray 3 | 11200108 | 3150 | Dahil | — |
| YD | Yılmaz Darılmaz | 11201655 | 1260 | Sadece izleme | Sungrow: Darilmaz Ges (5064453) |
| Anka | Anka Mineral | 11111411 | 6300 | Sadece izleme | Sungrow: HG YATIRIM AŞ / Halil Gökçe (5038906) |
| AE | Aksaray Enerji | 80010874 | 1575 | Sadece izleme | Inavitas: Aksaray_GES (189) |

## Veri kaynağı

Veriler şimdilik mevcut `ekinciomer-ai/epias-ptf` reposundaki JSON dosyalarından okunur
(`2026_osos_endeks.json`, `antminer_panel.json`, `fusion_data.json`, `arsiv_f2pool_*.json`, `aylik_ptf.json`).
Eski panel (`ofis_panel.py`) geçiş tamamlanana kadar çalışmaya devam eder.

## Sungrow toplayıcı

`toplayicilar/sungrow_collector.py`, iSolarCloud OpenAPI'den (EU gateway) santral ve inverter verisini
her 5 dakikada bir SQLite'a yazar. Ayarlar için `.env.example` dosyasını `.env` olarak kopyalayıp doldur
(`.env` repoya gönderilmez).

```
pip install -r requirements.txt
python toplayicilar/sungrow_collector.py --list   # erişilen santraller
python toplayicilar/sungrow_collector.py --once   # tek tur topla
python toplayicilar/sungrow_collector.py          # sürekli
```

## Inavitas bağlayıcı

`toplayicilar/inavitas.py`, insos.inavitas.io'dan AKSARAY firmasının santral özetini, saatlik üretimini ve
inverter tablosunu çeker. `.env` (veya `env.txt`) içinde `INAVITAS_USER` ve `INAVITAS_PASS` gerekir.

```
python toplayicilar/inavitas.py              # bugünün özeti (JSON)
python toplayicilar/inavitas.py 2026-10-03   # belirli gün
```

## Durum

- `aesun/mahsup.py`: Eski paneldeki mahsup hesabının Python karşılığı. Eski panelle aynı sonucu veriyor.
- `aesun/aboneler.py`: Abone kayıtları.
- `tasarim/genel-bakis.dc.html`: Ana sayfa taslağı (onay bekliyor).
