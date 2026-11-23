#!/usr/bin/env bash
set -euo pipefail
mkdir -p /opt/aesun/havuz/gelen /opt/aesun/havuz/teslim
for K in YR_KK_13_EVDEN_YEMEK YR_KK_14_SIFIR_ARAC YR_KK_15_RISKLI_YAPI; do
  cp -f "sunucu/havuz/gelen/${K}.mp4" "/opt/aesun/havuz/gelen/${K}.mp4"
  cp -f "sunucu/havuz/teslim/${K}.json" "/opt/aesun/havuz/teslim/${K}.json"
  echo "NOT: teslim -> ${K}"
  python3 /opt/aesun/havuz/yonetici.py teslim "/opt/aesun/havuz/teslim/${K}.json"
done
echo "NOT: planlama basliyor"
python3 /opt/aesun/havuz/yonetici.py planla
python3 - <<'PY'
import json
d = json.load(open('/opt/aesun/havuz/havuz.json', encoding='utf-8'))
items = d.get('is', d) if isinstance(d, dict) else d
if isinstance(items, dict):
    rows = list(items.values())
else:
    rows = items
yr = [r for r in rows if isinstance(r, dict) and r.get('kanal') == 'YR']
yr.sort(key=lambda r: (r.get('plan') or '9999', r.get('kod') or ''))
for r in yr:
    kk = r.get('kalite') or {}
    print(f"NOT: YR_ITEM {r.get('kod')} | {r.get('durum')} | {r.get('plan')} | engel={kk.get('engel')} | uyari={kk.get('uyari')}")
PY
