#!/bin/bash
# Davalar geçici bağlantısını hemen kapatır (veriye dokunmaz; yalnız iki kap kaldırılır).
docker rm -f dava-gecici dava-tunel >/dev/null 2>&1
systemctl stop dava-gecici-bitis.timer dava-gecici-bitis.service >/dev/null 2>&1 || true
echo "NOT: davalar geçici bağlantısı kapatıldı"
