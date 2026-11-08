#!/bin/bash
# Salt okunur: kasadaki kayıt adları ve zamanları (değer yok).
ls -l --time-style=+%d.%m_%H:%M /var/lib/docker/volumes/aesun_aesun_veri/_data/kasa/*.sifreli 2>/dev/null | awk '{print $6"="$7}' | sed 's#.*/##' | tr '\n' ' ' | sed 's/^/NOT: kasa kayıtları: /'; echo
