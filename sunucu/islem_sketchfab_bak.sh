#!/bin/bash
# Sketchfab kısa bağlantılarını çözer, modelin lisansını, indirilebilirliğini ve yüz sayısını yazar (salt okuma).
set -uo pipefail
K=$(/opt/aesun/kasa_coz.sh sketchfab_api 2>/dev/null) || { echo "NOT: HATA anahtar yok"; exit 1; }
for kisa in https://sketchfab.com/3d-models/hause-6cdba7c5fc5d46109c371c8ce12ba398; do
  son="$kisa"
  uid=$(echo "$son" | grep -oE '[0-9a-f]{32}' | tail -1)
  echo "NOT: $kisa -> $son"
  [ -n "$uid" ] || continue
  curl -s -H "Authorization: Token $K" https://api.sketchfab.com/v3/models/$uid | python3 -c "
import json,sys;d=json.load(sys.stdin)
print('NOT: uid', d.get('uid'), '|', d.get('name'), '|', d['user']['username'], '| lisans', (d.get('license') or {}).get('slug'), '| indirilebilir', d.get('isDownloadable'), '|', d.get('faceCount'), 'yüz |', d.get('vertexCount'), 'nokta')
print('NOT: açıklama', (d.get('description') or '')[:300].replace(chr(10),' '))"
done
