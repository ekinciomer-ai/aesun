#!/bin/bash
# Depodaki bir dosyayı Topview'in verdiği geçici (1 saatlik) yükleme adresine PUT eder.
# Girdi: sunucu/topview_yukle.txt -> 1. satır: depo içi dosya yolu, 2. satır: yükleme adresi
set -e
cd /tmp/aesun_paket
DOSYA=$(sed -n 1p sunucu/topview_yukle.txt)
ADRES=$(sed -n 2p sunucu/topview_yukle.txt)
[ -f "$DOSYA" ] || { curl -sSL -m 60 -o /tmp/tv_yukle.bin "https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/$DOSYA"; DOSYA=/tmp/tv_yukle.bin; }
KOD=$(curl -sS -m 120 -X PUT -H "Content-Type: image/jpeg" --data-binary @"$DOSYA" "$ADRES" -o /dev/null -w "%{http_code}")
echo "NOT: topview_yukle $DOSYA http=$KOD"
[ "$KOD" = "200" ]
