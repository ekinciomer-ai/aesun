#!/bin/bash
# Salt okunur: kasadaki TÜM kayıtların yalnız adlarını ve tarihlerini listeler (değer okunmaz).
set -u
D=$(docker volume inspect aesun_aesun_veri --format '{{.Mountpoint}}' 2>/dev/null)/kasa
ls -lt --time-style=+%Y-%m-%d_%H:%M "$D"/*.sifreli 2>/dev/null | awk '{print "NOT: KASA",$6,$7}' | sed "s#$D/##;s#.sifreli##"
ls -lt --time-style=+%Y-%m-%d_%H:%M "$D"/arsiv/ 2>/dev/null | head -6 | awk 'NF>5{print "NOT: ARSIV",$6,$7}'
