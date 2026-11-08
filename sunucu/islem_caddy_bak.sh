#!/bin/bash
# Yalnız okur: Caddyfile site adresleri ve IP ile ilgili bloklar (şifre özetleri gizlenir).
CF=/opt/caddy/Caddyfile
echo "NOT: site satırları: $(grep -nE '^[^[:space:]#][^{]*\{' $CF | tr '\n' ' ' | cut -c1-900)"
echo "NOT: IP geçen satırlar: $(grep -n '185.22.184.51' $CF | tr '\n' ' ' | cut -c1-400)"
echo "NOT: yedekler: $(ls -t $CF.yedek-* 2>/dev/null | head -3 | tr '\n' ' ')"
echo "NOT: son yedek ile fark (satır sayısı): $(diff <(cat $(ls -t $CF.yedek-* | head -1)) $CF | grep -c '^[<>]')"
echo "NOT: IP kökü (şifresiz): $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://185.22.184.51/) · https: $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 https://185.22.184.51/)"
