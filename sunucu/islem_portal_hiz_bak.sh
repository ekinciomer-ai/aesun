#!/bin/bash
# Salt okuma: portal girişinde kullanılan uçların yanıt süreleri ve sunucu yükü (giriş yavaşlığı teşhisi).
z() { curl -s -o /dev/null -w "%{http_code} dns=%{time_namelookup} bag=%{time_connect} tls=%{time_appconnect} ilk=%{time_starttransfer} top=%{time_total} boy=%{size_download}" --max-time 30 "$1"; }
echo "NOT: yük: $(uptime | sed 's/.*load/load/') · çekirdek $(nproc)"
echo "NOT: bellek: $(free -m | awk 'NR==2{print "kullanılan "$3"/"$2" MB, boş "$7" MB"} NR==3{print "swap "$3"/"$2" MB"}' | tr '\n' ' ')"
echo "NOT: disk: $(df -h / | tail -1 | awk '{print $3"/"$2" (%"$5")"}' | tr -d '%')"
echo "NOT: en çok CPU: $(docker stats --no-stream --format '{{.Name}} {{.CPUPerc}} {{.MemUsage}}' 2>/dev/null | sort -k2 -t' ' -rn | head -8 | tr '\n' ';')"
echo "NOT: en çok CPU süreç: $(ps -eo pcpu,pmem,comm --sort=-pcpu | sed -n 2,7p | tr -s ' ' | tr '\n' ';')"
for i in 1 2 3; do
  echo "NOT: [$i] portal ana: $(z "https://portal.aksarayenerji.net/?t=$RANDOM")"
  echo "NOT: [$i] veri.json (giriş): $(z "https://api.aksarayenerji.net/v1/acik/portal/veri.json?t=$RANDOM")"
  echo "NOT: [$i] api sağlık: $(z "https://api.aksarayenerji.net/v1/saglik?t=$RANDOM")"
done
echo "NOT: yerel api (caddy'siz): $(curl -s -o /dev/null -w '%{http_code} top=%{time_total}' --max-time 30 http://127.0.0.1:$(docker port aesun-api 2>/dev/null | head -1 | sed 's/.*://')/v1/acik/portal/veri.json 2>/dev/null)"
echo "NOT: aesun-api yeniden başlama: $(docker inspect -f '{{.RestartCount}} başlama={{.State.StartedAt}} durum={{.State.Status}}' aesun-api 2>/dev/null)"
echo "NOT: aesun-api son hatalar: $(docker logs --since 2h aesun-api 2>&1 | grep -iE 'error|exception|timeout|traceback' | tail -5 | cut -c1-160 | tr '\n' ';')"
echo "NOT: aesun-api yavaş istekler (2 sa): $(docker logs --since 2h aesun-api 2>&1 | grep -c ' 50[0-9] ') adet 5xx"
C=$(docker ps --format '{{.Names}}' | grep -iE 'caddy' | head -1)
echo "NOT: caddy ($C) son hatalar: $(docker logs --since 2h $C 2>&1 | grep -iE '"level":"error"|timeout|dial' | tail -5 | cut -c1-200 | tr '\n' ';')"
echo "NOT: TLS sertifika bitiş: $(echo | timeout 10 openssl s_client -servername portal.aksarayenerji.net -connect portal.aksarayenerji.net:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null)"
echo "NOT: DNS portal: $(getent hosts portal.aksarayenerji.net | awk '{print $1}' | tr '\n' ' ') · api: $(getent hosts api.aksarayenerji.net | awk '{print $1}' | tr '\n' ' ')"
