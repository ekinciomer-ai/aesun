#!/bin/bash
# Salt okunur: Antik B01 son iş günlüğü ve çıktılar.
tail -15 /opt/tampon/antik_b01/isg.log | cut -c1-200 | sed 's/^/NOT: /'
ls -la /opt/tampon/antik_b01/cikti/ | sed 's/^/NOT: /'
docker ps --format '{{.Names}} {{.Status}}' | grep -i tampon | sed 's/^/NOT: çalışan: /'
