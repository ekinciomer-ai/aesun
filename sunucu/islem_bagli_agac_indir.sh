#!/bin/bash
# BTA: Sketchfab'dan iç mekân, araç ve insan modellerini indirir (yalnız indirilebilir ve lisansı uygun olanlar). Lisans bilgisi kaynakca.json'a yazılır.
# Not: 'free-st' (Sketchfab Free Standard) modeller yalnız render/video içindir; web sayfasında ham dosya olarak sunulmaz.
set -uo pipefail
M=/opt/tampon/bagli/modeller; mkdir -p $M; [ -f $M/kaynakca.json ] || echo "[]" > $M/kaynakca.json
K=$(/opt/aesun/kasa_coz.sh sketchfab_api 2>/dev/null) || { echo "NOT: HATA anahtar yok"; exit 1; }
while read -r ad uid; do
  [ -z "$ad" ] && continue
  ls $M/$ad/*.gltf >/dev/null 2>&1 && { echo "NOT: $ad zaten var"; continue; }
  info=$(curl -s -H "Authorization: Token $K" https://api.sketchfab.com/v3/models/$uid)
  lic=$(echo "$info" | python3 -c "import json,sys;print((json.load(sys.stdin).get('license') or {}).get('slug',''))")
  case "$lic" in by|by-sa|cc0|free-st) ;; *) echo "NOT: $ad atlandı (lisans '$lic')"; continue;; esac
  url=$(curl -s -H "Authorization: Token $K" https://api.sketchfab.com/v3/models/$uid/download | python3 -c "import json,sys;print(json.load(sys.stdin).get('gltf',{}).get('url',''))")
  [ -n "$url" ] || { echo "NOT: $ad indirme adresi yok"; continue; }
  rm -rf $M/$ad && mkdir -p $M/$ad && curl -s -L --max-time 900 -o $M/$ad.zip "$url" && unzip -q -o $M/$ad.zip -d $M/$ad && rm -f $M/$ad.zip
  echo "$info" | python3 -c "
import json,sys;d=json.load(sys.stdin);f='$M/kaynakca.json';k=[x for x in json.load(open(f)) if x['ad']!='$ad']
k.append({'ad':'$ad','model':d.get('name'),'yazar':d['user']['displayName'] or d['user']['username'],'kullanici':d['user']['username'],'lisans':(d.get('license') or {}).get('label'),'lisans_kodu':(d.get('license') or {}).get('slug'),'web_icin_uygun':(d.get('license') or {}).get('slug') in ('by','by-sa','cc0'),'adres':d.get('viewerUrl')})
json.dump(k,open(f,'w'),ensure_ascii=False,indent=1)"
  echo "NOT: $ad indirildi ($(du -sh $M/$ad | cut -f1), lisans $lic)"
done <<'L'
agac_genel d989c0f801d847b9a74992ec4ddcfdfc
agac_cam d45218a3fab349e5b1de040f29e7b6f9
agac_kavak ec7c1d301bbc43dca5fe5f0650148d13
agac_sari_cam 422b961ff3d14e7baa7e9077572b2247
L
rm -rf $M/loft17 $M/ic14 $M/arac_* $M/insan_* 2>/dev/null; du -sh $M | sed 's/^/NOT: toplam /'
