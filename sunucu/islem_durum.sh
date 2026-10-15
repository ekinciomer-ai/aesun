#!/bin/bash
echo "NOT: kapsayıcılar: $(docker ps --filter name=aesun --format '{{.Names}} {{.Status}}' | tr '\n' ' ')"
echo "NOT: işler: $(docker exec aesun-isler cat /veri/durum.json 2>&1 | cut -c1-600)"
echo "NOT: api: $(curl -s --max-time 15 https://api.aksarayenerji.net/v1/saglik | cut -c1-300)"
echo "NOT: başka aesun zamanlayıcı: $(crontab -l 2>/dev/null | grep -i aesun | cut -c1-120 | tr '\n' ' ') $(systemctl list-timers --all --no-legend 2>/dev/null | grep -i aesun | tr '\n' ' ') $(ls /opt/aesun | tr '\n' ' ')"
echo "NOT: bellek: $(free -m | awk '/Mem/{print "kullanılabilir "$7" MB / "$2" MB"}') · disk $(df -h / | tail -1 | awk '{print $5}')"
