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
echo "NOT: hesap: $(grep -c "^SOLARMAN_KULLANICI[A-Z0-9_]*=." /opt/aesun/musteri.env || true) tanımlı"
sleep 20
docker exec aesun-musteri sh -c 'cat /musteri/durum.json 2>/dev/null || echo "durum yok"' | sed 's/^/NOT: toplayıcı: /'
docker exec aesun-musteri python3 -c "
import os, hashlib, requests
tb = 'https://globalpro.solarmanpv.com'
kul, sifre = os.environ.get('SOLARMAN_KULLANICI',''), os.environ.get('SOLARMAN_SIFRE','')
r = requests.post(tb + '/oauth-s/oauth/token', timeout=15, data={'grant_type':'mdc_password','username':kul,'clear_text_pwd':'','password':hashlib.sha256(sifre.encode()).hexdigest(),'identity_type':2,'client_id':'test','system':'SOLARMAN'})
j = r.json() if r.status_code == 200 else {}
if 'access_token' in j:
    h = {'Authorization': 'bearer ' + j['access_token']}
    ro = requests.get(tb + '/user-s/acc/org/my?language=en', headers=h, timeout=15)
    print('NOT: org/my HTTP ' + str(ro.status_code) + ' ' + ro.text[:200])
" 2>/dev/null || true
