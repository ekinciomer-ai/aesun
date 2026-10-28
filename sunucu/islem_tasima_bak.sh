#!/bin/bash
# Salt okunur: taşıma kopyasının ns1 tarafındaki ilerlemesi
echo "NOT: geçici imaj dosyaları: $(ls -la /var/tmp/tasima 2>/dev/null | awk 'NR>3{print $9"="int($5/1048576)"MB"}' | tr '\n' ' ')"
echo "NOT: süren aktarım: $(ps -eo etimes,args | grep -E 'rsync --server|docker save|gzip -1' | grep -v grep | cut -c1-140 | tr '\n' ';')"
echo "NOT: yük: $(cat /proc/loadavg) · bellek boş $(free -m | awk '/Mem/{print $7}') MB · disk $(df -h / | awk 'NR==2{print $5}')"
