#!/bin/bash
# Salt okunur: Patron mu Haklı? bölümlerinin havuz durumu ve yayın zamanı.
python3 - <<'PY'
import sys; sys.path.insert(0,'/opt/aesun/havuz'); import yonetici as y
for k,it in sorted(y.yukle().items()):
    if k.startswith(('KK_PI','KK_IS')):
        kt=it.get('kart',{}); print('NOT:',k,it.get('durum'),'· yayın',kt.get('yayin_zamani') or kt.get('plan_zamani'))
PY
