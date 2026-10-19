#!/bin/bash
# Şef kurulumu (20 Eki): sef.py + tetik destekli zamanlayıcı + bekçiye bağlama. Bir tur çalıştırıp sonucu gösterir.
set -euo pipefail
cp -r sunucu/aesun/. /opt/aesun/ && chmod 700 /opt/aesun/bekci.sh /opt/aesun/sef.py
cd /opt/aesun && docker compose build -q isler && docker compose up -d --no-deps isler >/dev/null 2>&1
sleep 20
echo "NOT: isler: $(docker inspect -f '{{.State.Status}} {{.State.StartedAt}}' aesun-isler) · tetik: $(docker exec aesun-isler grep -c TETIK zamanlayici.py)"
touch /opt/aesun/.sef_gh_simdi
echo "NOT: şef turu: $(timeout 600 python3 /opt/aesun/sef.py 2>&1 | tail -2 | tr '\n' ' ')"
python3 -c "
import json;d=json.load(open('/opt/aesun/sef_durum.json'))
print('NOT: gözlem:', json.dumps(d.get('gozlem'),ensure_ascii=False)[:600])
print('NOT: eylemler:', json.dumps(d.get('eylemler'),ensure_ascii=False)[:600])
print('NOT: açık:', json.dumps(d.get('acik'),ensure_ascii=False)[:700])"
echo "NOT: depoda sef.json: $(docker exec aesun-isler git -C /veri/epias-ptf log -1 --format='%ci %s' -- n8n/sef.json)"
