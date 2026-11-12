#!/bin/bash
# BTA: Sketchfab'dan iç mekân, araç ve insan modellerini indirir (yalnız indirilebilir ve lisansı uygun olanlar). Lisans bilgisi kaynakca.json'a yazılır.
# Not: 'free-st' (Sketchfab Free Standard) modeller yalnız render/video içindir; web sayfasında ham dosya olarak sunulmaz.
set -uo pipefail
M=/opt/tampon/bta/modeller; mkdir -p $M; [ -f $M/kaynakca.json ] || echo "[]" > $M/kaynakca.json
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
arac_paket 20f9af9b8a404d5cb022ac6fe87f21f5
arac_kucuk 67c84e4d30ae42fda22c0a0c7526df26
arac_suv edc994ad28ed438cb365c0e0389ac177
insan_nathan 143a2b1ea5eb4385ae90a73657aca3bc
insan_sophia dc448c3be0e74f96a55fb475a13433cf
insan_eric a46bc9f67aaa415bb4f3241eef900e7f
insan_carla acf520f450d14dd799f98a6fede3edf5
insan_claudia c659bd0accab47c6bbe390cf822a2b92
L
du -sh $M | sed 's/^/NOT: toplam /'
