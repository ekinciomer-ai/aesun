#!/bin/bash
# Kara Kutu (KK_TR) · "Mit mi Gerçek mi?" #22, #23, #24 (28.11.2026 günlük üretim): videoları sunucuya koyar, Yükleme Yöneticisi'ne teslim eder ve planlar. Yayın yalnız Ömer onayıyla.
set -u
mkdir -p /opt/aesun/video_bekleyen
for kod in KK_MIT_22_KIRMIZIDA_YAYA KK_MIT_23_OTOBUS_YOLCU KK_MIT_24_YOLDAKI_TAS; do
  [ -f "sunucu/havuz/gelen/${kod}.mp4" ] || { echo "NOT: ${kod} videosu yok, atlandı"; continue; }
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; continue; }
  python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 /opt/aesun/havuz/yonetici.py planla | grep -E "KK_MIT" || true
