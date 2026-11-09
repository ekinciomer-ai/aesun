#!/bin/bash
# Sunucu yük koruması: 4 GB takas alanı + tarayıcı kapsayıcılarına CPU/bellek sınırı.
# Amaç: tarayıcı işleri (TikTok/YouTube/CutkodA) ne kadar yüklenirse yüklensin portal, gesfin ve diğer sistemler yavaşlamasın.
# Geri alma: /opt/aesun/yedek/kaynak_sinir_onceki.txt içindeki değerlerle `docker update`; takas için `swapoff /swapfile` + /etc/fstab satırı.
set -u
ONCEKI=/opt/aesun/yedek/kaynak_sinir_onceki.txt; mkdir -p /opt/aesun/yedek
echo "# $(date -Is)" >> $ONCEKI
# 1) Takas alanı
if swapon --show | grep -q .; then echo "NOT: takas zaten var: $(swapon --show --noheadings | tr -s ' ')";
else
  BOS=$(df --output=avail -BG / | tail -1 | tr -dc 0-9)
  if [ "${BOS:-0}" -lt 20 ]; then echo "NOT: diskte yer az (${BOS}G), takas eklenmedi";
  else
    fallocate -l 4G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile \
      && { grep -q '^/swapfile ' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab; } \
      && echo "NOT: 4 GB takas eklendi" || echo "NOT: takas eklenemedi"
  fi
fi
sysctl -q -w vm.swappiness=10 && { grep -q '^vm.swappiness' /etc/sysctl.conf && sed -i 's/^vm.swappiness.*/vm.swappiness=10/' /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf; }
echo "swappiness_onceki=$(cat /proc/sys/vm/swappiness)" >> $ONCEKI
# 2) Tarayıcı kapsayıcıları: CPU sınırı (yalnız sınırı olmayana), bellek sınırı (yalnız olmayana)
for c in $(docker ps --format '{{.Names}}' | grep -iE 'tarayici|chrom|browser|selkies'); do
  read nc mem < <(docker inspect -f '{{.HostConfig.NanoCpus}} {{.HostConfig.Memory}}' $c)
  echo "$c cpus_nano=$nc memory=$mem" >> $ONCEKI
  arg=()
  [ "$nc" = 0 ] && arg+=(--cpus 2)
  [ "$mem" = 0 ] && arg+=(--memory 3g --memory-swap 4g)
  if [ ${#arg[@]} -gt 0 ]; then docker update "${arg[@]}" $c >/dev/null && echo "NOT: $c sınırlandı: ${arg[*]}" || echo "NOT: $c güncellenemedi"
  else echo "NOT: $c zaten sınırlı (cpu=$((nc/1000000000)) bellek=$((mem/1048576))MB)"; fi
done
# 3) Sınırsız ve şu an çalışan geçici tarayıcı yardımcıları (isimsiz playwright kapsayıcıları)
for c in $(docker ps --format '{{.ID}} {{.Names}}' | awk '$2 !~ /-/ && $2 ~ /_/ {print $1}'); do
  n=$(docker inspect -f '{{.HostConfig.NanoCpus}} {{.Config.Image}}' $c); case "$n" in "0 "*) docker update --cpus 2 $c >/dev/null && echo "NOT: geçici kapsayıcı $c sınırlandı (${n#0 })";; esac
done
echo "NOT: sonuç: yük $(cut -d' ' -f1-3 /proc/loadavg) · $(free -m | awk 'NR==2{print "bellek "$3"/"$2" MB"} NR==3{print "takas "$3"/"$2" MB"}' | tr '\n' ' ')"
