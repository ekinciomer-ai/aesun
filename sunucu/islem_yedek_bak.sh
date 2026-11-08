#!/bin/bash
# Salt okunur: sunucudaki yedekleme durumu. Hiçbir şeyi değiştirmez, sır yazdırmaz.
t() { tr '\n' ' ' | sed 's/  */ /g'; }
echo "NOT: Y1 araçlar: restic=$(command -v restic || echo yok) rclone=$(command -v rclone || echo yok) borg=$(command -v borg || echo yok) pg_dump=$(command -v pg_dump || echo yok)"
echo "NOT: Y2 zamanlanmış işler: cron=[$(crontab -l 2>/dev/null | grep -v '^#' | cut -c1-90 | t)] timers=[$(systemctl list-timers --no-legend 2>/dev/null | awk '{print $(NF-1)}' | t)]"
echo "NOT: Y3 yedek izi: $(ls -d /opt/*/yedek* /opt/*/backup* /var/backups/* /root/yedek* /root/backup* 2>/dev/null | head -20 | t)"
echo "NOT: Y4 veritabanı kapsayıcıları: $(docker ps --format '{{.Names}}|{{.Image}}' | grep -iE 'postgres|mysql|maria|mongo|redis|sqlite' | t)"
echo "NOT: Y5 sqlite dosyaları: $(find /opt /var/lib/docker/volumes -name '*.db' -o -name '*.sqlite*' 2>/dev/null | grep -v node_modules | head -25 | while read f; do echo "$f=$(du -h "$f" | cut -f1)"; done | t)"
echo "NOT: Y6 veri boyutları: $(du -sh /opt/* /var/lib/docker/volumes 2>/dev/null | awk '{print $2"="$1}' | t)"
echo "NOT: Y7 compose klasörleri: $(docker ps -a --format '{{.Label "com.docker.compose.project.working_dir"}}' | sort -u | t)"
echo "NOT: Y8 disk: $(df -h / | tail -1 | awk '{print "boş "$4" / "$2}') · sağlayıcı: $(cat /sys/class/dmi/id/sys_vendor 2>/dev/null) $(cat /sys/class/dmi/id/product_name 2>/dev/null)"
echo "NOT: Y9 sır klasörleri (yalnız ad): $(ls /opt/aesun/sir /opt/aesun/youtube 2>/dev/null | t)"
