#!/bin/bash
# Antik Stüdyo B01 · gerçek görüntü sürümü (Pixabay klipleri + kodla efekt kaplaması). YAYINLAMAZ.
# Adım 1: klipleri kes → taban video + kareler. Adım 2: kaplama (ölçü, etiket, altyazı) kare kare. Ses/müzik önbellekten.
set -u
MOD=tam
KOK=/opt/tampon/antik_b01; IMAJ=tampon-video15:2
cp sunucu/antik_b01/kesim.json sunucu/antik_b01/taban.py sunucu/antik_b01/gercek.html sunucu/antik_b01/kayit3d.mjs $KOK/ && chown -R 1500:1500 $KOK
RUN="docker run --rm --memory 4096m --cpus 3 --pids-limit 2048 --shm-size 1g --security-opt no-new-privileges --cap-drop ALL -e HOME=/work/.home -e PLAYWRIGHT_BROWSERS_PATH=/pwc -v /opt/tampon/video15/.home/.cache/ms-playwright:/pwc:ro -v /opt/tampon/video15/pwkayit/node_modules:/work/node_modules:ro -v $KOK:/work -w /work $IMAJ"
$RUN -e MOD=tam timeout 3000 bash -c '
set -e
python3 taban.py
python3 -m http.server 8000 --bind 127.0.0.1 >/dev/null 2>&1 & sleep 1
TS=$(python3 -c "import json;z=json.load(open(\"zaman.json\"));print(\",\".join(\"%.2f\"%(s[\"bas\"]+s[\"sure\"]*f) for s in z[\"sahneler\"] for f in (0.2,0.5,0.85)))")
mkdir -p kontrol && rm -f kontrol/*
node kayit3d.mjs http://127.0.0.1:8000/gercek.html zaman.json kontrol/g.jpg 30 "$TS"
ffmpeg -v error -y -pattern_type glob -i "kontrol/g_*.jpg" -vf "scale=240:426,tile=15x1" kontrol/pano_g.jpg
if [ "${MOD:-}" = tam ]; then
  node kayit3d.mjs http://127.0.0.1:8000/gercek.html zaman.json goruntu_g.mp4 30
  ffmpeg -v error -y -i goruntu_g.mp4 -i karisim.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest -movflags +faststart cikti/antik_b01_gercek_1080.mp4
  ffmpeg -v error -y -i cikti/antik_b01_gercek_1080.mp4 -vf scale=480:-2 -c:v libx264 -crf 27 -preset veryfast -c:a aac -b:a 96k -movflags +faststart cikti/antik_b01_gercek_480.mp4
fi
echo bitti' > $KOK/isg.log 2>&1
k=$?; grep -vE '^\s*$' $KOK/isg.log | grep -vE '^parça' | tail -6 | sed 's/^/NOT: /'; grep -c '^parça' $KOK/isg.log | sed 's/^/NOT: parça sayısı /'
[ $k -eq 0 ] || exit 1
echo "ONIZLEME_BASLA pano_g.jpg"; base64 -w 4000 $KOK/kontrol/pano_g.jpg; echo "ONIZLEME_BITTI"
[ -f $KOK/cikti/antik_b01_gercek_480.mp4 ] && [ "${MOD:-}" = tam ] && { echo "ONIZLEME_BASLA antik_b01_gercek_480.mp4"; base64 -w 4000 $KOK/cikti/antik_b01_gercek_480.mp4; echo "ONIZLEME_BITTI"; }
exit 0
