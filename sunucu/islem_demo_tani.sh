#!/bin/bash
# Salt okuma: 80/443 portlarını kim dinliyor, Caddy siteleri neler (en çok 9 NOT satırı).
IP=185.22.184.51
echo "NOT: 80/443 dinleyen: $(ss -H -tlnp '( sport = :80 or sport = :443 )' | awk '{print $4, $6}' | sed 's/users:((//;s/,pid=[0-9]*,fd=[0-9]*//g' | tr '\n' ' ' | cut -c1-250)"
echo "NOT: docker 80/443 yayınlayan: $(docker ps --format '{{.Names}} {{.Ports}}' | grep -E ':(80|443)->' | cut -c1-120 | tr '\n' '|')"
echo "NOT: caddy siteleri: $(grep -E '^[^[:space:]#].*\{' /opt/caddy/Caddyfile | tr -d '{' | tr '\n' ';' | cut -c1-300)"
echo "NOT: nginx/apache: $(systemctl is-active nginx apache2 2>/dev/null | tr '\n' ' ') $(ls /etc/nginx/sites-enabled 2>/dev/null | tr '\n' ' ')"
echo "NOT: caddy kapsayıcı portları: $(docker port gesfin-caddy 2>/dev/null | tr '\n' ' ')"
echo "NOT: https IP: $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 https://$IP/) · http IP Server: $(curl -sI --max-time 10 http://$IP/ | grep -i '^server' | tr -d '\r')"
