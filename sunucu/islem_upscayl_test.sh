#!/bin/bash
# Upscayl motorunu örnek bir kareyle sınar (540x960 dikey video karesi boyutu)
cd /opt/tampon/upscayl || exit 1
ffmpeg -loglevel error -y -f lavfi -i "testsrc2=size=540x960:rate=1" -frames:v 1 girdi/ornek.png
t0=$(date +%s); timeout 1500 bin/upscayl-bin -i girdi/ornek.png -o cikti/ornek_x4.png -m models -n upscayl-standard-4x -s 4 > log_ornek.txt 2>&1; rc=$?
echo "NOT: örnek kare 540x960 → 4x: kod $rc, $(( $(date +%s)-t0 )) sn, çıktı $(ffprobe -v error -show_entries stream=width,height -of csv=p=0 cikti/ornek_x4.png 2>/dev/null)"
[ $rc -ne 0 ] && tail -3 log_ornek.txt | sed 's/^/NOT: /'
yt=$(venv/bin/yt-dlp --version); echo "NOT: yt-dlp $yt"
