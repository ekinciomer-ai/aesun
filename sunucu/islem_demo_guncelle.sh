#!/bin/bash
# Demo (https://IP, demo/demo) güncelle: yalnız aesun-api yeniden derlenir. Port 80 mirsoft_web'de olduğundan
# eski demo_kur'un eklediği http://IP bloğu varsa kaldırılır (yedek + doğrulama + geri alma). Diğer uygulamalara dokunulmaz.
set -euo pipefail
IP=185.22.184.51; CF=/opt/caddy/Caddyfile; C=gesfin-caddy; HEDEF=/etc/caddy/Caddyfile
cp -r sunucu/aesun/. /opt/aesun/
cd /opt/aesun && docker compose build -q api && docker compose up -d --no-deps api && cd - >/dev/null
if grep -q "^http://$IP {" $CF; then
  cp $CF $CF.yedek-$(date +%Y%m%d%H%M%S)
  python3 - "$CF" "$IP" <<'PY'
import re, sys
p, ip = sys.argv[1:3]; s = open(p).read()
s = re.sub(r"\n*http://" + re.escape(ip) + r" \{.*?\n\}\n?", "\n", s, flags=re.S)
open(p, "w").write(s.rstrip() + "\n")
PY
  if docker exec $C caddy validate --config $HEDEF --adapter caddyfile >/tmp/cv.txt 2>&1; then
    docker exec $C caddy reload --config $HEDEF --adapter caddyfile && echo "NOT: fazla http://IP bloğu kaldırıldı"
  else
    cp $(ls -t $CF.yedek-* | head -1) $CF; echo "NOT: doğrulama başarısız, geri alındı"; exit 1
  fi
fi
sleep 8
U=https://$IP
echo "NOT: şifresiz: $(curl -sk -o /dev/null -w '%{http_code}' --max-time 15 $U/) · yanlış: $(curl -sk -o /dev/null -w '%{http_code}' --max-time 15 -u demo:yanlis $U/)"
echo "NOT: demo sayfa: $(curl -sk -o /tmp/d.html -w '%{http_code}' --max-time 15 -u demo:demo $U/) · başlık: $(grep -o '<title>[^<]*' /tmp/d.html | cut -c8-) · saha şeması: $(grep -c 'sahaCiz' /tmp/d.html)"
echo "NOT: veri: $(curl -sk --max-time 15 -u demo:demo $U/veri.json | python3 -c 'import sys,json; d=json.load(sys.stdin); s=d.get("saha") or {}; print("saha", "var" if s else "YOK", "inv", len(s.get("inv") or []), "kabin", len(s.get("kabin") or {}), "durum_no", s.get("durum_no"))')"
echo "NOT: port 80 (mirsoft): $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://$IP/)"
