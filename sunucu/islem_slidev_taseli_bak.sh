#!/bin/bash
# Salt okunur: Taşeli sunum üretim sonucu (çıktı paketi iş akışıyla geri gelir).
sed 's/^/NOT: /' /opt/tampon/slidev/sonuc_taseli.txt 2>/dev/null | tail -20 || echo "NOT: henüz sonuç yok"
