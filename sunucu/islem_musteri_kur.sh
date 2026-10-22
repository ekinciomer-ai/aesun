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
echo "NOT: kimlik: $(grep -c '^SOLARMAN_[A-Z]*=.' /opt/aesun/musteri.env || true)/2 dolu"
sleep 22
docker exec aesun-musteri sh -c 'cat /musteri/durum.json 2>/dev/null || echo "durum yok"' | sed 's/^/NOT: toplayıcı: /'
docker exec aesun-musteri python3 -c "
import os, hashlib, requests
tb = 'https://globalpro.solarmanpv.com'
kul, sifre = os.environ.get('SOLARMAN_KULLANICI',''), os.environ.get('SOLARMAN_SIFRE','')
for sys_ad in ('SOLARMAN', 'SOLARMANPRO'):
    for id_t in (2, 1, 0):
        r = requests.post(tb + '/oauth-s/oauth/token', timeout=15, data={'grant_type':'mdc_password','username':kul,'clear_text_pwd':'','password':hashlib.sha256(sifre.encode()).hexdigest(),'identity_type':id_t,'client_id':'test','system':sys_ad})
        j = r.json() if ' {' in ' '+r.text else {}
        print(f'NOT: login({sys_ad},id={id_t}): HTTP {r.status_code} keys={list(j.keys())} err={j.get(\"error\") or j.get(\"msg\")}')
        if 'access_token' in j:
            h = {'Authorization': 'bearer ' + j['access_token']}
            for u in ('/business-s/acc/org/list', '/business-s/acc/org/info', '/account-s/acc/info', '/maintain-s/operating/station/v2/search?page=1&size=10'):
                r2 = requests.post(tb + u, json={}, headers=h, timeout=15) if 'search' in u else requests.get(tb + u, headers=h, timeout=15)
                print(f'NOT:   {u}: HTTP {r2.status_code} {r2.text[:140]}')
            break
" 2>/dev/null || true
