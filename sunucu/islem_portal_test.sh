#!/bin/bash
# Salt okuma: portal girişinin bağlı olduğu uçlar (en çok 9 NOT satırı).
O="Origin: https://portal.aksarayenerji.net"
echo "NOT: portal sayfa: $(curl -s -o /tmp/p.html -w '%{http_code} %{size_download}B' --max-time 20 https://portal.aksarayenerji.net/) · dm1 var: $(grep -c dm1 /tmp/p.html)"
echo "NOT: veri.json (api): $(curl -s -o /tmp/v.json -w '%{http_code} %{size_download}B' --max-time 20 -H "$O" https://api.aksarayenerji.net/v1/acik/portal/veri.json) · $(python3 -c "import json;d=json.load(open('/tmp/v.json'));print('kullanıcı',len(d.get('kullanicilar',{})),'tuz',bool(d.get('kul_tuz')))" 2>&1 | tail -1)"
echo "NOT: CORS: $(curl -s -D - -o /dev/null --max-time 20 -H "$O" https://api.aksarayenerji.net/v1/acik/portal/veri.json | grep -i '^access-control-allow-origin' | tr -d '\r' | tr '\n' ' ')"
echo "NOT: api sağlık: $(curl -s --max-time 20 https://api.aksarayenerji.net/v1/saglik | cut -c1-200)"
echo "NOT: api TLS (SNI): $(echo | openssl s_client -connect api.aksarayenerji.net:443 -servername api.aksarayenerji.net 2>/dev/null | openssl x509 -noout -subject -enddate | tr '\n' ' ')"
echo "NOT: caddy son hata: $(docker logs --since 6h gesfin-caddy 2>&1 | grep -i '"level":"error"' | tail -1 | cut -c1-260)"
echo "NOT: aesun-api: $(docker ps --filter name=aesun-api --format '{{.Status}}') · son 6s istek hataları: $(docker logs --since 6h aesun-api 2>&1 | grep -c ' 5[0-9][0-9] ')"
