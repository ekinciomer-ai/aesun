#!/bin/bash
# Kara Kutu (KK_TR) · "Mit mi Gerçek mi?" #3: videoyu sunucuya koyar, Yükleme Yöneticisi'ne teslim eder ve planlar. Yayın yalnız Ömer onayıyla.
set -u
mkdir -p /opt/aesun/video_bekleyen
kod=KK_MIT_03_TUTANAK
install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; exit 1; }
python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json"
python3 /opt/aesun/havuz/yonetici.py planla | grep -E "KK_|Kara Kutu" || true
