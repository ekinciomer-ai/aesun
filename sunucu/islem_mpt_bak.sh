#!/bin/bash
# Salt okunur: son MPT görevleri ve günlük sonu.
for d in $(ls -td /opt/tampon/mpt/repo/storage/tasks/*/ | head -3); do echo "NOT: $(basename $d): $(ls $d | tr '\n' ' ' | cut -c1-200)"; done
T=$(basename $(ls -td /opt/tampon/mpt/repo/storage/tasks/*/ | head -1))
echo "NOT: durum: $(curl -s -m 10 http://127.0.0.1:8180/api/v1/tasks/$T | cut -c1-300)"
docker logs --since 40m tampon-mpt 2>&1 | grep -vE '^\s*$' | grep -iE 'error|fail|warn|complete|download' | tail -8 | cut -c1-240 | sed -E 's/AIza[0-9A-Za-z_-]+/***/g; s/key=[0-9a-f-]+/key=***/g; s/^/NOT: günlük: /'
