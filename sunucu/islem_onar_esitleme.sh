#!/bin/bash
# Eşitleme/arşiv durması (fork: Errno 11) tanı + onarım: kapsayıcılar init ile yeniden başlatılır. Veri birimlerine dokunulmaz.
set -u
for c in aesun-api aesun-isler; do
  echo "NOT: ÖNCE $c: süreç $(docker exec $c sh -c 'ls /proc | grep -c "^[0-9]"' 2>&1 | head -1) · zombi $(docker exec $c sh -c 'grep -l "^State:.Z" /proc/[0-9]*/status 2>/dev/null | wc -l' 2>&1 | head -1) · pids $(docker stats --no-stream --format '{{.PIDs}} {{.MemUsage}}' $c)"
done
echo "NOT: uid 1001 süreç (host): $(ps -u 1001 --no-headers 2>/dev/null | wc -l) · nproc sınırı: $(docker exec aesun-api sh -c 'ulimit -u' 2>&1)"
cp -r sunucu/aesun/. /opt/aesun/
cd /opt/aesun && docker compose up -d --force-recreate >/dev/null 2>&1
sleep 45
echo "NOT: SONRA: $(docker ps --filter name=aesun- --format '{{.Names}} {{.Status}}' | tr '\n' ' ') · init: $(docker inspect aesun-api --format '{{.HostConfig.Init}}')"
echo "NOT: api: $(curl -s --max-time 15 https://api.aksarayenerji.net/v1/saglik | cut -c1-160)"
sleep 30
echo "NOT: işler: $(docker exec aesun-isler cat /veri/durum.json 2>&1 | cut -c1-250)"
echo "NOT: işler günlüğü: $(docker logs --since 2m aesun-isler 2>&1 | tail -3 | tr '\n' ' ' | cut -c1-250)"
