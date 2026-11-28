#!/bin/bash
# evdenyemekye.com: alan adı sunucuyu gösteriyorsa Caddy'ye gerçek adresi + www yönlendirmesini ekler (kapsayıcıya dokunmaz).
IP=$(curl -s4 --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')
ON="eyk.$(echo $IP | tr . -).sslip.io"; DNS=$(getent ahostsv4 evdenyemekye.com | awk 'NR==1{print $1}'); W=$(getent ahostsv4 www.evdenyemekye.com | awk 'NR==1{print $1}')
echo "NOT: DNS evdenyemekye.com=$DNS www=$W sunucu=$IP"
[ "$DNS" = "$IP" ] || { echo "NOT: HATA alan adı henüz sunucuyu göstermiyor"; exit 1; }
EK=/opt/cutkoda/caddy-ek/evdenyemekye.caddy; ESKI=$(cat $EK 2>/dev/null)
{ echo "# evdenyemekye.com (dış geliştirici; kurallar aesun/sunucu/evdenyemekye)"; echo "evdenyemekye.com, $ON {"
  printf '\tencode zstd gzip\n\trequest_body {\n\t\tmax_size 50MB\n\t}\n\theader {\n\t\tStrict-Transport-Security "max-age=31536000"\n\t\tX-Content-Type-Options nosniff\n\t\tReferrer-Policy strict-origin-when-cross-origin\n\t\t-Server\n\t}\n\treverse_proxy eyk-site:8000\n}\n'
  [ "$W" = "$IP" ] && printf 'www.evdenyemekye.com {\n\tredir https://evdenyemekye.com{uri} permanent\n}\n'; } > $EK
if docker exec ck-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/tmp/eyk_c.txt 2>&1 && docker exec ck-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >>/tmp/eyk_c.txt 2>&1; then echo "NOT: Caddy yenilendi"; else
  echo "NOT: HATA Caddy: $(grep -i error /tmp/eyk_c.txt | tail -1 | cut -c1-200); eski ayar geri"; echo "$ESKI" > $EK; docker exec ck-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; exit 1; fi
for i in $(seq 1 12); do c=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://evdenyemekye.com/); [ "$c" = 200 ] && break; sleep 10; done
echo "NOT: https://evdenyemekye.com → $c · www → $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://www.evdenyemekye.com/) · portal $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://portal.aksarayenerji.net/) · cutkoda $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://cutkoda.com/)"
[ "$c" = 200 ] || docker logs --since 3m ck-caddy 2>&1 | grep -i -E 'evdenyemekye' | grep -i -E 'error|fail' | tail -3 | cut -c1-300 | sed 's/^/NOT: caddy: /'
