#!/bin/bash
# evdenyemekye.com: geliştiricinin main'e gönderdiği her sürümü kurallarımız içinde otomatik yayınlar (dakikalık).
set -e
install -m 700 sunucu/evdenyemekye/eyk-yayinla /usr/local/bin/eyk-yayinla
install -m 700 sunucu/evdenyemekye/eyk-oto /usr/local/bin/eyk-oto
printf '[Unit]\nDescription=evdenyemekye.com otomatik yayın\n[Service]\nType=oneshot\nExecStart=/usr/local/bin/eyk-oto\nTimeoutStartSec=2400\nNice=10\nIOSchedulingClass=idle\n' > /etc/systemd/system/eyk-oto.service
printf '[Unit]\nDescription=evdenyemekye.com otomatik yayın (dakikalık)\n[Timer]\nOnBootSec=3min\nOnUnitActiveSec=60s\n[Install]\nWantedBy=timers.target\n' > /etc/systemd/system/eyk-oto.timer
B=/opt/evdenyemekye; git -C $B/git rev-parse origin/main > $B/oto_son 2>/dev/null || true
echo otomatik > $B/mod
# mevcut kapsayıcıyı ayrı ağa taşı (kurallarla yeniden başlat)
C=$(cat $B/canli 2>/dev/null); [ -n "$C" ] && /usr/local/bin/eyk-yayinla $(git -C $B/git rev-parse "$C") >/dev/null 2>&1 && echo "NOT: canlı sürüm ayrı ağda yeniden başlatıldı"
docker network disconnect $(docker inspect ck-caddy -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | tr ' ' '\n' | grep -m1 ck-dis) eyk-site >/dev/null 2>&1 || true
systemctl daemon-reload; systemctl enable --now eyk-oto.timer >/dev/null 2>&1
echo "NOT: mod $(cat $B/mod) · zamanlayıcı $(systemctl is-active eyk-oto.timer) · site ağları: $(docker inspect eyk-site -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}')"
echo "NOT: $(tail -1 $B/son_sonuc 2>/dev/null)"
