#!/bin/bash
# Müşteri Monitoring: aesun-musteri toplayıcısını kurar/günceller ve aesun-api'yi /v1/musteri uçlarıyla yeniler.
# Veri yalnız aesun_musteri biriminde durur (epias-ptf/GitHub'a yazılmaz). Kimlik: /opt/aesun/musteri.env (musteri_sir.yml yazar).
set -euo pipefail
cp -r sunucu/aesun/. /opt/aesun/ && chmod 700 /opt/aesun/bekci.sh
[ -f /opt/aesun/musteri.env ] || { install -m 600 /dev/null /opt/aesun/musteri.env; echo "NOT: musteri.env boş oluşturuldu — musteri_sir.yml çalıştırılmalı"; }
chmod 600 /opt/aesun/musteri.env
cd /opt/aesun && docker compose build -q api musteri && docker compose up -d --no-deps api musteri >/dev/null 2>&1
sleep 8
echo "NOT: api: $(docker inspect -f '{{.State.Status}}' aesun-api) · musteri: $(docker inspect -f '{{.State.Status}}' aesun-musteri)"
echo "NOT: kimlik: $(grep -c '^SOLARMAN_[A-Z]*=.' /opt/aesun/musteri.env || true)/2 dolu"
sleep 20
docker exec aesun-musteri sh -c 'cat /musteri/durum.json 2>/dev/null || echo "durum yok"' | sed 's/^/NOT: toplayıcı: /'
