#!/bin/bash
# fatura (gesfin) tanı 2 — YALNIZ OKUMA. Caddy fatura bloğu (değerler maskeli), arka uç sağlığı, forward_auth hedefi.
CF=/opt/caddy/Caddyfile
mask(){ sed -E 's/(Authorization|Bearer|key|secret|token|password)[^ ]*/\1 ***/Ig' | cut -c1-200; }
BLOK=$(awk '/^fatura\.aksarayenerji\.net/{f=1} f{print} f&&/^}/{exit}' $CF | grep -v '^\s*$' | sed 's/^\s\+/ /' | mask | tr '\n' '¶')
echo "NOT: fatura bloğu: ${BLOK:0:900}"
Y=$(ls -t $CF.yedek-* 2>/dev/null | head -1)
if [ -n "$Y" ]; then
  echo "NOT: yedek($(basename $Y)) ile fark: $(diff <(grep -v '^\s*$' $Y) <(grep -v '^\s*$' $CF) | grep '^[<>]' | mask | head -12 | tr '\n' '¶' | cut -c1-700)"
fi
# forward_auth hedefi
FA=$(awk '/^fatura\.aksarayenerji\.net/{f=1} f&&/forward_auth/{print; exit}' $CF | mask)
echo "NOT: forward_auth satırı: ${FA:-yok}"
# arka uç doğrudan (caddy kapsayıcısından)
echo "NOT: backend doğrudan: $(docker exec gesfin-caddy wget -q -O- -S --timeout=10 http://gesfin-backend:8000/api/health 2>&1 | head -3 | tr '\n' ' ' | cut -c1-200)"
echo "NOT: backend /health: $(docker exec gesfin-caddy wget -q -O- -S --timeout=10 http://gesfin-backend:8000/health 2>&1 | head -2 | tr '\n' ' ' | cut -c1-160)"
echo "NOT: mobile-web doğrudan: $(docker exec gesfin-caddy wget -q -O /dev/null -S --timeout=10 http://gesfin-mobile-web:80/ 2>&1 | head -1 | cut -c1-80)"
echo "NOT: backend son log: $(docker logs gesfin-backend --since 2h 2>&1 | grep -v -i -E 'password|token|secret' | tail -6 | cut -c1-150 | tr '\n' '¶')"
echo "NOT: caddy 401 örnekleri: $(docker logs gesfy-caddy 2>/dev/null; docker logs gesfin-caddy --since 2h 2>&1 | grep '"status":401' | tail -2 | grep -o -E '"uri":"[^"]*"|"handler":"[^"]*"|"msg":"[^"]*"' | tr '\n' ' ' | cut -c1-300)"
echo "NOT: kapsayıcı başlangıç: $(docker inspect gesfin-caddy gesfin-backend gesfin-mobile-web --format '{{.Name}} {{.State.StartedAt}} rs={{.RestartCount}}' | cut -c1-70 | tr '\n' ';')"
