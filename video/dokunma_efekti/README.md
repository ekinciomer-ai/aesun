# Dokunma efekti (Format 11): Çizgi karakter × gerçek dünya

Kendi formatımız. Özgün karakter **Tutu** (Frig külahı, kırmızı tunik) gerçek bir fotoğrafta yürür, zıplar ve suya düşer. Gerçek görüntüdeki su halka halka dalgalanır.

Çalıştırma (sunucuda): `python3 motor.py arka_plan.jpg 0.72`
- `arka_plan.jpg`: bize ait gerçek fotoğraf (Ömer'in çekimi ya da telifsiz/kamu malı görsel)
- `0.72`: su yüzeyinin fotoğraftaki yüksekliği (0 en üst, 1 en alt)
- Arka plan verilmezse yer tutucu manzarayla çalışır.
Çıktı: `cikti/deneme.mp4` (1080x1920, 10 sn). Çalışma süresi yaklaşık 15 sn.

## Eksikler (yapıldıkça sil)
- Ses yok: su sıçrama efekti ve müzik eklenecek (telifsiz ya da kendi üretimimiz).
- Tutu'nun karakter kartı (önden, yandan, ifadeler) çıkarılacak.
- Yeni dokunma tepkileri eklenecek: toz (taş/sütun), ışık (GES paneli), sallanma (çan, salıncak).
- Gerçek fotoğraf denemesi: Ihlara/Melendiz çekimi bekleniyor.
