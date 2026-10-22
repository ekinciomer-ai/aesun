#!/bin/bash
# Müşteri Monitoring: aesun-musteri toplayıcısını kurar/günceller ve aesun-api'yi /v1/musteri uçlarıyla yeniler.
# Veri yalnız aesun_musteri biriminde durur (epias-ptf/GitHub'a yazılmaz). Kimlik: /opt/aesun/musteri.env (musteri_sir.yml yazar).
set -euo pipefail
cp -r sunucu/aesun/. /opt/aesun/ && chmod 700 /opt/aesun/bekci.sh
[ -f /opt/aesun/musteri.env ] || { install -m 600 /dev/null /opt/aesun/musteri.env; echo "NOT: musteri.env boş oluşturuldu — musteri_sir.yml çalıştırılmalı"; }
chmod 600 /opt/aesun/musteri.env
cd /opt/aesun && docker compose build -q api musteri && docker compose up -d --force-recreate --no-deps api musteri >/dev/null 2>&1
sleep 8
echo "NOT: api: $(docker inspect -f '{{.State.Status}}' aesun-api) · musteri: $(docker inspect -f '{{.State.Status}}' aesun-musteri)"
echo "NOT: hesap: solarman=$(grep -c "^SOLARMAN_KULLANICI[A-Z0-9_]*=." /opt/aesun/musteri.env || true) · osb=$(grep -c "^OSB_KULLANICI[A-Z0-9_]*=." /opt/aesun/musteri.env || true) tanımlı"
sleep 38
docker exec aesun-musteri sh -c 'cat /musteri/durum.json 2>/dev/null || echo "durum yok"' | sed 's/^/NOT: toplayıcı: /'
docker exec aesun-musteri python3 -c "
import json, pathlib
p = pathlib.Path('/musteri/santraller.json')
if p.is_file():
    d = json.loads(p.read_text())
    print('NOT: santraller (' + str(len(d)) + '): ' + ', '.join(f'{k}:{v.get(\"ad\")}({v.get(\"hesap\")})' for k,v in list(d.items())[:15]))
" 2>/dev/null || true
