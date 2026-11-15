#!/bin/bash
# Salt okunur: son COP31 videosunu 720p (telefon için) olarak günlüğe aktarır.
F=$(ls -t /opt/aesun/motor/cikti/cop31_*.mp4 2>/dev/null | head -1)
[ -n "$F" ] || { echo "NOT: HATA COP31 videosu yok"; exit 1; }
ffmpeg -y -v error -i "$F" -vf "scale=720:-2" -c:v libx264 -preset veryfast -crf 24 -c:a aac -b:a 128k -movflags +faststart /tmp/cop31_720.mp4
echo "NOT: 720p $(du -h /tmp/cop31_720.mp4 | cut -f1)"
echo "VIDEO_BASLA"; base64 -w 0 /tmp/cop31_720.mp4; echo; echo "VIDEO_BITIS"; rm -f /tmp/cop31_720.mp4
