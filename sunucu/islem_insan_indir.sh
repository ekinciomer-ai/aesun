#!/bin/bash
# Tampon: MakeHuman CC0 sistem varlık paketini indirir, /opt/tampon/disari'ya koyar (iş akışı geri getirir). Başka sisteme dokunmaz.
set -u
T=/opt/tampon/insan; mkdir -p $T /opt/tampon/disari; cd $T
B=https://static.makehumancommunity.org/assets/assetpacks
curl -sL -m 60 $B/makehuman_system_assets.html -o sys.html; echo "NOT: sayfa $(wc -c < sys.html) bayt"
grep -oiE 'href="[^"]+"' sys.html | sed 's/href="//;s/"$//' | grep -iE '\.zip' | sort -u > zips.txt
sed 's/^/NOT: ZIP /' zips.txt | head -10
n=0
while read -r z; do case "$z" in http*) u="$z";; /*) u="https://static.makehumancommunity.org$z";; *) u="$B/$z";; esac
  f=$(basename "${z%%\?*}"); curl -sL -m 1200 "$u" -o "$f"; echo "NOT: indirildi $f $(du -h "$f" | cut -f1)"; n=$((n+1)); [ $n -ge 2 ] && break
done < zips.txt
ls *.zip >/dev/null 2>&1 && tar czf /opt/tampon/disari/insan_varlik.tgz *.zip zips.txt && echo "NOT: paket $(du -h /opt/tampon/disari/insan_varlik.tgz | cut -f1)"
