#!/bin/bash
# Video rig'leri için API güncellemesi: /v1/rig/kayit (onay bekleyen kayıt) + rig anahtarlarını yalnız rig/ alanına sınırlama.
# Dağıtım islem_api_guncelle.sh ile (yedek, sağlık kontrolü, başarısızsa geri alma).
set -uo pipefail
cd /tmp/aesun_paket
bash sunucu/islem_api_guncelle.sh || exit 1
echo "NOT: kayıt ucu boş istek: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST https://api.aksarayenerji.net/v1/rig/kayit -d '{}') (400 beklenir)"
