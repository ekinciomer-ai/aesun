#!/bin/bash
echo "NOT: süreç sayısı: $(docker stats --no-stream --format '{{.Name}}={{.PIDs}}' aesun-api aesun-isler | tr '\n' ' ') · uid1001 host: $(ps -u 1001 --no-headers | wc -l) · zombi host: $(ps -eo stat | grep -c '^Z')"
echo "NOT: işler: $(docker exec aesun-isler cat /veri/durum.json 2>&1 | cut -c1-300)"
