#!/bin/bash
# Tampon bölge: gerçekçi insan modeli (MakeHuman CC0) için keşif + indirme. Diğer sistemlere dokunmaz.
set -u
T=/opt/tampon/insan; mkdir -p $T; cd $T
echo "NOT: docker $(docker --version 2>&1 | head -c 60)"
echo "NOT: python $(python3 --version 2>&1)"
echo "NOT: disk $(df -h /opt | tail -1 | awk '{print $4}') bos"
curl -sL -m 60 https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html -o sys.html; echo "NOT: sayfa $(wc -c < sys.html) bayt"
grep -oiE 'href="[^"]+\.zip[^"]*"' sys.html | head -10 | sed 's/^/NOT: ZIP /'
grep -oiE 'https?://[^" ]+' sys.html | grep -iE 'zip|download|assetpack' | sort -u | head -15 | sed 's/^/NOT: URL /'
