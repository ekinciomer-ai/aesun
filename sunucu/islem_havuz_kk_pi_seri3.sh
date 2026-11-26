#!/bin/bash
# Kara Kutu "Patron mu Haklı?" #8-10: teslim + plan + Ömer'in sohbette verdiği yayın onayı (26.11.2026 12:38: "evet yükleme yap").
set -u
Y=/opt/aesun/havuz/yonetici.py
mkdir -p /opt/aesun/video_bekleyen
for kod in KK_PI_08_IMZALI_BORDRO KK_PI_09_EVLILIK_KIDEM KK_PI_10_MOBBING; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; continue; }
  python3 $Y teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 $Y planla | grep -E "KK_PI" || true
for kod in KK_PI_08_IMZALI_BORDRO KK_PI_09_EVLILIK_KIDEM KK_PI_10_MOBBING; do python3 $Y onay "$kod" evet "Ömer sohbette yayını onayladı 26.11.2026 12:38"; done
python3 $Y durum 2>/dev/null | grep -E "KK_PI_(08|09|10)" | sed 's/^/NOT: /' | head -10
