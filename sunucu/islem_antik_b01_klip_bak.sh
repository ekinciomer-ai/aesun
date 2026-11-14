#!/bin/bash
# Salt okunur: Keops klipleri için küçük kare panosu (her klipten 4 kare) → günlüğe base64.
set -u
K=/opt/tampon/antik_b01/klip
docker run --rm --cap-drop ALL -v $K:/k:ro -v /tmp:/o tampon-video15:2 bash -c '
cd /k; i=0; for f in 382833 309430 55718 262458 360197 223565 377554 130459 129868 252077; do
 d=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $f.mp4)
 ffmpeg -v error -y -i $f.mp4 -vf "fps=4/$d,scale=320:180,drawtext=fontfile=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf:text=$f:x=4:y=4:fontsize=16:fontcolor=yellow:box=1:boxcolor=black,tile=4x1" -frames:v 1 /o/kb_$i.jpg; i=$((i+1)); done
ffmpeg -v error -y -i /o/kb_%d.jpg -vf tile=1x10 /o/kb_pano.jpg' 2>&1 | tail -3
ls -la /tmp/kb_pano.jpg | sed 's/^/NOT: /'
echo "ONIZLEME_BASLA kb_pano.jpg"; base64 -w 4000 /tmp/kb_pano.jpg; echo "ONIZLEME_BITTI"; rm -f /tmp/kb_*.jpg
