#!/bin/bash
# ns1'deki periyodik işleri başlatır (ETKIN=1). Geri almak için islem_isler_kapat.
set -euo pipefail
sed -i 's/^ETKIN=.*/ETKIN=1/' /opt/aesun/isler.env
cd /opt/aesun && docker compose up -d --force-recreate isler >/dev/null 2>&1
echo "NOT: işler etkin"
