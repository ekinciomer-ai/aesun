#!/usr/bin/env bash
set -euo pipefail
mkdir -p /opt/aesun/havuz/gelen /opt/aesun/havuz/teslim
for K in YR_KK_16_MANGAL_KAMERA YR_KK_17_ISKAN_CEZA YR_KK_18_BANKA_ZIMMET; do
  cp -f "sunucu/havuz/gelen/${K}.mp4" "/opt/aesun/havuz/gelen/${K}.mp4"
  cp -f "sunucu/havuz/teslim/${K}.json" "/opt/aesun/havuz/teslim/${K}.json"
  echo "NOT: teslim -> ${K}"
  python3 /opt/aesun/havuz/yonetici.py teslim "/opt/aesun/havuz/teslim/${K}.json"
done
echo "NOT: planlama basliyor"
python3 /opt/aesun/havuz/yonetici.py planla
