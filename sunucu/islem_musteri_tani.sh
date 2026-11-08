#!/bin/bash
# Salt okunur: aesun-musteri kapsayıcısının çökme nedeni.
t() { tr '\n' ' ' | sed 's/  */ /g'; }
echo "NOT: M1 başlangıç: $(docker inspect -f '{{.State.StartedAt}} çıkış={{.State.ExitCode}} oom={{.State.OOMKilled}} bellek_sınırı={{.HostConfig.Memory}} cpu={{.HostConfig.NanoCpus}} restart={{.HostConfig.RestartPolicy.Name}}' aesun-musteri)"
echo "NOT: M2 son günlük: $(docker logs --tail 40 aesun-musteri 2>&1 | cut -c1-180 | grep -v '^\s*$' | tail -25 | t)"
echo "NOT: M3 hata türleri (24s): $(docker logs --since 24h aesun-musteri 2>&1 | grep -iE 'error|exception|traceback' | sed -E 's/[0-9]{2,}/N/g' | cut -c1-90 | sort | uniq -c | sort -rn | head -8 | t)"
echo "NOT: M4 kod: $(ls /opt/aesun/musteri 2>/dev/null | t) · compose: $(grep -n -A14 'musteri:' /opt/aesun/docker-compose.yml | grep -E 'build|command|mem_limit|cpus|restart' | t)"
echo "NOT: M5 santraller: $(python3 -c "import json;d=json.load(open('/var/lib/docker/volumes/aesun_aesun_musteri/_data/santraller.json'));print(len(d), list(d)[:8])" 2>&1 | cut -c1-300)"
echo "NOT: M6 son veri: $(ls -lt --time-style=+%m-%d_%H:%M /var/lib/docker/volumes/aesun_aesun_musteri/_data/*/son.json 2>/dev/null | head -6 | awk '{print $6" "$7}' | sed 's#/var/lib/docker/volumes/aesun_aesun_musteri/_data/##' | t)"
