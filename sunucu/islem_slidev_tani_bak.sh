#!/bin/bash
# Salt okunur tanı: Slidev tampon durumu
echo "NOT: klasör: $(ls /opt/tampon/slidev 2>&1 | tr '\n' ' ')"
echo "NOT: proje: $(ls /opt/tampon/slidev/proje 2>&1 | tr '\n' ' ')"
echo "NOT: süreç: $(pgrep -af 'is.sh|slidev' | head -3 | tr '\n' ';')"
echo "NOT: docker: $(docker ps --format '{{.Names}} {{.Status}}' | grep -i slidev)"
echo "NOT: imaj: $(docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}' | grep playwright)"
for f in sonuc.txt proje/npm.log proje/build.log; do [ -f /opt/tampon/slidev/$f ] && tail -6 /opt/tampon/slidev/$f | sed "s|^|NOT: $f: |"; done
echo "NOT: disk: $(df -h /opt | tail -1 | awk '{print $4}') boş"
exit 0
