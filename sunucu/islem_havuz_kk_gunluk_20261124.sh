#!/bin/bash
# Kara Kutu (KK_TR) · "Mit mi Gerçek mi?" günlük üretim 24.11.2026: #15 teslim + planla. (#16-17 ses kotası yüzünden ertelendi.)
# Yayın yalnız Ömer'in panel onayıyla; bu dosya onay/yonlendir/yayın adımı İÇERMEZ.
set -u
mkdir -p /opt/aesun/video_bekleyen
for kod in KK_MIT_15_OLUMLU_KAZA; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; continue; }
  python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 /opt/aesun/havuz/yonetici.py planla | grep -E "KK_MIT" || true
