#!/bin/bash
# Salt okunur: LVL MAX kaynak kliplerinin karelerinden klip başına bir pano (4x4) yapar ve günlüğe base64 basar.
set -u
P=${P:-p01}; K=/opt/tampon/lvlmax/$P/kare; [ -d $K ] || { echo "NOT: HATA kare yok"; exit 1; }
T=$(mktemp -d)
for f in $(ls $K | sed 's/_[0-9][0-9]\.jpg$//' | sort -u); do
  ffmpeg -v error -y -pattern_type glob -i "$K/${f}_*.jpg" -vf "scale=180:-2,tile=8x2" -frames:v 1 -q:v 6 $T/$f.jpg && {
    echo "PANO_BASLA $f"; base64 -w 0 $T/$f.jpg; echo; echo "PANO_BITTI"; }
done
for v in /opt/tampon/lvlmax/$P/kaynak/*.mp4; do echo "NOT: $(basename $v) $(ffprobe -v error -show_entries format=duration -of csv=p=0 $v) sn $(du -h $v | cut -f1)"; done
rm -rf $T
