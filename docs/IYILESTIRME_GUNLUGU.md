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
