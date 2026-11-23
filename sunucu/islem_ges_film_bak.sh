#!/bin/bash
# Salt okunur: GES filmi render durumu. Bittiyse videoyu iş günlüğüyle dışarı aktarır.
set -uo pipefail
IS=/opt/tampon/ges_film/is
[ -d $IS ] || { echo "NOT: ges_film kurulmamış"; exit 0; }
echo "NOT: durum $(cat $IS/out/durum.txt 2>/dev/null) · kare $(ls $IS/out/kareler 2>/dev/null | wc -l) · kapsayıcı $(docker ps -q -f name=^gesfilm$ | grep -q . && echo çalışıyor || echo durdu)"
docker logs --tail 3 gesfilm 2>/dev/null | sed 's/^/NOT: günlük: /'
V=$(ls -t $IS/out/ges_film_*.mp4 2>/dev/null | head -1)
if [ -n "$V" ]; then
  echo "NOT: video $(basename $V) $(du -h $V | cut -f1)"
  [ $(stat -c %s $V) -lt 31457280 ] && { base64 -w 0 $V | fold -w 50000 | sed 's/^/GFB64:/'; echo; } || echo "NOT: video 30 MB üstü, günlükle aktarılmadı"
fi
