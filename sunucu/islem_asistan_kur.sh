#!/bin/bash
# Merkez Sunucu (159.198.76.80) üzerinde Antigravity Sunucu Asistanı & Canlı YouTube Komut Merkezi kurulumu.
set -euo pipefail

cp -r sunucu/aesun/. /opt/aesun/
chmod 700 /opt/aesun/asistan_isci.py

cd /opt/aesun
docker compose build -q api
docker compose up -d --no-deps api >/dev/null 2>&1
sleep 5

KAYNAK=$(docker inspect aesun-api --format '{{range .Mounts}}{{if eq .Destination "/veri"}}{{.Source}}{{end}}{{end}}')
mkdir -p "$KAYNAK/asistan/kuyruk"
chown -R 1001:1001 "$KAYNAK/asistan"

cat > /etc/systemd/system/aesun-asistan.service <<EOF
[Unit]
Description=Aksaray Enerji & Antik Studyo Sunucu Asistan Iscisi
After=docker.service network-online.target
Requires=docker.service

[Service]
Type=simple
Environment=ASISTAN_VERI=$KAYNAK/asistan
ExecStart=/usr/bin/python3 /opt/aesun/asistan_isci.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable --now aesun-asistan.service
systemctl restart aesun-asistan.service
sleep 6

echo "NOT: aesun-asistan servisi: $(systemctl is-active aesun-asistan.service)"
echo "NOT: durum dosyasi: $(ls -lh "$KAYNAK/asistan/durum.json" 2>/dev/null | awk '{print $5, $9}' || echo 'hazirlaniyor')"
echo "NOT: env adlari: $(grep -hE '^[A-Za-z0-9_]+=' /opt/aesun/.env /opt/aesun/isler.env /opt/cutkoda/motor.env /opt/cutkoda/.env 2>/dev/null | cut -d= -f1 | sort -u | tr '\n' ' ')"
echo "NOT: son mesajlar: $(python3 -c "import json; m=json.load(open('$KAYNAK/asistan/mesajlar.json')); print(' | '.join(x.get('kim')+': '+x.get('metin','')[:80].replace('\n',' ') for x in m[-4:]))" 2>/dev/null || echo 'yok')"
echo "NOT: api saglik: $(curl -s --max-time 10 https://api.aksarayenerji.net/v1/saglik | cut -c1-180)"
