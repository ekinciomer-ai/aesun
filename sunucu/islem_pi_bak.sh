#!/bin/bash
# Salt okunur: Pi'nin sunucuya son yazdığı dosyalar ve son Pi istekleri. Hiçbir şeyi değiştirmez.
V=/var/lib/docker/volumes/aesun_aesun_veri/_data/epias-ptf
[ -d $V ] || V=$(docker exec aesun-api sh -c 'echo $AESUN_VERI' 2>/dev/null)
echo "NOT: sunucu kopyasında en yeni n8n dosyaları: $(docker exec aesun-api sh -c 'cd ${AESUN_VERI:-/veri/epias-ptf} && ls -lt --time-style=+%H:%M n8n | head -12 | awk "{print \$6\"=\"\$7}"' | tr '\n' ' ')"
echo "NOT: son 90 dk aesun-pi istekleri (yazma/okuma): $(docker logs --since 90m aesun-api 2>&1 | grep -c 'a=yaz') / $(docker logs --since 90m aesun-api 2>&1 | grep -c 'a=oku')"
echo "NOT: son yazma satırları: $(docker logs --since 90m aesun-api 2>&1 | grep 'a=yaz' | tail -3 | cut -c1-160 | tr '\n' ' ')"
echo "NOT: Caddy son Pi erişimi: $(docker logs --since 90m $(docker ps --format '{{.Names}}' | grep -i caddy | head -1) 2>&1 | grep -i 'aesun-pi' | tail -2 | grep -oE '"ts":[0-9.]+|"remote_ip":"[^"]+"|"uri":"[^"]{0,80}' | tr '\n' ' ')"
