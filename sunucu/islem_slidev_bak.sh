#!/bin/bash
# Salt okunur: Slidev tampon sonucu (bitmiş paketler iş akışıyla geri gelir)
sed 's/^/NOT: /' /opt/tampon/slidev/proje/sonuc.txt 2>/dev/null | tail -20
echo "NOT: kapsayıcı: $(docker ps -a --filter name=slidev-tampon --format '{{.Status}}')"
echo "NOT: paket: $(ls /opt/tampon/disari 2>/dev/null | tr '\n' ' ')"
exit 0
