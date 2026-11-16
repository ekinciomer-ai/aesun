#!/bin/bash
# Gündem+Tarih üçlüsü (narh, muhtesib, Boğaz 1621): videoları sunucuya koyar, havuza teslim eder. Planı Yükleme Yöneticisi yapar.
set -u
mkdir -p /opt/aesun/video_bekleyen
K="AS_GT_NARH AS_GT_MUHTESIB AS_GT_BOGAZ1621"
for k in $K; do install -m 644 sunucu/havuz/gelen/$k.mp4 /opt/aesun/video_bekleyen/${k}_kaynak.mp4 || { echo "NOT: HATA $k.mp4 kopyalanamadı"; exit 1; }; done
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
for k in $K; do python3 /opt/aesun/havuz/yonetici.py teslim sunucu/havuz/teslim/$k.json; done
python3 /opt/aesun/havuz/yonetici.py planla
