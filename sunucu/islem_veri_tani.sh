#!/bin/bash
# Salt okuma: n8n'in okuduğu köprü (cPanel veri.php → ns1 /v1/veri) neden yanıt vermiyor.
echo "NOT: köprü (anahtarsız): $(curl -s -o /dev/null -w '%{http_code} %{time_total}s' --max-time 40 'https://portal.aksarayenerji.net/api/veri.php?a=oku&yol=n8n/pi_nabiz.json')"
echo "NOT: ns1 /v1/veri (anahtarsız): $(curl -s -o /dev/null -w '%{http_code} %{time_total}s' --max-time 20 'https://api.aksarayenerji.net/v1/veri?a=oku&yol=n8n/pi_nabiz.json')"
echo "NOT: api günlüğü /v1/veri son 90 dk: $(docker logs --since 90m aesun-api 2>&1 | grep -E '/v1/veri|veri.php' | awk '{for(i=1;i<=NF;i++) if($i ~ /^[0-9]{3}$/) {print $i; break}}' | sort | uniq -c | tr '\n' ' ')"
echo "NOT: son 5 veri isteği: $(docker logs --since 90m aesun-api 2>&1 | grep -E '/v1/veri|veri.php' | tail -5 | cut -c1-140 | tr '\n' '|')"
echo "NOT: hata satırları: $(docker logs --since 90m aesun-api 2>&1 | grep -iE 'error|traceback|exception' | tail -3 | cut -c1-200 | tr '\n' '|')"
echo "NOT: depo pi_nabiz: $(docker exec aesun-api sh -c 'ls -la --time-style=+%H:%M /veri/depo/n8n/pi_nabiz.json 2>&1; ls /veri/depo/n8n | wc -l' | tr '\n' ' ')"
echo "NOT: fail2ban engelli (tüm kurallar): $(for j in sshd ssh-kalici recidive; do fail2ban-client status $j 2>/dev/null | grep 'Banned IP' | sed "s/.*list://;s/^/$j:/"; done | tr '\n' ' ' | cut -c1-400)"
echo "NOT: cPanel IP: $(getent hosts portal.aksarayenerji.net | awk '{print $1}')"
