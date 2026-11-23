#!/bin/bash
# Salt okunur: Polyfork tampon test paketini (sayfa, liste, GLB, kapak) iş günlüğü üzerinden dışarı aktarır.
set -uo pipefail
cd /opt/tampon/polyfork || { echo "NOT: HATA tampon klasörü yok"; exit 1; }
tar czf - index.html liste.json modeller kapak | base64 -w 0 | fold -w 50000 | sed 's/^/PFB64:/'
echo
echo "NOT: aktarım bitti ($(tar czf - index.html liste.json modeller kapak | wc -c) bayt)"
