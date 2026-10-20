#!/bin/bash
# Şefi hemen bir tur çalıştırır (GitHub kolu dahil) ve sonucunu gösterir. Kurulum yapmaz.
sleep 5
timeout 600 python3 /opt/aesun/bekci_tarama.py | tail -1 | sed "s/^/NOT: tarama: /"; date +%s > /opt/aesun/.tarama_son
echo "NOT: API: $(curl -s --max-time 15 https://api.aksarayenerji.net/v1/saglik | cut -c1-160)"
touch /opt/aesun/.sef_gh_simdi
echo "NOT: şef turu: $(timeout 600 python3 /opt/aesun/sef.py 2>&1 | tail -1)"
python3 -c "
import json;d=json.load(open('/opt/aesun/sef_durum.json'))
print('NOT: github:', json.dumps((d.get('github') or {}), ensure_ascii=False)[:700])
print('NOT: eylemler:', json.dumps(d.get('eylemler'),ensure_ascii=False)[:500])
print('NOT: açık:', json.dumps(d.get('acik'),ensure_ascii=False)[:500])"
