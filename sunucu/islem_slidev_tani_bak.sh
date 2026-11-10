#!/bin/bash
# Salt okunur tanı: Slidev kapsayıcısı neden durdu
echo "NOT: tüm kapsayıcılar: $(docker ps -a --format '{{.Names}}:{{.Status}}' | tr '\n' ' ' | cut -c1-600)"
echo "NOT: olaylar: $(docker events --since 60m --until 0s --filter container=slidev-tampon --format '{{.Time}} {{.Action}}' 2>&1 | tr '\n' ';' | cut -c1-500)"
echo "NOT: oom: $(dmesg 2>/dev/null | grep -i -E 'oom|killed process' | tail -3 | tr '\n' ';')"
echo "NOT: sonuc: $(ls -la --time-style=+%H:%M /opt/tampon/slidev/proje/ | tr '\n' ';' | cut -c1-700)"
tail -5 /opt/tampon/slidev/proje/npm.log 2>/dev/null | sed 's/^/NOT: npm: /'
echo "NOT: bellek: $(free -m | awk '/Mem/{print $2" toplam, "$7" kullanılabilir MB"}')"
echo "NOT: zamanlı işler: $(crontab -l 2>/dev/null | grep -i docker | head -3 | tr '\n' ';') $(grep -rl 'docker' /etc/cron* 2>/dev/null | tr '\n' ' ')"
exit 0
