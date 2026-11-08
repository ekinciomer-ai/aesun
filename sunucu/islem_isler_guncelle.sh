#!/bin/bash
# isler (zamanlayıcı) ve bekçiyi günceller: sunucu/aesun → /opt/aesun, isler kapsayıcısını yeniden kurar.
set -euo pipefail
cp -r sunucu/aesun/. /opt/aesun/ && chmod 700 /opt/aesun/bekci.sh
cd /opt/aesun && docker compose build -q isler && docker compose up -d --no-deps isler >/dev/null 2>&1
sleep 5
echo "NOT: isler: $(docker inspect -f '{{.State.Status}} {{.State.StartedAt}}' aesun-isler)"
echo "NOT: iş listesi: $(docker exec aesun-isler python -c "import zamanlayici as z;print([i[0] for i in z.ISLER])")"
