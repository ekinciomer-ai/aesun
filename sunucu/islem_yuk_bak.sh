#!/bin/bash
# Salt okuma: sunucu yükünün kaynağı (son saatlerde yük ani artışı) ve konteyner DNS hataları.
echo "NOT: yük şimdi: $(cut -d' ' -f1-3 /proc/loadavg) · çekirdek $(nproc)"
echo "NOT: en çok CPU süresi (toplam): $(ps -eo time,etime,comm --sort=-time | sed -n 2,12p | tr -s ' ' | tr '\n' ';')"
echo "NOT: D durumunda (diske takılı) süreç: $(ps -eo stat,comm | awk '$1 ~ /^D/' | sort | uniq -c | head -8 | tr -s ' ' | tr '\n' ';')"
echo "NOT: ffmpeg/chromium/whisper sayısı: ffmpeg=$(pgrep -c ffmpeg) chromium=$(pgrep -c chrom) python=$(pgrep -c python) node=$(pgrep -c node)"
echo "NOT: disk G/Ç: $(cat /proc/pressure/io 2>/dev/null | tr '\n' ' ') · CPU baskı: $(head -1 /proc/pressure/cpu 2>/dev/null)"
echo "NOT: bellek baskı: $(head -1 /proc/pressure/memory 2>/dev/null) · OOM (24 sa): $(journalctl -k --since -24h 2>/dev/null | grep -ci 'out of memory')"
echo "NOT: konteyner CPU sınırı olmayanlar: $(for c in $(docker ps -q); do n=$(docker inspect -f '{{.Name}} {{.HostConfig.NanoCpus}}' $c); case "$n" in *' 0') echo -n "${n% 0} ";; esac; done)"
echo "NOT: caddy DNS hatası (2 sa): $(for c in $(docker ps --format '{{.Names}}' | grep -i caddy); do echo -n "$c=$(docker logs --since 2h $c 2>&1 | grep -c 'i/o timeout') "; done)"
echo "NOT: son 2 sa yeni başlayan/ölen konteyner: $(docker events --since 2h --until 0s --filter type=container --format '{{.Actor.Attributes.name}}:{{.Action}}' 2>/dev/null | grep -E 'start|die|oom' | sort | uniq -c | sort -rn | head -10 | tr -s ' ' | tr '\n' ';')"
echo "NOT: cron/zamanlayıcı 11:00-11:45 UTC: $(journalctl --since '11:00' --until '11:45' 2>/dev/null | grep -oE '(CRON|systemd)\[[0-9]+\]: .{0,60}' | sed 's/\[[0-9]*\]//' | sort | uniq -c | sort -rn | head -6 | tr -s ' ' | tr '\n' ';')"
