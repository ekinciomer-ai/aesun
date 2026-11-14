#!/bin/bash
# Hezarfen karton videosunu (video-teslim dalı, açık depo) sunucuya indirir ve Yükleme Yöneticisi havuzuna teslim eder. YAYINLAMAZ.
set -u
mkdir -p /opt/aesun/video_bekleyen
U="https://github.com/ekinciomer-ai/aesun/raw/video-teslim/hezarfen/hezarfen_karton_1080.mp4"
curl -sfL -o /opt/aesun/video_bekleyen/hezarfen_karton.mp4.tmp "$U" && mv /opt/aesun/video_bekleyen/hezarfen_karton.mp4.tmp /opt/aesun/video_bekleyen/hezarfen_karton.mp4 || { echo "NOT: HATA video indirilemedi"; exit 1; }
echo "NOT: video indi $(stat -c%s /opt/aesun/video_bekleyen/hezarfen_karton.mp4) bayt"
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 /opt/aesun/havuz/yonetici.py teslim sunucu/havuz/teslim/AS_TM_HEZARFEN_KARTON.json
python3 /opt/aesun/havuz/yonetici.py durum --json | tail -c 600 | sed "s/^/NOT: /"
