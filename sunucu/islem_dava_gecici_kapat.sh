#!/bin/bash
# Davalar geçici bağlantısını hemen kapatır (veriye dokunmaz; yalnız kap ve port kuralı kaldırılır).
P=$(cat /opt/dava_gecici/port 2>/dev/null)
docker rm -f dava-gecici dava-tunel >/dev/null 2>&1
[ -n "$P" ] && command -v ufw >/dev/null && ufw delete allow "$P/tcp" >/dev/null 2>&1
systemctl stop dava-gecici-bitis.timer dava-gecici-bitis.service >/dev/null 2>&1 || true
echo "NOT: davalar geçici bağlantısı kapatıldı"
