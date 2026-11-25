#!/bin/bash
# AVY: portal Özel Alan yetkilisini (oz_avy) kabul eden baslat.py'yi çalışan avy-servis kabına koyar.
# Önce yedek; sağlık kontrolü başarısızsa eski dosya geri konur. Önbellek ve çekimlere dokunmaz.
set -uo pipefail
KAYNAK_DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
D=/opt/tampon/aleph
Y="$D/baslat.py.yedek_$(date +%Y%m%d%H%M%S)"
docker ps --format '{{.Names}}' | grep -qx avy-servis || { echo "NOT: avy-servis çalışmıyor, işlem yapılmadı"; exit 0; }
docker cp avy-servis:/baslat.py "$Y" || { echo "NOT: HATA yedek alınamadı"; exit 1; }
echo "NOT: yedek $Y"
saglik() { for i in $(seq 1 15); do docker exec ck-caddy wget -qO- --header 'Host: 127.0.0.1:8100' http://avy-servis:8100/saglik >/dev/null 2>&1 && return 0; sleep 2; done; return 1; }
koy() { docker cp "$1" avy-servis:/baslat.py && docker exec -u 0 avy-servis chown 1500:1500 /baslat.py && docker restart avy-servis >/dev/null; }
cp "$KAYNAK_DIZIN/avy/baslat.py" "$D/baslat.py"
if koy "$D/baslat.py" && saglik; then
  echo "NOT: AVY güncellendi (Özel Alan yetkisi), sağlık tamam"
else
  echo "NOT: SAĞLIK BAŞARISIZ — geri alınıyor"
  cp "$Y" "$D/baslat.py"; koy "$Y"; saglik && echo "NOT: geri alındı" || echo "NOT: geri alma sonrası da sağlıksız!"
  exit 1
fi
