#!/bin/bash
# Pi'nin GitHub anahtarı yenileme: (1) API'ye "pi/ dosyaları yalnız toplayıcı" kuralı (güvenli dağıtım, geri almalı),
# (2) Kasa'da beklenen kayda pi_github_anahtari eklenir, (3) Kasa'ya girildiyse Pi'nin alacağı yere (depo/pi) konur.
# Değer hiçbir yere yazdırılmaz.
set -uo pipefail
cd /tmp/aesun_paket
VOLD=/var/lib/docker/volumes/aesun_aesun_veri/_data
# (2) beklenen kayıt
python3 - <<'PY'
import json
f="/var/lib/docker/volumes/aesun_aesun_veri/_data/kasa/istenen.json"
try: d=json.load(open(f))
except Exception: d={}
d["pi_github_anahtari"]="Saha Pi için yeni GitHub anahtarı (epias-ptf deposu, Contents: okuma ve yazma). Eskisinin süresi 5 Kasım'da doldu."
json.dump(d,open(f,"w"),ensure_ascii=False,indent=1)
PY
chown 1001:1001 $VOLD/kasa/istenen.json; chmod 600 $VOLD/kasa/istenen.json
# (1) API dağıtımı (yalnız app.py değiştiyse)
if ! cmp -s sunucu/aesun/app.py /opt/aesun/app.py; then
  ONCE=$(docker inspect aesun-api --format '{{.Image}}')
  cp /opt/aesun/app.py /opt/aesun/app.py.onceki
  cp sunucu/aesun/app.py /opt/aesun/app.py
  cd /opt/aesun
  saglik() { for i in $(seq 1 20); do s=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 https://api.aksarayenerji.net/v1/saglik); [ "$s" = 200 ] && break; sleep 2; done
    p=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 'https://api.aksarayenerji.net/v1/veri?a=oku&yol=pi/gh_anahtar.json'); echo "saglik=$s pi_anahtarsiz=$p"; [ "$s" = 200 ] && [ "$p" = 403 ]; }
  if docker compose build -q api >/tmp/pia_build.log 2>&1 && docker compose up -d --no-deps api >/dev/null 2>&1 && sleep 4 && R=$(saglik); then
    echo "NOT: API güncellendi · $R"; rm -f app.py.onceki
  else
    echo "NOT: HATA API dağıtımı (${R:-derleme}) · geri alınıyor"; mv app.py.onceki app.py; docker tag "$ONCE" aesun-api:latest; docker compose up -d --no-deps api >/dev/null 2>&1; sleep 6
    echo "NOT: geri alındı · sağlık $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.aksarayenerji.net/v1/saglik)"; exit 1
  fi
  cd /tmp/aesun_paket
else echo "NOT: API zaten güncel"; fi
# (3) anahtar Kasa'da varsa Pi'nin alacağı yere
if T=$(/opt/aesun/kasa_coz.sh pi_github_anahtari 2>/dev/null) && [ -n "$T" ]; then
  mkdir -p $VOLD/depo/pi
  T="$T" python3 -c "import json,os;json.dump({'t':os.environ['T'].strip()},open('$VOLD/depo/pi/gh_anahtar.json','w'))"
  chown -R 1001:1001 $VOLD/depo/pi; chmod 700 $VOLD/depo/pi; chmod 600 $VOLD/depo/pi/gh_anahtar.json
  K=$(T="$T" python3 -c "
import os,urllib.request,urllib.error
r=urllib.request.Request('https://api.github.com/repos/ekinciomer-ai/epias-ptf',headers={'Authorization':'Bearer '+os.environ['T'].strip(),'User-Agent':'aesun'})
try: import json;d=json.load(urllib.request.urlopen(r,timeout=15));print('geçerli, yazma izni', d.get('permissions',{}).get('push'))
except urllib.error.HTTPError as e: print('GEÇERSİZ', e.code)")
  B=$(T="$T" python3 -c "
import os;t=os.environ['T'].strip()
tur='github_pat_' if t.startswith('github_pat_') else ('ghp_' if t.startswith('ghp_') else 'tanınmayan biçim')
print(f'biçim: {tur}, uzunluk: {len(t)}, boşluk içeriyor: {\" \" in t}')")
  echo "NOT: Kasa'daki Pi anahtarı · $B · GitHub sınaması: $K"
  case "$K" in geçerli*) echo "NOT: anahtar Pi'ye hazır";; *) rm -f $VOLD/depo/pi/gh_anahtar.json; echo "NOT: geçersiz anahtar Pi'ye verilmedi";; esac
  unset T
else
  echo "NOT: Kasa'da pi_github_anahtari henüz yok (portal → Kasa'dan girilecek)"
fi
