#!/bin/bash
for u in '/api/veri.php?a=oku&yol=n8n/pi_nabiz.json' /api/portal.php /api/canli.php; do echo "NOT: $u → $(curl -s -o /tmp/b -w '%{http_code}' --max-time 20 "https://portal.aksarayenerji.net$u") · $(head -c 120 /tmp/b | tr '\n' ' ')"; done
