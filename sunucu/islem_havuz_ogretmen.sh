#!/bin/bash
# Öğretmenler Günü: Başöğretmen Short'u havuza teslim + Ömer onayı (23.11 23:40, yayın 24.11 09:00) + YouTube kuyruğuna yönlendirme.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
Y=/opt/aesun/havuz/yonetici.py; K=AS_GT_BASOGRETMEN
timeout 360 python3 $Y teslim sunucu/havuz/teslim/$K.json 2>&1 | grep -E "NOT:" | cut -c1-240 || echo "NOT: HATA $K teslim zaman aşımı"
python3 $Y onay $K evet "Ömer 23.11 23:40: Öğretmenler Günü sabahı paylaşılsın" "2026-11-24T09:00+03:00" 2>&1 | grep -E "NOT:" | cut -c1-240
python3 $Y yonlendir 2>&1 | grep -E "NOT:|===|$K" | cut -c1-4000
python3 $Y durum --json 2>/dev/null | python3 -c "import json,sys;d=json.load(sys.stdin);print('NOT: DURUM', json.dumps(d.get('$K') or [x for x in (d if isinstance(d,list) else d.get('isler',[])) if isinstance(x,dict) and x.get('kod')=='$K'], ensure_ascii=False)[:300])" 2>/dev/null || true
