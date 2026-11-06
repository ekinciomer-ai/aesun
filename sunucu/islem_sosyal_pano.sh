#!/bin/bash
# Salt okunur: son video işinden 24 karelik pano çıkarır ve günlüğe base64 olarak yazar (gözle kontrol için).
D=$(ls -td /opt/sosyal/kuyruk/cikti/*/ | while read d; do [ -f $d/video.mp4 ] && echo $d && break; done)
[ -n "$D" ] || { echo "NOT: videolu iş yok"; exit 0; }
S=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $D/video.mp4)
echo "NOT: iş $(basename $D) · süre $S sn"
ffmpeg -v error -y -i $D/video.mp4 -vf "fps=24/$S,scale=200:-2,tile=6x4" -frames:v 1 -q:v 5 /tmp/pano.jpg
echo "NOT: pano $(stat -c %s /tmp/pano.jpg) bayt"
echo "PANO_BASLA"; base64 -w 0 /tmp/pano.jpg; echo; echo "PANO_BITIS"; rm -f /tmp/pano.jpg
