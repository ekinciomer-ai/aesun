#!/usr/bin/env bash
set -euo pipefail
cd /opt/aesun/havuz
for K in YR_KK_13_EVDEN_YEMEK YR_KK_14_SIFIR_ARAC YR_KK_15_RISKLI_YAPI; do
  python3 yonetici.py teslim "/opt/aesun/havuz/teslim/${K}.json"
done
python3 yonetici.py planla --kanal YR
python3 yonetici.py liste --kanal YR
