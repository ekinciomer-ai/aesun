#!/bin/bash
# Şefi hemen bir tur çalıştırır (GitHub kolu dahil) ve sonucunu gösterir. Kurulum yapmaz.
sleep 70   # isler yeni sır paketini çeksin (dakikada bir)
touch /opt/aesun/.sef_gh_simdi
echo "NOT: şef turu: $(timeout 600 python3 /opt/aesun/sef.py 2>&1 | tail -1)"
python3 -c "
import json;d=json.load(open('/opt/aesun/sef_durum.json'))
print('NOT: github:', json.dumps((d.get('github') or {}), ensure_ascii=False)[:700])
print('NOT: eylemler:', json.dumps(d.get('eylemler'),ensure_ascii=False)[:500])
print('NOT: açık:', json.dumps(d.get('acik'),ensure_ascii=False)[:500])"
