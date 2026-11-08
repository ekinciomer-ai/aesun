#!/bin/bash
# Salt okunur: sunucu kimliği ve tampon bölge durumu
echo "NOT: sunucu $(hostname) · $(hostname -I | awk '{print $1}')"
echo "NOT: disk boş $(df -h / | awk 'NR==2{print $4}') · bellek boş $(free -h | awk '/Mem/{print $7}')"
echo "NOT: python $(python3 --version 2>&1 | cut -d' ' -f2) · node $(node -v 2>/dev/null || echo yok) · docker $(docker --version 2>/dev/null | cut -d' ' -f3 | tr -d , || echo yok)"
ls -d /opt/tampon* 2>/dev/null | sed 's/^/NOT: tampon klasörü /' || echo "NOT: tampon klasörü yok"
ls /opt 2>/dev/null | tr '\n' ' ' | sed 's/^/NOT: \/opt: /'; echo
