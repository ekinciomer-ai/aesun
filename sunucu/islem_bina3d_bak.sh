#!/bin/bash
# Yalnız okur: 80/443'ü kim dinliyor, ck-caddy bağlamaları ve site adresleri.
echo "NOT: portlar: $(docker ps --format '{{.Names}}={{.Ports}}' | grep -E ':80->|:443->' | tr '\n' ' ' | cut -c1-300)"
echo "NOT: ck-caddy bağlama: $(docker inspect ck-caddy --format '{{range .Mounts}}{{.Source}}>{{.Destination}} {{end}}' | cut -c1-300)"
echo "NOT: ck-caddy ağları: $(docker inspect ck-caddy --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')"
CF=$(docker inspect ck-caddy --format '{{range .Mounts}}{{if eq .Destination "/etc/caddy/Caddyfile"}}{{.Source}}{{end}}{{end}}')
[ -z "$CF" ] && CF=$(docker inspect ck-caddy --format '{{range .Mounts}}{{.Source}} {{end}}' | tr ' ' '\n' | grep -i caddy | head -1)/Caddyfile
echo "NOT: Caddyfile: $CF"
echo "NOT: site satırları: $(grep -nE '^[^[:space:]#][^{]*\{' $CF 2>/dev/null | tr '\n' ' ' | cut -c1-700)"
echo "NOT: import: $(grep -n import $CF 2>/dev/null | tr '\n' ' ' | cut -c1-300)"
echo "NOT: IP satırları: $(grep -rn '185.22.184.51' $(dirname $CF) 2>/dev/null | cut -c1-120 | tr '\n' ' ' | cut -c1-400)"
echo "NOT: /opt/caddy/Caddyfile site: $(grep -nE '^[^[:space:]#][^{]*\{' /opt/caddy/Caddyfile | tr '\n' ' ' | cut -c1-300)"
echo "NOT: IP https: $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 https://185.22.184.51/) http: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://185.22.184.51/)"
echo "NOT: bina3d-web: $(docker ps -a --format '{{.Names}} {{.Status}}' | grep bina3d || echo yok)"
