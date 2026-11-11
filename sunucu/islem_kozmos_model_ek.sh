#!/bin/bash
# Kozmos Lab · Midong: yanlış gelen 'trafo_merkezi' taramasını arşive alır, gerçek YG trafo merkezi modelini indirir.
set -uo pipefail
M=/opt/tampon/kozmos/modeller; A=/opt/tampon/kozmos/arsiv; mkdir -p $A
K=$(/opt/aesun/kasa_coz.sh sketchfab_api 2>/dev/null) || { echo "NOT: HATA anahtar yok"; exit 1; }
[ -d $M/trafo_merkezi ] && mv $M/trafo_merkezi $A/trafo_merkezi_tugla_bina_$(date +%Y%m%d%H%M) && echo "NOT: tuğla bina taraması arşive alındı"
ad=yg_trafo; uid=3148acbe83a14abd8c3bf5c3b4b3f57a
info=$(curl -s -H "Authorization: Token $K" https://api.sketchfab.com/v3/models/$uid)
lic=$(echo "$info" | python3 -c "import json,sys;print((json.load(sys.stdin).get('license') or {}).get('slug',''))")
case "$lic" in by|by-sa|cc0) ;; *) echo "NOT: lisans uygun değil: $lic"; exit 1;; esac
url=$(curl -s -H "Authorization: Token $K" https://api.sketchfab.com/v3/models/$uid/download | python3 -c "import json,sys;print(json.load(sys.stdin).get('gltf',{}).get('url',''))")
[ -n "$url" ] || { echo "NOT: indirme adresi alınamadı"; exit 1; }
rm -rf $M/$ad && mkdir -p $M/$ad && curl -s -L --max-time 900 -o $M/$ad.zip "$url" && unzip -q -o $M/$ad.zip -d $M/$ad && rm -f $M/$ad.zip
echo "$info" | python3 -c "
import json,sys;d=json.load(sys.stdin);f='$M/kaynakca.json';k=[x for x in json.load(open(f)) if x['ad'] not in ('trafo_merkezi','$ad')]
k.append({'ad':'$ad','model':d.get('name'),'yazar':d['user']['displayName'] or d['user']['username'],'kullanici':d['user']['username'],'lisans':(d.get('license') or {}).get('label'),'adres':d.get('viewerUrl')})
json.dump(k,open(f,'w'),ensure_ascii=False,indent=1)"
echo "NOT: $ad indirildi ($(du -sh $M/$ad | cut -f1))"; du -sh $M | sed 's/^/NOT: toplam /'
