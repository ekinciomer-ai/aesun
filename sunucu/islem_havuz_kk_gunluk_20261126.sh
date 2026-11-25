#!/bin/bash
# Kara Kutu (KK_TR) · Mit mi Gerçek mi? #17 (levhasız viraj, Danıştay): teslim + planla. Yayın yalnız Ömer'in panel onayıyla.
set -u
mkdir -p /opt/aesun/video_bekleyen
for kod in KK_MIT_17_VIRAJ_LEVHA; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; continue; }
  python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 /opt/aesun/havuz/yonetici.py planla | grep -E "KK_MIT_1[5-7]" || true
