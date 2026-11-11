#!/bin/bash
# YALNIZ OKUMA: gesfin iç sağlık uçları (kapsayıcının içinden)
for p in /health /api/health /auth/users /; do echo "NOT: backend $p → $(docker exec gesfin-backend python3 -c "
import urllib.request,urllib.error,sys
try: print(urllib.request.urlopen('http://127.0.0.1:8000$p',timeout=5).status)
except urllib.error.HTTPError as e: print(e.code)
except Exception as e: print('ERR',type(e).__name__)" 2>&1 | tail -1)"; done
echo "NOT: mobile-web → $(docker exec gesfin-mobile-web sh -c 'wget -q -O /dev/null http://127.0.0.1/ && echo 200 || echo ERR' 2>&1)"
echo "NOT: caddy ağ: $(docker inspect -f '{{.HostConfig.NetworkMode}}' gesfin-caddy)"
true
