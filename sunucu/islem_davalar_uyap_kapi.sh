#!/bin/bash
# UYAP doğrudan yükleme kapısı: şifreli parça klasörü + aesun-api güncellemesi (davalar.py /v1/davalar/uyap_yukle).
# Kapı yalnız geçici anahtarla ve süreyle açılır (anahtarın özeti davalar.py'de; anahtarın kendisi depoda yok).
set -uo pipefail
G=/opt/aesun/ozel/davalar/gelen
mkdir -p "$G" && chown 1001:1001 "$G" && chmod 700 "$G"
echo "NOT: gelen klasörü hazır ($(stat -c '%U:%G %a' "$G"))"
bash sunucu/islem_api_guncelle.sh || exit 1
echo "NOT: kapı yetkisiz deneme: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST 'https://api.aksarayenerji.net/v1/davalar/uyap_yukle?t=x&ad=deneme&p=0' -H 'Content-Type: text/plain' --data 'x') (401 beklenir)"
echo "NOT: dizin yetkisiz: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/davalar/dizin) (401 beklenir)"
