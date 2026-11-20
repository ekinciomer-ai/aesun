#!/bin/bash
# Yolu Seç! (YR) · Kara Kutu İnternet Dolandırıcılığı 3'lü seti: videoları sunucuya koyar, Yükleme Yöneticisi havuzuna teslim eder ve planlar. Yayın yalnız Ömer onayıyla.
set -u
mkdir -p /opt/aesun/video_bekleyen
for kod in YR_KK_04_IBAN YR_KK_05_KARGO YR_KK_06_BANKA; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; exit 1; }
done
for kod in YR_KK_04_IBAN YR_KK_05_KARGO YR_KK_06_BANKA; do
  python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 /opt/aesun/havuz/yonetici.py planla
python3 /opt/aesun/havuz/yonetici.py durum --json
