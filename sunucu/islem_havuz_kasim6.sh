#!/bin/bash
# Kasım6: zehirli güzellik ×2 + ölüm tabloları ×3 havuza teslim; her biri en çok 6 dk.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
for k in AS_TM_KURSUN AS_TM_ARSENIK AS_TB_MARAT AS_TB_OLULER_ADASI AS_TB_OLUMUN_ZAFERI; do
  timeout 360 python3 /opt/aesun/havuz/yonetici.py teslim sunucu/havuz/teslim/$k.json 2>&1 | grep -E "NOT:|$k" | cut -c1-200 || echo "NOT: HATA $k zaman aşımı"
done
timeout 120 python3 /opt/aesun/havuz/yonetici.py planla 2>&1 | grep -E "KURSUN|ARSENIK|MARAT|OLULER|ZAFERI|BASOGRETMEN|PLAN" | head -12
