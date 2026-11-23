#!/usr/bin/env bash
set -euo pipefail
mkdir -p /opt/aesun/havuz/gelen /opt/aesun/havuz/teslim
for K in YR_KK_22_KASKO_KIRA YR_KK_23_KIRA_TADILAT YR_KK_24_KIRA_YENILEME; do
  cp -f "sunucu/havuz/gelen/${K}.mp4" "/opt/aesun/havuz/gelen/${K}.mp4"
  cp -f "sunucu/havuz/teslim/${K}.json" "/opt/aesun/havuz/teslim/${K}.json"
  echo "NOT: teslim -> ${K}"
  python3 /opt/aesun/havuz/yonetici.py teslim "/opt/aesun/havuz/teslim/${K}.json"
done
echo "NOT: planlama basliyor"
python3 /opt/aesun/havuz/yonetici.py planla
