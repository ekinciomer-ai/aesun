#!/bin/bash
# Kara Kutu "Patron mu Haklı?" #11-13: teslim + plan + Ömer'in sohbette verdiği yayın onayı (27.11.2026 11:57: "evet devam et", teslim sorusuna yanıt).
set -u
Y=/opt/aesun/havuz/yonetici.py
mkdir -p /opt/aesun/video_bekleyen
for kod in KK_PI_11_SIGORTASIZ KK_PI_12_ARABULUCU_IMZA KK_PI_13_KOD_29; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; continue; }
  python3 $Y teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 $Y planla | grep -E "KK_PI" || true
for kod in KK_PI_11_SIGORTASIZ KK_PI_12_ARABULUCU_IMZA KK_PI_13_KOD_29; do python3 $Y onay "$kod" evet "Ömer sohbette yayını onayladı 27.11.2026 11:57"; done
python3 $Y durum 2>/dev/null | grep -E "KK_PI_1[123]" | sed 's/^/NOT: /' | head -10
