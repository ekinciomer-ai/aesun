#!/bin/bash
# Onaylı temizlik (Ömer 5 Kas 2026): çıkmış 3 kalıntı kapsayıcı, 7 günden eski kullanılmayan imajlar, eski derleme önbelleği.
# Veri birimlerine (volume) ve çalışan kapsayıcılara dokunulmaz. Önce ayrıntılar kayıt altına alınır.
set -uo pipefail
K=/var/yedek/temizlik_$(date +%Y%m%d_%H%M); mkdir -p $K
once=$(df -BG / | tail -1 | awk '{print $4}')
for c in elastic_swartz magical_liskov agrosev_wpcli; do
  docker inspect $c > $K/$c.json 2>/dev/null && [ "$(docker inspect -f '{{.State.Status}}' $c)" = exited ] && docker rm $c >/dev/null && echo "NOT: kaldırıldı: $c (ayrıntı $K/$c.json)"
done
docker images --format '{{.Repository}}:{{.Tag}} {{.ID}} {{.CreatedSince}} {{.Size}}' > $K/imajlar_once.txt
docker image prune -a -f --filter "until=168h" 2>&1 | tail -1 | sed 's/^/NOT: imaj temizliği: /'
docker builder prune -f --filter "until=168h" 2>&1 | tail -1 | sed 's/^/NOT: derleme önbelleği: /'
echo "NOT: boş disk: önce $once → sonra $(df -BG / | tail -1 | awk '{print $4}') · çalışan kapsayıcı: $(docker ps -q | wc -l)"
echo "NOT: sağlık: api $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.aksarayenerji.net/v1/saglik) · cutkoda $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://cutkoda.com/)"
