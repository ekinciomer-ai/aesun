#!/bin/bash
# EÇED P.T.D. aktarımı öncesi salt okunur kontrol: site erişimi, Drive (rclone) bağlantısı, disk.
set -u
echo "NOT: disk: $(df -h / | tail -1 | awk '{print $3" dolu / "$2", boş "$4" ("$5")"}')"
echo "NOT: bellek: $(free -h | awk '/Mem/{print $7" boş"}')"
H=$(curl -sS -o /tmp/eced_t.html -w "%{http_code}" --max-time 30 https://eced.csb.gov.tr/jsp/ek1/61590 2>&1); echo "NOT: eced ek1 sayfası: $H, $(wc -c </tmp/eced_t.html 2>/dev/null) bayt, dosyaGoster: $(grep -c dosyaGoster /tmp/eced_t.html 2>/dev/null)"
U=$(grep -o "dosyaGoster[^']*" /tmp/eced_t.html | head -1)
[ -n "$U" ] && echo "NOT: pdf başlık: $(curl -sS -r 0-4 --max-time 60 "https://eced.csb.gov.tr/jsp/dosya/$U" 2>&1 | head -c 5)"
command -v rclone >/dev/null && echo "NOT: rclone var" || echo "NOT: rclone YOK"
C=/opt/aesun/drive/rclone.conf
if [ -f $C ]; then echo "NOT: rclone ayarı var"; echo "NOT: drive about: $(timeout 60 rclone --config $C about gdrive: 2>&1 | tr '\n' ' ' | head -c 300)"; echo "NOT: drive kök: $(timeout 60 rclone --config $C lsd gdrive: 2>&1 | awk '{print $NF}' | tr '\n' ' ' | head -c 300)"; else echo "NOT: rclone ayarı YOK"; fi
rm -f /tmp/eced_t.html
