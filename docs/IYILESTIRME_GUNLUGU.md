# AEMonitoring — iyileştirme günlüğü

Claude'un günde iki kez çalışan "AEMonitoring durum analizi ve iyileştirme" görevi bu dosyayı okur ve sonuna ekler.
Her çalıştırma: bulgular → yapılan düzeltmeler (commit) → kullanıcı onayı bekleyen öneriler → izlenecekler.

## Sabit kurallar (kullanıcı kararları — görev değiştirmez, yalnız önerir)
- Üretim ≥ filo yükü → tüm filo çalışır. Üretim < filo → fiyat > başabaş × (1 + tolerans) ise yalnız üretim kadar cihaz, değilse tüm filo (11 Eki).
- `basabas_tolerans` = 0,25: üretilen BTC'nin ileride daha yüksek fiyattan satılacağı beklentisi (11 Eki). Değiştirmek kullanıcı kararı.
- Kapanış sırası hashrate'i düşükten; açılış yüksekten (11 Eki).
- Güneş fazlası net satış değeri 2,25 ₺/kWh (2,90 − 0,65 SKB) (11 Eki).
- Firmware yükseltmesi yalnız `n8n/firmware_gorev.json` onaylı sırayla, tek tek; başarısızsa sıra durur.
- Güvenlik: n8n'de eski 5 iş akışını silme/değiştirme, yeni tablo oluşturma, şifre/token koda yazma, iş akışı yayınlama YOK. Şifre/token sohbete/koda/yedeğe yazılmaz. Parolasız sudo aranmaz.

## Kayıtlar
- 2026-10-11 — Görev kuruldu. Açık bulgular: Pi'nin başabaşı (≈2.220) gerçekleşen gelirden hesaplanandan (≈2.540) %13 düşük → hashprice/TH/kW varsayımı incelenecek. .100 ve .129 yanıt vermiyor. Firmware pilotu (.115) yükleme uç noktası keşfi bekliyor. Twilio sandbox katılımı düştü (WhatsApp mesajları gitmiyor) — kullanıcı "join" yazmalı / kendi numarası alınmalı.
- 2026-10-11 22:15 — Firmware pilotu hazır: uç /cgi-bin/upgrade.cgi (ayarları koru), alan "firmware", .bmu kapsayıcısından cihazın miner_type/subtype'ına uyan alt imaj gönderiliyor (1c683e8). .115 uykuya geçince (≈05:54) başlar. İzlenecek: n8n/firmware_pilot.json — sürüm değişti mi, hash > 250 TH/s, watt geliyor mu; sonucu kullanıcıya bildir, başarılıysa kalan S21e'leri sıraya eklemeyi ÖNER (ekleme kullanıcı onayıyla).
- 2026-10-11 23:45 — Firmware pilotu BAŞARILI: .115 FR-1.28→FR-1.42, 20 dk sonunda 310 TH/s, cihaz artık watt bildiriyor (5.294 W, 17,2 J/TH). Kullanıcının önceden verdiği "sorun olmazsa sırayla" onayıyla kalan 24 S21e Hyd sıraya alındı (görev s21e-fr142-sira-20261011, tek tek, çalışırken). İzlenecek: n8n/firmware_pilot.json (durdu/başarısız var mı), güncellenen cihazların 24 saatlik hash'i eski ortalamalarına (≈317–323 TH/s) göre düşük mü; watt verisi gelince güneş takibi sıralamasının verim (TH/kW) ile yapılmasını kullanıcıya öner (şu an kullanıcı kararı: hashrate).

