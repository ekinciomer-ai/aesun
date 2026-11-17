#!/bin/bash
# Kozmos Lab "Bu Matematik Hayatında Nerede?" B1-B8: videoları sunucuya koyar, havuza teslim eder.
set -u
mkdir -p /opt/aesun/video_bekleyen
for k in ${KODLAR:-KZ_MAT_09_WIFI}; do
  install -m 644 sunucu/havuz/gelen/$k.mp4 /opt/aesun/video_bekleyen/${k}_kaynak.mp4 || { echo "NOT: HATA $k.mp4 kopyalanamadı"; exit 1; }
done
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
for k in ${KODLAR:-KZ_MAT_09_WIFI}; do python3 /opt/aesun/havuz/yonetici.py teslim sunucu/havuz/teslim/$k.json; done
python3 /opt/aesun/havuz/yonetici.py durum --json | tail -3
