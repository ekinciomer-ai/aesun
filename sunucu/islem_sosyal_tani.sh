#!/bin/bash
# Salt okunur: Sosyal Stüdyo ağ tanısı (Caddy → sosyal-studyo).
echo "NOT: sosyal ağları: $(docker inspect sosyal-studyo --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}={{$v.IPAddress}} {{end}}' 2>&1)"
echo "NOT: caddy ağları: $(docker inspect ck-caddy --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>&1)"
echo "NOT: sosyal durum: $(docker inspect sosyal-studyo --format '{{.State.Status}} {{.State.Health}}' 2>&1) · yerel: $(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:5090/saglik)"
echo "NOT: caddy araçları: wget=$(docker exec ck-caddy sh -c 'command -v wget' 2>&1) curl=$(docker exec ck-caddy sh -c 'command -v curl' 2>&1)"
echo "NOT: caddy→sosyal: $(docker exec ck-caddy wget -q -O - -T 10 http://sosyal-studyo:8000/saglik 2>&1 | head -c 200)"
echo "NOT: caddy→aesun-api: $(docker exec ck-caddy wget -q -O - -T 10 http://aesun-api:8000/v1/saglik 2>&1 | head -c 120)"
echo "NOT: caddy dns: $(docker exec ck-caddy nslookup sosyal-studyo 2>&1 | tail -2 | tr '\n' ' ')"
echo "NOT: sosyal günlük: $(docker logs --tail 5 sosyal-studyo 2>&1 | tr '\n' ' ' | cut -c1-400)"
