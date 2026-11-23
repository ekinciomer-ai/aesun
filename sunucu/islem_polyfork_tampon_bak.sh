#!/bin/bash
# Salt okunur: /opt/tampon/polyfork içindeki GLB'leri günlüğe base64 basar (gösterim sayfası için) + lisans özeti. Hiçbir şey değiştirmez.
D=/opt/tampon/polyfork; cd $D || { echo "NOT: HATA tampon yok"; exit 1; }
echo "NOT: lisans özeti: $(sed -e 's/<[^>]*>/ /g' lisans.html | tr -s ' \n' ' ' | grep -oiE '.{0,200}(commercial|attribution|redistribut).{0,200}' | head -3 | tr '\n' ' ' | cut -c1-900)"
for f in glb/*.glb; do n=$(basename $f .glb); base64 -w 8000 $f | sed "s/^/PFB64 $n /"; done
echo "NOT: $(ls glb | wc -l) model günlüğe aktarıldı"
