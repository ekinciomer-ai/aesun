#!/bin/bash
# fatura tanı 4 — YALNIZ OKUMA: son 15 dk Caddy erişim günlüğü (yol+durum), gesfin-backend 401 nedenleri, aesun-api sayaçları.
suz(){ grep -v -i -E 'password|secret|cookie|authorization|bearer' | cut -c1-240; }
echo "NOT: caddy son istekler: $(docker logs gesfin-caddy --since 15m 2>&1 | grep '"host":"fatura.aksarayenerji.net"' | grep -o -E '"uri":"[^"]{0,60}"|"status":[0-9]+' | paste - - | sort | uniq -c | sort -rn | head -12 | tr -s ' ' | tr '\n' ';' | cut -c1-900)"
echo "NOT: backend son 15 dk: $(docker logs gesfin-backend --since 15m 2>&1 | suz | grep -i -E ' 401| 403|unauth|expired|token|session|error' | tail -8 | tr '\n' '¦' | cut -c1-900)"
echo "NOT: backend istek örnekleri: $(docker logs gesfin-backend --since 15m 2>&1 | suz | grep -E 'GET|POST' | tail -8 | tr '\n' '¦' | cut -c1-700)"
echo "NOT: aesun-api: $(docker exec gesfin-caddy wget -q -O- --timeout=5 http://aesun-api:8000/v1/saglik 2>&1 | cut -c1-200)"
echo "NOT: aesun-api son log: $(docker logs aesun-api --since 15m 2>&1 | grep -E 'sso|dogrula' | tail -8 | cut -c1-120 | tr '\n' '¦' | cut -c1-800)"
echo "NOT: backend ortam (adlar): $(docker inspect gesfin-backend --format '{{range .Config.Env}}{{println .}}{{end}}' | cut -d= -f1 | tr '\n' ' ' | cut -c1-400)"
echo "NOT: mobile-web api adresi: $(docker exec gesfin-mobile-web sh -c 'grep -r -o -h -E "https?://[a-z.-]*aksarayenerji[a-z./-]*|/api/[a-z/]*" /usr/share/nginx/html 2>/dev/null | sort | uniq -c | sort -rn | head -8' | tr '\n' ';' | cut -c1-400)"
true
