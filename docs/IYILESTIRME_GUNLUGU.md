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
