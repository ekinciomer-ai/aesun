#!/bin/bash
# YALNIZ OKUMA: gesfin iç sağlık uçları
for p in /health /api/health /docs /; do echo "NOT: backend $p → $(docker exec gesfin-caddy wget -q -S -O /dev/null --timeout=5 http://gesfin-backend:8000$p 2>&1 | grep -m1 HTTP | cut -c1-40)"; done
echo "NOT: mobile-web / → $(docker exec gesfin-caddy wget -q -S -O /dev/null --timeout=5 http://gesfin-mobile-web/ 2>&1 | grep -m1 HTTP | cut -c1-40)"
echo "NOT: mobile-web:80 port: $(docker inspect -f '{{json .Config.ExposedPorts}}' gesfin-mobile-web)"
echo "NOT: servisler: $(cd /opt/gesfin && docker compose ps --format '{{.Service}}={{.State}}' | tr '\n' ' ')"
true
