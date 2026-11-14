#!/bin/bash
# Antik Stüdyo B01 · Kodla Film #21 (3D Tek Komut, Gize) · mod: ornek · YAYINLAMAZ. Ses/zaman önceki işten (önbellek).
set -u
KOK=/opt/tampon/antik_b01; IMAJ=tampon-video15:2
cp sunucu/antik_b01/dunya.html sunucu/antik_b01/kayit3d.mjs sunucu/antik_b01/calis3d.sh $KOK/ && chown -R 1500:1500 $KOK
docker run --rm --memory 4096m --cpus 3 --pids-limit 2048 --shm-size 1g --security-opt no-new-privileges --cap-drop ALL \
  -e HOME=/work/.home -e NPM_CONFIG_UPDATE_NOTIFIER=false -e PLAYWRIGHT_BROWSERS_PATH=/pwc \
  -v /opt/tampon/video15/.home/.cache/ms-playwright:/pwc:ro -v /opt/tampon/video15/pwkayit/node_modules:/work/node_modules:ro \
  -v $KOK:/work -w /work $IMAJ timeout 3600 bash calis3d.sh ornek > $KOK/is3d.log 2>&1
k=$?; grep -vE '^\s*$' $KOK/is3d.log | tail -8 | sed 's/^/NOT: /'
[ $k -eq 0 ] || exit 1
if [ "ornek" = ornek ]; then echo "ONIZLEME_BASLA pano3d.jpg"; base64 -w 4000 $KOK/kontrol/pano.jpg; echo "ONIZLEME_BITTI"
else for f in $KOK/cikti/antik_b01_3d_*.mp4; do echo "NOT: ÇIKTI $(basename $f) $(du -h $f | cut -f1)"; done
  echo "ONIZLEME_BASLA antik_b01_3d_480.mp4"; base64 -w 4000 $KOK/cikti/antik_b01_3d_480.mp4; echo "ONIZLEME_BITTI"; fi
