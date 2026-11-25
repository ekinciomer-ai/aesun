#!/bin/bash
# Tek seferde: 1) merkez API (Özel Alan yetkileri + teklif)  2) AVY yetki güncellemesi  3) Davalar geçici bağlantısı (bulenta)
# Her adım kendi yedeğini alır ve sağlık kontrolü başarısızsa kendini geri alır; biri başarısız olursa diğerleri yine denenir.
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
s=0
for b in api_guncelle avy_rol dava_gecici; do
  echo "NOT: ── $b başlıyor"
  bash "sunucu/islem_$b.sh" || { echo "NOT: $b BAŞARISIZ (kendi geri alması çalıştı)"; s=1; }
done
exit $s
