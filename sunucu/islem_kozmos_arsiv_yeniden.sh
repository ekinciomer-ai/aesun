#!/bin/bash
# Kozmos arşiv işini durdurur ve güncel kodla yeniden başlatır (kaldığı yerden devam eder, geçerli dosyalar korunur).
systemctl stop kozmos-arsiv 2>/dev/null && echo "NOT: çalışan iş durduruldu"
bash sunucu/islem_kozmos_arsiv.sh
