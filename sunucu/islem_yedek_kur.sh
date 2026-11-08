#!/bin/bash
# Sunucu yedeğini kurar ve ilk yedeği alır; ardından geri yükleme denemesi yapar. Tekrar çalıştırılabilir (zararsız).
set -uo pipefail
command -v restic >/dev/null || { DEBIAN_FRONTEND=noninteractive apt-get install -y -qq restic >/dev/null 2>&1; }
command -v restic >/dev/null || { echo "NOT: HATA restic kurulamadı"; exit 1; }
echo "NOT: restic $(restic version | awk '{print $2}')"
umask 077
[ -s /opt/aesun/sir/restic.pass ] || { openssl rand -base64 48 > /opt/aesun/sir/restic.pass; echo "NOT: yedek şifresi üretildi (yalnız sunucuda, root)"; }
chmod 600 /opt/aesun/sir/restic.pass
export RESTIC_REPOSITORY=/var/yedek/restic RESTIC_PASSWORD_FILE=/opt/aesun/sir/restic.pass
mkdir -p /var/yedek; chmod 700 /var/yedek
[ -f /var/yedek/restic/config ] || { restic init >/dev/null && echo "NOT: yedek deposu açıldı: /var/yedek/restic"; }
install -d -m 700 /opt/aesun/yedek
install -m 700 sunucu/aesun/yedek/yedekle.sh /opt/aesun/yedek/yedekle.sh

cat > /etc/systemd/system/aesun-yedek.service <<'EOF'
[Unit]
Description=Sunucu yedegi (restic)
[Service]
Type=oneshot
ExecStart=/opt/aesun/yedek/yedekle.sh gece
Nice=15
EOF
cat > /etc/systemd/system/aesun-yedek.timer <<'EOF'
[Unit]
Description=Her gece sunucu yedegi
[Timer]
OnCalendar=*-*-* 03:30:00
RandomizedDelaySec=300
Persistent=true
[Install]
WantedBy=timers.target
EOF
systemctl daemon-reload && systemctl enable --now aesun-yedek.timer >/dev/null 2>&1
echo "NOT: zamanlayıcı: $(systemctl list-timers aesun-yedek.timer --no-legend | awk '{print $1" "$2" "$3}')"

# İlk yedek (zaman sınırı: 50 dk)
timeout 3000 /opt/aesun/yedek/yedekle.sh elle; k=$?
echo "NOT: ilk yedek çıkış=$k · $(cat /opt/aesun/yedek/durum.json)"
echo "NOT: dökümler: $(ls -la /var/yedek/dump | awk 'NR>3{printf "%s=%s ", $NF, $5}')"
echo "NOT: kopyalar: $(restic snapshots --compact 2>/dev/null | grep -cE '^[0-9a-f]{8}') adet · depo $(du -sh /var/yedek/restic | cut -f1) · disk boş $(df -h / | tail -1 | awk '{print $4}')"

# Geri yükleme denemesi: bir yapılandırma dosyası ve bir veritabanı dökümü geri yüklenip karşılaştırılır
T=$(mktemp -d); trap 'rm -rf $T' EXIT
DUMP=$(ls /var/yedek/dump/*.sql.gz 2>/dev/null | head -1)
restic restore latest --target $T --include /opt/aesun/docker-compose.yml ${DUMP:+--include $DUMP} >/dev/null 2>&1
ok1=$(cmp -s /opt/aesun/docker-compose.yml $T/opt/aesun/docker-compose.yml && echo tamam || echo HATA)
ok2=yok; [ -n "$DUMP" ] && ok2=$(cmp -s "$DUMP" "$T$DUMP" && gzip -t "$T$DUMP" && echo tamam || echo HATA)
echo "NOT: geri yükleme denemesi: yapılandırma=$ok1 · veritabanı dökümü ($(basename "${DUMP:-yok}"))=$ok2"
