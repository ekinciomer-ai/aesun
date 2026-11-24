#!/bin/bash
# Kara Kutu (KK_TR) · "Kimin Kusuru?" iş kazası #1: videoyu sunucuya koyar, Yükleme Yöneticisi'ne teslim eder ve planlar. Yayın yalnız Ömer onayıyla.
set -u
mkdir -p /opt/aesun/video_bekleyen
for kod in KK_IS_01_KASADAN_DUSME; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; continue; }
  python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 /opt/aesun/havuz/yonetici.py planla | grep -E "KK_IS" || true
