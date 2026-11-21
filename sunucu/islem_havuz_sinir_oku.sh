#!/bin/bash
# Yükleme Yöneticisi: yayın sınırları ve Kara Kutu kuyruğunu okur (değiştirmez).
echo "== sinirlar.json =="; cat /opt/aesun/havuz/sinirlar.json 2>/dev/null || echo "(yok)"
echo "== KK plan =="; python3 - <<'PY'
import json
try:
  p=json.load(open('/opt/aesun/havuz/plan.json'))
  for k,v in (p.items() if isinstance(p,dict) else enumerate(p)):
    s=json.dumps(v,ensure_ascii=False)
    if 'KK_' in s or 'KK_' in str(k): print(k, s[:300])
except Exception as e: print('plan okunamadi',e)
PY
