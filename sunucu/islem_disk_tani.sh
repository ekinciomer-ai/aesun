#!/bin/bash
# Salt okunur disk teşhisi: diski en çok dolduran klasörleri listeler. Hiçbir şey silmez.
set -u
echo "NOT: disk: $(df -h / | tail -1 | awk '{print "toplam "$2", kullanılan "$3", boş "$4", dolu "$5}')"
for d in / /opt /var /var/lib/docker /var/yedek /tmp /root /home /var/log; do
  [ -d "$d" ] || continue
  timeout 240 du -xh --max-depth=1 "$d" 2>/dev/null | sort -rh | head -8 | awk -v D="$d" '{printf "NOT: [%s] %s %s\n", D, $1, $2}'
done
echo "NOT: docker özet: $(timeout 120 docker system df --format '{{.Type}} {{.Size}} geri_kazanilabilir {{.Reclaimable}}' 2>/dev/null | tr '\n' ';')"
echo "NOT: en büyük 10 dosya: $(timeout 240 find / -xdev -type f -size +1G -printf '%s %p\n' 2>/dev/null | sort -rn | head -10 | awk '{printf "%.1fG %s; ", $1/1073741824, $2}')"
echo "NOT: journal: $(journalctl --disk-usage 2>/dev/null | grep -o '[0-9.]*[GM]')"
exit 0
