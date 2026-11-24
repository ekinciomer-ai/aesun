#!/bin/bash
# Salt okunur: kasadaki kayıtların yalnız ADLARINI ve tarihlerini listeler (değer okunmaz/çözülmez).
set -u
D=$(docker volume inspect aesun_aesun_veri --format '{{.Mountpoint}}' 2>/dev/null)/kasa
ls -l --time-style=+%Y-%m-%d_%H:%M "$D"/*.sifreli 2>/dev/null | awk '{print "NOT: KASA",$6,$7}' | sed "s#$D/##;s#.sifreli##" | grep -i -E "gemini|google|tts|api" 
echo "NOT: toplam kayıt $(ls "$D"/*.sifreli 2>/dev/null | wc -l)"
