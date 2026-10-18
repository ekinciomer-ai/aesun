#!/bin/bash
# Onaylı (18.10.2026): ns1 sistem bekçisi — 5 dk'da bir API/işler denetimi, gerekirse kapsayıcıyı yeniden başlatır.
set -euo pipefail
cp -r sunucu/aesun/. /opt/aesun/ && chmod 700 /opt/aesun/bekci.sh
cd /opt/aesun && docker compose build -q api && docker compose up -d --no-deps api >/dev/null 2>&1
cat > /etc/systemd/system/aesun-bekci.service <<'U'
[Unit]
Description=AEMonitoring ns1 sistem bekçisi
[Service]
Type=oneshot
ExecStart=/opt/aesun/bekci.sh
TimeoutStartSec=180
U
cat > /etc/systemd/system/aesun-bekci.timer <<'U'
[Unit]
Description=AEMonitoring ns1 sistem bekçisi (5 dk)
[Timer]
OnBootSec=3min
OnUnitActiveSec=5min
AccuracySec=30s
[Install]
WantedBy=timers.target
U
systemctl daemon-reload && systemctl enable --now aesun-bekci.timer >/dev/null 2>&1
sleep 15; systemctl start aesun-bekci.service; sleep 3
echo "NOT: zamanlayıcı: $(systemctl is-active aesun-bekci.timer) · sonraki: $(systemctl list-timers aesun-bekci.timer --no-legend | awk '{print $1,$2,$3}')"
echo "NOT: bekçi durumu: $(cut -c1-600 /opt/aesun/bekci_durum.json)"
echo "NOT: API /v1/bekci: $(curl -s --max-time 15 https://api.aksarayenerji.net/v1/bekci | cut -c1-200)"
echo "NOT: günlük: $(tail -2 /var/log/aesun-bekci.log 2>/dev/null | tr '\n' ' ')"
