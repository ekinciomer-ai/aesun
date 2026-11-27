#!/bin/bash
# Kara Kutu (KK_TR) · "Mit mi Gerçek mi?" #19, #20, #21 (27.11.2026 günlük üretim): videoları sunucuya koyar, Yükleme Yöneticisi'ne teslim eder ve planlar. Yayın yalnız Ömer onayıyla.
set -u
mkdir -p /opt/aesun/video_bekleyen
for kod in KK_MIT_19_EHLIYETSIZ KK_MIT_20_ALKOLLU_YOLCU KK_MIT_21_MICIR; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; continue; }
  python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 /opt/aesun/havuz/yonetici.py planla | grep -E "KK_MIT" || true
