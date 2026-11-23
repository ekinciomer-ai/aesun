#!/bin/bash
# Yolu Seç! (YR) · Kara Kutu Tarihin Mahkeme Dosyaları 3'lü seti: videoları sunucuya koyar, Yükleme Yöneticisi havuzuna teslim eder ve planlar. Yayın yalnız Ömer onayıyla.
set -u
mkdir -p /opt/aesun/video_bekleyen
for kod in YR_KK_07_MISIR YR_KK_08_ORTACAG YR_KK_09_OSMANLI; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; exit 1; }
done
for kod in YR_KK_07_MISIR YR_KK_08_ORTACAG YR_KK_09_OSMANLI; do
  python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 /opt/aesun/havuz/yonetici.py planla
python3 /opt/aesun/havuz/yonetici.py durum --json
