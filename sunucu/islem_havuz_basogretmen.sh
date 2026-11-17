#!/bin/bash
# Başöğretmen (24 Kasım) havuza teslim.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
for k in AS_GT_BASOGRETMEN; do
  timeout 360 python3 /opt/aesun/havuz/yonetici.py teslim sunucu/havuz/teslim/$k.json 2>&1 | grep -E "NOT:|$k" | cut -c1-200 || echo "NOT: HATA $k zaman aşımı"
done
timeout 120 python3 /opt/aesun/havuz/yonetici.py planla 2>&1 | grep -E "TB_|PLAN" | head -12
