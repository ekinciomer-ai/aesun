#!/bin/bash
sed 's/^/NOT: /' /opt/tampon/upscayl/sonuc.txt 2>/dev/null || echo "NOT: sonuç dosyası yok"
