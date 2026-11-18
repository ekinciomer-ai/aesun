#!/bin/bash
# Ömür Dediğin · Levha Konuşuyor B01 (Yaya Geçidi): videoyu sunucuya koyar, havuza teslim eder. Planı Yükleme Yöneticisi yapar; yayın Ömer onayıyla.
set -u
mkdir -p /opt/aesun/video_bekleyen
install -m 644 sunucu/havuz/gelen/OD_LEVHA_01_YAYA.mp4 /opt/aesun/video_bekleyen/OD_LEVHA_01_YAYA_kaynak.mp4 || { echo "NOT: HATA video kopyalanamadı"; exit 1; }
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 /opt/aesun/havuz/yonetici.py teslim sunucu/havuz/teslim/OD_LEVHA_01_YAYA.json
python3 /opt/aesun/havuz/yonetici.py planla
