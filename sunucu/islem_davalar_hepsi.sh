#!/bin/bash
# Davalar: altyapı + API güncellemesi, ardından şifreli sunum paketinin yüklenmesi (tek sırada).
set -uo pipefail
bash sunucu/islem_davalar_kur.sh || { echo "NOT: HATA kurulum başarısız, yükleme yapılmadı"; exit 1; }
bash sunucu/islem_davalar_yukle.sh
