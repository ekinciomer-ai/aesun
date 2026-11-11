#!/bin/bash
# Kozmos Lab · Midong filmi: seçilen CC-BY Sketchfab modellerini indirir, tampona Blender kurar, önizleme kareleri üretir.
# Yalnız /opt/tampon altına yazar; başka sisteme dokunmaz. Blender en çok 4 çekirdek ve düşük öncelikle çalışır.
set -uo pipefail
T=/opt/tampon/kozmos; M=$T/modeller; mkdir -p $M /opt/tampon/disari
K=$(/opt/aesun/kasa_coz.sh sketchfab_api 2>/dev/null) || { echo "NOT: HATA kasada sketchfab_api yok"; exit 1; }
cat > $M/secim.txt <<'L'
kazik_makinesi 997e8984809540e5b3e5ea693eb96983
mobil_vinc f18f83e1f952408cbaabe844fc59b723
kamyon 39195e554c7a41a2884186c10d5079c0
isci 14cb64770751479094e2ca07fb5e4793
trafo_merkezi fd01521490ec4cabba4c89d113fdde23
forklift 8ab650b3982243f8b661142de50f79c9
pikap 67beae18c3d24be68f9c8f0ec382d8e3
L
command -v unzip >/dev/null || { DEBIAN_FRONTEND=noninteractive apt-get -qq update >/dev/null; DEBIAN_FRONTEND=noninteractive apt-get -qq install -y unzip >/dev/null; }
echo "[]" > $M/kaynakca.json
while read -r ad uid; do
  [ -d "$M/$ad" ] && ls $M/$ad/*.gltf $M/$ad/**/*.gltf >/dev/null 2>&1 && { echo "NOT: $ad zaten var"; continue; }
  info=$(curl -s -H "Authorization: Token $K" https://api.sketchfab.com/v3/models/$uid)
  lic=$(echo "$info" | python3 -c "import json,sys;d=json.load(sys.stdin);print((d.get('license') or {}).get('slug',''))")
  case "$lic" in by|by-sa|cc0) ;; *) echo "NOT: $ad atlandı (lisans '$lic' ticari kullanıma uygun değil)"; continue;; esac
  url=$(curl -s -H "Authorization: Token $K" https://api.sketchfab.com/v3/models/$uid/download | python3 -c "import json,sys;d=json.load(sys.stdin);print(d.get('gltf',{}).get('url',''))")
  [ -n "$url" ] || { echo "NOT: $ad indirme adresi alınamadı"; continue; }
  rm -rf $M/$ad && mkdir -p $M/$ad
  curl -s -L --max-time 600 -o $M/$ad.zip "$url" && unzip -q -o $M/$ad.zip -d $M/$ad && rm -f $M/$ad.zip
  echo "$info" | python3 -c "
import json,sys;d=json.load(sys.stdin);f='$M/kaynakca.json';k=json.load(open(f))
k.append({'ad':'$ad','model':d.get('name'),'yazar':d['user']['displayName'] or d['user']['username'],'kullanici':d['user']['username'],'lisans':(d.get('license') or {}).get('label'),'adres':d.get('viewerUrl')})
json.dump(k,open(f,'w'),ensure_ascii=False,indent=1)"
  echo "NOT: $ad indirildi ($(du -sh $M/$ad | cut -f1), lisans $lic)"
done < $M/secim.txt
# Blender 4.5 LTS (GPL, ücretsiz) — tamponda
B=/opt/tampon/blender
if [ ! -x $B/blender ]; then
  V=4.5.0; curl -s -L --max-time 900 -o /tmp/bl.tar.xz https://download.blender.org/release/Blender4.5/blender-$V-linux-x64.tar.xz || { echo "NOT: HATA Blender indirilemedi"; exit 1; }
  mkdir -p $B && tar xf /tmp/bl.tar.xz -C $B --strip-components=1 && rm -f /tmp/bl.tar.xz
  for p in libxi6 libxxf86vm1 libxfixes3 libxrender1 libgl1 libxkbcommon0 libsm6 libice6; do dpkg -s $p >/dev/null 2>&1 || NEED="${NEED:-} $p"; done
  [ -n "${NEED:-}" ] && DEBIAN_FRONTEND=noninteractive apt-get -qq install -y $NEED >/dev/null
fi
echo "NOT: $($B/blender --version 2>/dev/null | head -1)"
cp sunucu/kozmos/model_onizle.py $T/
rm -rf $T/onizleme
timeout 1500 nice -n 19 taskset -c 0-3 $B/blender -b --python-exit-code 1 -P $T/model_onizle.py -- $M $T/onizleme > $T/onizleme.log 2>&1 || { tail -5 $T/onizleme.log | sed 's/^/NOT: /'; }
cp $M/kaynakca.json $T/onizleme/ 2>/dev/null
python3 -c "import json;r=json.load(open('$T/onizleme/olcu.json'));[print('NOT:',k,v if isinstance(v,str) else (v['olcu_m'],v['yuz'],'yüz')) for k,v in r.items()]" 2>/dev/null
tar czf /opt/tampon/disari/kozmos_modeller.tgz -C $T onizleme && echo "NOT: önizlemeler paketlendi"
