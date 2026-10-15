#!/bin/bash
# aesun kapsayıcılarının durumu (yalnız okuma)
echo "NOT: kapsayıcılar: $(docker ps --filter name=aesun- --format '{{.Names}} {{.Status}}' | tr '\n' ' ')"
echo "NOT: işler: $(docker exec aesun-isler cat /veri/durum.json 2>&1 | cut -c1-400)"
echo "NOT: api: $(curl -s --max-time 15 https://api.aksarayenerji.net/v1/saglik | cut -c1-300)"
echo "NOT: bellek: $(free -m | awk '/Mem/{print "kullanılabilir "$7" MB / "$2" MB"}') · disk $(df -h / | tail -1 | awk '{print $5}')"
