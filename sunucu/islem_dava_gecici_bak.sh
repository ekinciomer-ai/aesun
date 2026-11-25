#!/bin/bash
# Davalar geçici bağlantısının adresini ve durumunu gösterir.
P=$(cat /opt/dava_gecici/port 2>/dev/null); IP=$(curl -s4 --max-time 5 https://api.ipify.org)
echo "NOT: $(docker ps --filter name=dava-gecici --format '{{.Names}}: {{.Status}}')"
echo "NOT: ADRES https://$IP:$P/ · durum $(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 https://127.0.0.1:$P/)"
