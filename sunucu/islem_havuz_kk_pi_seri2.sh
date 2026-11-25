#!/bin/bash
# Kara Kutu "Patron mu Haklı?" #6-7: teslim + plan + Ömer'in sohbette verdiği yayın onayı (25.11.2026: "Evet, yayınla").
set -u
Y=/opt/aesun/havuz/yonetici.py
mkdir -p /opt/aesun/video_bekleyen
for kod in KK_PI_06_ELDEN_MAAS KK_PI_07_MESAI_ODENMEDI; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; continue; }
  python3 $Y teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 $Y planla | grep -E "KK_PI" || true
for kod in KK_PI_06_ELDEN_MAAS KK_PI_07_MESAI_ODENMEDI; do
  python3 $Y onay "$kod" evet "Ömer sohbette yayını onayladı 25.11.2026"
done
python3 $Y durum 2>/dev/null | grep -E "KK_PI_0[67]" | sed 's/^/NOT: /' | head -10
