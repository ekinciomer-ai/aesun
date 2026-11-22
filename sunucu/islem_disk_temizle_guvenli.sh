#!/bin/bash
# Ömer onayı (22.11.2026): disk %100 dolu → güvenli temizlik.
# Yalnız: Docker derleme önbelleği, isimsiz (dangling) imajlar, sistem günlüğünü 500 MB'a indirme.
# DOKUNMAZ: çalışan/etiketli imajlar, kapsayıcılar, birimler (volumes), /opt, /var/yedek, veritabanları.
set -u
once=$(df -B1 / | tail -1 | awk '{print $4}')
echo "NOT: önce boş: $(df -h / | tail -1 | awk '{print $4" (dolu "$5")"}')"
echo "NOT: derleme önbelleği: $(timeout 1200 docker builder prune -f 2>&1 | tail -1)"
echo "NOT: isimsiz imajlar: $(timeout 1200 docker image prune -f 2>&1 | tail -1)"
echo "NOT: günlük: $(journalctl --vacuum-size=500M 2>&1 | tail -1)"
sonra=$(df -B1 / | tail -1 | awk '{print $4}')
echo "NOT: sonra boş: $(df -h / | tail -1 | awk '{print $4" (dolu "$5")"}') · kazanılan $(( (sonra-once)/1073741824 )) GB"
exit 0
