#!/bin/bash
# SALT OKUMA: aesun-isler zamanlayıcısının işleri ve son günlük satırları (sır içermez).
echo "NOT: kapsayıcı: $(docker inspect -f '{{.State.Status}} başladı {{.State.StartedAt}} yeniden {{.RestartCount}}' aesun-isler 2>&1)"
F=/opt/aesun/.isler_durum.json; [ -f $F ] || F=$(docker exec aesun-isler sh -c 'ls /app/durum.json /veri/durum.json 2>/dev/null | head -1')
docker exec aesun-isler sh -c 'cat durum.json 2>/dev/null || cat /app/durum.json 2>/dev/null' | python3 -c '
import sys,json
try: d=json.load(sys.stdin)
except Exception as e: print("NOT: durum okunamadı", e); sys.exit()
for k,v in (d.get("isler") or d).items():
    if isinstance(v,dict): print("NOT: iş", k, "son", v.get("son"), "kod", v.get("son_kod"), "süre", v.get("sure_sn"), str(v.get("hata") or "")[:160])
'
echo "NOT: günlük (son 40, uyarı/hata): $(docker logs --since 5h aesun-isler 2>&1 | grep -iv 'ok\b' | tail -40 | cut -c1-200 | tr '\n' '|' | cut -c1-3500)"
echo "NOT: bekçi onarım günlüğü: $(tail -8 /opt/aesun/bekci.log 2>/dev/null | cut -c1-200 | tr '\n' '|')"
echo "NOT: disk: $(df -h / | tail -1 | awk '{print $5" dolu, "$4" boş"}') · bellek: $(free -m | awk '/Mem/{print $3"/"$2" MB"}') · yük: $(cut -d' ' -f1-3 /proc/loadavg)"
