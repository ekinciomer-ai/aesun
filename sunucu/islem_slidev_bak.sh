#!/bin/bash
# Salt okunur: Slidev tampon sonucu. Bittiyse çıktıları /opt/tampon/disari/slidev'e kopyalar (iş akışı bunları geri getirir).
D=/opt/tampon/slidev
sed 's/^/NOT: /' $D/sonuc.txt 2>/dev/null | tail -25 || echo "NOT: henüz sonuç yok"
if grep -q BITTI $D/sonuc.txt 2>/dev/null; then mkdir -p /opt/tampon/disari && tar czf /opt/tampon/disari/slidev.tgz -C $D/cikti . && echo "NOT: paket $(du -h /opt/tampon/disari/slidev.tgz | cut -f1)"; fi
