#!/bin/bash
# Sunucu yedeği (restic, şifreli, tekilleştirilmiş). Kurulum: islem_yedek_kur. Zamanlama: aesun-yedek.timer (her gece 03:30).
# Kullanım: yedekle.sh [etiket]   etiket: gece (varsayılan) | on_degisiklik | elle
set -uo pipefail
ETIKET=${1:-gece}
export RESTIC_REPOSITORY=/var/yedek/restic RESTIC_PASSWORD_FILE=/opt/aesun/sir/restic.pass
D=/var/yedek/dump; L=/var/log/aesun-yedek.log; DURUM=/opt/aesun/yedek/durum.json
mkdir -p $D; chmod 700 /var/yedek $D
bas=$(date +%s); hata=""
log() { echo "$(date '+%F %T') [$ETIKET] $*" >> $L; }

# 1) Veritabanı dökümleri (tutarlı anlık görüntü; yalnız gece ve elle yedekte)
if [ "$ETIKET" != "on_degisiklik" ]; then
  for c in $(docker ps --format '{{.Names}}|{{.Image}}' | grep -iE '\|(postgres|timescale)' | cut -d'|' -f1); do
    docker exec "$c" sh -c 'pg_dumpall -U "${POSTGRES_USER:-postgres}"' 2>>$L | gzip -6 > $D/$c.sql.gz.yeni \
      && [ -s $D/$c.sql.gz.yeni ] && mv $D/$c.sql.gz.yeni $D/$c.sql.gz || { hata="$hata $c"; rm -f $D/$c.sql.gz.yeni; }
  done
  for c in $(docker ps --format '{{.Names}}|{{.Image}}' | grep -iE '\|(mariadb|mysql)' | cut -d'|' -f1); do
    docker exec "$c" sh -c 'P=${MARIADB_ROOT_PASSWORD:-$MYSQL_ROOT_PASSWORD}; (command -v mariadb-dump >/dev/null && mariadb-dump -uroot -p"$P" --all-databases --single-transaction) || mysqldump -uroot -p"$P" --all-databases --single-transaction' 2>>$L \
      | gzip -6 > $D/$c.sql.gz.yeni && [ "$(gzip -dc $D/$c.sql.gz.yeni | head -c 200 | wc -c)" -gt 100 ] && mv $D/$c.sql.gz.yeni $D/$c.sql.gz || { hata="$hata $c"; rm -f $D/$c.sql.gz.yeni; }
  done
  crontab -l > $D/root.crontab 2>/dev/null
fi

# 2) Dosya yedeği (önceliği düşük: diğer işleri yavaşlatmaz)
HARIC=(--exclude /opt/tampon --exclude /opt/containerd --exclude '**/node_modules' --exclude '**/.venv' --exclude '**/__pycache__'
       --exclude '**/.cache' --exclude '/var/lib/docker/volumes/tampon-*' --exclude '/var/lib/docker/volumes/cutkoda_ck_tarayici/_data/Default/Cache'
       --exclude '/var/lib/docker/volumes/cutkoda_ck_tarayici/_data/Default/Code Cache' --exclude '*.log.[0-9]*')
YOLLAR=(/opt /var/lib/docker/volumes /etc/systemd/system /etc/ufw /etc/ssh/sshd_config /root/yedek $D)
[ "$ETIKET" = "on_degisiklik" ] && YOLLAR=(/opt/aesun /opt/aesun-web /opt/cutkoda /opt/caddy /etc/systemd/system) && HARIC+=(--exclude /opt/aesun/youtube/medya)
nice -n 15 ionice -c3 restic backup --tag "$ETIKET" --one-file-system "${HARIC[@]}" "${YOLLAR[@]}" >> $L 2>&1 || hata="$hata dosya"

# 3) Saklama: 14 gün, 8 hafta, 6 ay; değişiklik öncesi anlık yedekler 30 adet
if [ "$ETIKET" = "gece" ]; then
  nice -n 15 restic forget --tag gece --keep-daily 14 --keep-weekly 8 --keep-monthly 6 --prune >> $L 2>&1 || hata="$hata saklama"
  nice -n 15 restic forget --tag on_degisiklik --keep-last 30 >> $L 2>&1
  [ "$(date +%u)" = 7 ] && { nice -n 15 restic check >> $L 2>&1 || hata="$hata denetim"; }
fi

sure=$(( $(date +%s) - bas ))
son=$(restic snapshots --latest 1 --json 2>/dev/null | python3 -c "import json,sys;d=json.load(sys.stdin);print(d[-1]['short_id'] if d else '')" 2>/dev/null)
boyut=$(du -sh /var/yedek/restic 2>/dev/null | cut -f1)
mkdir -p "$(dirname $DURUM)"
printf '{"zaman":"%s","etiket":"%s","basarili":%s,"hatalar":"%s","sure_sn":%s,"son_kopya":"%s","depo_boyut":"%s"}\n' \
  "$(date -Is)" "$ETIKET" "$([ -z "$hata" ] && echo true || echo false)" "${hata# }" "$sure" "$son" "$boyut" > $DURUM
log "bitti sure=${sure}s hata=[${hata# }] kopya=$son depo=$boyut"
[ -z "$hata" ]
