#!/bin/bash
# Tablo Serisi 4 video (Sütçü Kız geri çizdik, Elçiler, Medusa'nın Salı, Anatomi Dersi) havuza teslim; her biri en çok 6 dk.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
for k in AS_TB_SUTCU_CIZDIK AS_TB_ELCILER AS_TB_MEDUSA AS_TB_TULP; do
  timeout 360 python3 /opt/aesun/havuz/yonetici.py teslim sunucu/havuz/teslim/$k.json 2>&1 | grep -E "NOT:|$k" | cut -c1-200 || echo "NOT: HATA $k zaman aşımı"
done
timeout 120 python3 /opt/aesun/havuz/yonetici.py planla 2>&1 | grep -E "TB_|PLAN" | head -12