## 2026-10-12 · Hız bekçisi
- Panel: tüm veri istekleri önbellekli (bellek + tarayıcı deposu). Sayfa geçişi önbellekten anında; süresi dolan dosya arkada tazelenir (canlı dosyalar ~1 dk, OSOS 5 dk, arşivler 10 dk–12 sa), değişirse sayfa sessizce yenilenir. Diğer sekmelerin verisi açılışta boşta önceden yüklenir.
- Ölçüm (ilk ziyaret, önbelleksiz → yeni): Madencilik 898 → 184 ms, Cihazlar 1742 → 81 ms, Cihaz yönetimi 979 → 203 ms, İnverter analizi 399 → 200 ms, Diğer santraller 321 → 47 ms.
- Menüde "Hız bekçisi" göstergesi: son geçiş süreleri, dosya boyutu/indirme/yaş. Eşik: istek 1500 ms, geçiş 700 ms.
- Sunucu: durum_analizi.py → durum.json "performans" (dosya boyutu + CDN indirme süresi); >900 KB ya da >2,5 sn uyarı. Açık: 2026_osos_endeks.json 1,1 MB — inceltilmeli.
- 2026-10-12 07:51 — Bulgular: durum.json 4 sa bayattı (03:42) — "Durum analizi" Action'ı yalnız zamanlamayla tetikleniyordu ve GitHub ilk günde yalnız 2 kez (21:03, 00:42) çalıştırdı; betik sağlam (yerelde 07:50 koşusu hatasız). Filo 29 (.100/.129 boş IP yuvası, 1f11403 ile uyarı kalktı). Son 24 sa tahmini: gelir ≈12.950 ₺, şebeke 1.544 kWh ≈6.980 ₺, nakit net ≈+5.970 ₺. Kural dışı yük 1 saat (11.10 21:00, ön ısınma, ≈103 ₺; tasarım gereği). Firmware: 10/24 S21e başarılı (.101–.110: 314–322 TH/s, 5,19–5,45 kW); .111 sürüm geçti ama uyut-tümü yüzünden hash ölçülemedi → sıra durdu, e6d4c02 + tekrar_izle ile sürecek. Bekçi 24 sa'te 7 "takılı" müdahalesi (hepsi düzeldi). WhatsApp: 10.10'dan beri teslim ≈0 (12.10: 36/36 başarısız, Twilio sandbox günlük sınırı 63038; 11.10'da 63015 katılım yok) — uyarılar kullanıcıya ulaşmıyor; gece firmware geçişleri 30+ "Cihaz durumu değişti" mesajıyla kotayı tüketiyor. Pi başabaşı 2.251 vs gerçekleşen 2.540 (%-11) sürüyor: Pi varsayımı 289,8 TH / 5,59 kW = 51,8 TH/kW, yeni firmware ölçümü ≈60 TH/kW (güneş takibi verim haritası 54–62) → Pi eşiği düşük kalıyor, eşik 2.814–3.175 arası saatlerde (ör. 12.10 00:00 PTF 2.972) gereksiz uyutma riski. Düzeltme: epias-ptf 5a87dd4 — Durum analizi artık Bildirimler (Pi 15 dk'da bir tetikler) bitince de çalışır, durum.json 50 dk'dan tazeyse atlar. Öneriler (onay bekler): (1) cihaz_yonetimi.json `cihaz_guc_kw` 5,59→ölçülen ≈5,3 ve `cihaz_th` kaynağını firmware sonrası ölçümle güncelle; (2) Twilio'da kendi WhatsApp göndericisi (sandbox sınırı/katılım sorunu kalıcı çözüm); (3) firmware görevindeki cihazın geçişleri "Cihaz durumu değişti" bildiriminden hariç tutulsun. İzlenecek: Durum analizi workflow_run koşuları ve durum.json yaşı <1 sa; .111 tekrar izleme sonucu ve sıranın .113'ten sürmesi; güncellenen cihazların 24 sa hash'i; 2026_osos_endeks.json 1,1 MB.

## 2026-10-12 · Güneş takibi: anlık sıçramada aşırı uyutma
- 09:19 FusionSolar Sera-2 okuması 490 kW sıçradı (önce 207, sonra 200). 09:30'da "düşüş" ileri tahmini 200 + 0,5×(200−490) = 55 kW çıktı → 28 çalışan cihazın 19'u uyutuldu; 3'er 3'er geri açılış ~45 dk sürdü.
- Düzeltme: ileri tahmin yalnız 13:00 sonrası ve düşüş en az iki okuma sürüyorsa; tahmin anlık üretimin %80'inin altına inmez. Açık ≥10 cihazsa açma adımı iki kat (6).
