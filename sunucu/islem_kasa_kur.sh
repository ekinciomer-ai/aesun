#!/bin/bash
# Şifreli kasayı kurar: aesun-api'ye kasa uçları (/v1/kasa/liste, /v1/kasa/yaz) + kök çözücü (/opt/aesun/kasa_coz.sh).
# Güvenli dağıtım: önceki imaj ve compose saklanır; sağlık kontrolü başarısızsa otomatik geri alınır.
set -uo pipefail
cd /tmp/aesun_paket
install -m 644 /opt/aesun/sir/acik.pem /opt/aesun/kasa_acik.pem
install -m 700 sunucu/aesun/kasa_coz.sh /opt/aesun/kasa_coz.sh
VOL=/var/lib/docker/volumes/aesun_aesun_veri/_data/kasa; mkdir -p $VOL; chown 1001:1001 $VOL; chmod 700 $VOL
[ -f $VOL/istenen.json ] || { echo '{}' > $VOL/istenen.json; chown 1001:1001 $VOL/istenen.json; }

ONCE=$(docker inspect aesun-api --format '{{.Image}}' 2>/dev/null)
cp /opt/aesun/docker-compose.yml /opt/aesun/docker-compose.yml.onceki
cp /opt/aesun/Dockerfile /opt/aesun/Dockerfile.onceki 2>/dev/null; cp /opt/aesun/app.py /opt/aesun/app.py.onceki 2>/dev/null
cp -r sunucu/aesun/. /opt/aesun/
chmod 700 /opt/aesun/kasa_coz.sh /opt/aesun/yedek/yedekle.sh
cd /opt/aesun
saglik() {
  for i in $(seq 1 20); do
    s=$(docker exec aesun-api python -c "import urllib.request;print(urllib.request.urlopen('http://127.0.0.1:8000/v1/saglik',timeout=5).status)" 2>/dev/null)
    [ "$s" = 200 ] && break; sleep 2
  done
  k=$(docker exec aesun-api python -c "
import urllib.request,urllib.error
try: urllib.request.urlopen('http://127.0.0.1:8000/v1/kasa/liste',timeout=5); print('acik')
except urllib.error.HTTPError as e: print(e.code)" 2>/dev/null)
  echo "saglik=$s kasa_anahtarsiz=$k"
  [ "$s" = 200 ] && [ "$k" = 401 ]
}
if docker compose build -q api >/tmp/kasa_build.log 2>&1 && docker compose up -d --no-deps api >/dev/null 2>&1 && R=$(saglik); then
  echo "NOT: kasa yayında · $R · dışarıdan: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.aksarayenerji.net/v1/kasa/liste) (401 beklenir) · sağlık: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.aksarayenerji.net/v1/saglik)"
  rm -f docker-compose.yml.onceki Dockerfile.onceki app.py.onceki
else
  echo "NOT: HATA kasa dağıtımı başarısız (${R:-derleme}) · $(tail -3 /tmp/kasa_build.log | tr '\n' ' ' | cut -c1-200) · geri alınıyor"
  mv docker-compose.yml.onceki docker-compose.yml; [ -f Dockerfile.onceki ] && mv Dockerfile.onceki Dockerfile; [ -f app.py.onceki ] && mv app.py.onceki app.py
  [ -n "$ONCE" ] && docker tag "$ONCE" aesun-api:latest 2>/dev/null
  docker compose up -d --no-deps api >/dev/null 2>&1; sleep 6
  echo "NOT: geri alındı · sağlık: $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.aksarayenerji.net/v1/saglik)"
  exit 1
fi
