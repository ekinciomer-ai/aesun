#!/bin/bash
# Salt okunur: kalite kapısını sunucuda yüklenmiş son videolar üzerinde dener (eşikleri gerçek içerikle sınamak için).
command -v ffprobe >/dev/null || { DEBIAN_FRONTEND=noninteractive apt-get install -y -qq ffmpeg >/dev/null 2>&1; }
echo "NOT: ffmpeg: $(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f1-3)"
for f in $(ls -t /opt/aesun/youtube/medya/*.mp4 2>/dev/null | head -8); do
  echo "NOT: $(basename $f): $(timeout 300 python3 sunucu/aesun/kalite_kapisi.py "$f" | cut -c1-400)"
done
