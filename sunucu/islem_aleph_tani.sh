#!/bin/bash
# YALNIZ OKUMA: aleph-tampon kapsayıcısının durumu ve son günlükleri.
echo "NOT: durum: $(docker ps -a --filter name=aleph-tampon --format '{{.Status}}')"
docker logs --tail 25 aleph-tampon 2>&1 | sed 's/^/NOT: log: /' | cut -c1-300
echo "NOT: izinler: $(ls -ld /opt/tampon/aleph/captures /opt/tampon/aleph/cache | awk '{print $1,$3,$9}' | tr '\n' ' ')"
