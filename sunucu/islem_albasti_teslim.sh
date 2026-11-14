#!/bin/bash
# Albastı v2: videolar sunucuda (/opt/aesun/video_bekleyen/albasti_v2_*.mp4). Kartı havuza (yeniden) teslim eder.
set -u
for a in 916 169; do [ -f /opt/aesun/video_bekleyen/albasti_v2_$a.mp4 ] || { echo "NOT: HATA albasti_v2_$a.mp4 yok"; exit 1; }; done
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 /opt/aesun/havuz/yonetici.py teslim sunucu/havuz/teslim/AS_HB_ALBASTI.json
