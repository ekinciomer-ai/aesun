#!/bin/bash
# Kapsayıcı içinde (/work=/opt/tampon/antik_b01). $1 = ornek | tam
set -e
[ -f three_mod/node_modules/three/build/three.module.min.js ] || (mkdir -p three_mod && cd three_mod && npm init -y >/dev/null && npm i -s three@0.170 >/dev/null)
[ -f zaman.json ] && [ -f karisim.wav ] || { echo "HATA: önce ses/zaman üretilmeli"; exit 1; }
python3 -m http.server 8000 --bind 127.0.0.1 >/dev/null 2>&1 & sleep 1
if [ "$1" = ornek ]; then
  mkdir -p kontrol && rm -f kontrol/*
  TS=$(python3 -c 'import json;z=json.load(open("zaman.json"));print(",".join(f"{s[\"bas\"]+s[\"sure\"]*f:.2f}" for s in z["sahneler"] for f in (0.25,0.75)))')
  node kayit3d.mjs http://127.0.0.1:8000/dunya.html zaman.json kontrol/k.jpg 30 "$TS"
  ffmpeg -v error -y -pattern_type glob -i 'kontrol/k_*.jpg' -vf "scale=270:480,tile=10x1" kontrol/pano.jpg
else
  node kayit3d.mjs http://127.0.0.1:8000/dunya.html zaman.json goruntu3d.mp4 30
  ffmpeg -v error -y -i goruntu3d.mp4 -i karisim.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart cikti/antik_b01_3d_1080.mp4
  ffmpeg -v error -y -i cikti/antik_b01_3d_1080.mp4 -vf scale=480:-2 -c:v libx264 -crf 28 -preset veryfast -c:a aac -b:a 96k -movflags +faststart cikti/antik_b01_3d_480.mp4
fi
echo "bitti $1"
