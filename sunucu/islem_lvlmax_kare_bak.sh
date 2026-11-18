#!/bin/bash
# Salt okunur: LVL MAX kaynak kliplerinden klip başına 16 karelik pano (zaman damgalı) yapar, günlüğe base64 basar. Geçici klasör kullanır.
set -u
P=${P:-p01}; S=/opt/tampon/lvlmax/$P/kaynak; [ -d $S ] || { echo "NOT: HATA kaynak yok"; exit 1; }
T=$(mktemp -d); FONT=/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf
for v in $S/*.mp4; do
  AD=$(basename $v .mp4); D=$(ffprobe -v error -show_entries format=duration -of csv=p=0 $v </dev/null)
  echo "NOT: $AD $D sn"
  for i in $(seq 0 15); do t=$(python3 -c "print(round($D*($i+0.5)/16,1))")
    ffmpeg -nostdin -v error -y -ss $t -i $v -frames:v 1 -vf "scale=180:-2,drawtext=fontfile=$FONT:text='$t':x=3:y=3:fontsize=16:fontcolor=yellow:box=1:boxcolor=black" -q:v 6 $T/${AD}_$(printf %02d $i).jpg 2>/dev/null \
    || ffmpeg -nostdin -v error -y -ss $t -i $v -frames:v 1 -vf "scale=180:-2" -q:v 6 $T/${AD}_$(printf %02d $i).jpg
  done
  ffmpeg -nostdin -v error -y -pattern_type glob -i "$T/${AD}_*.jpg" -vf "tile=8x2" -frames:v 1 -q:v 6 $T/pano_$AD.jpg && {
    echo "PANO_BASLA $AD"; base64 -w 0 $T/pano_$AD.jpg; echo; echo "PANO_BITTI"; }
done
rm -rf $T
