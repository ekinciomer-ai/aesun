#!/bin/bash
# aesun-api kurulumu / güncellemesi (ns1). gesfin uygulamasına dokunmaz; Caddy'ye yalnız api.aksarayenerji.net bloğu eklenir.
set -euo pipefail
H=/opt/aesun
mkdir -p $H && chmod 700 $H
cp -r sunucu/aesun/. $H/
[ -f $H/isler.env ] || { umask 077; printf 'ETKIN=0\n' > $H/isler.env; echo "NOT: isler.env oluşturuldu (işler kapalı)"; }
chmod 600 $H/isler.env
if [ ! -f $H/.env ]; then
  umask 077; printf 'AESUN_ESITLE_SN=30\n' > $H/.env
  echo "NOT: .env oluşturuldu (root-only)"
fi
chmod 600 $H/.env
cd $H
docker compose build -q
# veri birimi kapsayıcı kullanıcısına ait olmalı
docker compose run --rm --no-deps --user root --entrypoint sh api -c 'chown -R 1001:1001 /veri' >/dev/null 2>&1 || true
docker compose up -d --force-recreate
sleep 8
echo "NOT: kapsayıcılar: $(docker ps --filter name=aesun- --format '{{.Names}} {{.Status}}' | tr '\n' ' ')"
# --- Caddy: yalnız yeni blok, doğrulama ve geri alma ile ---
CF=/opt/caddy/Caddyfile
C=gesfin-caddy
HEDEF=$(docker inspect $C --format '{{range .Mounts}}{{if eq .Source "/opt/caddy/Caddyfile"}}{{.Destination}}{{end}}{{end}}')
if [ -z "$HEDEF" ]; then
  DIR=$(docker inspect $C --format '{{range .Mounts}}{{if eq .Source "/opt/caddy"}}{{.Destination}}{{end}}{{end}}')
  [ -n "$DIR" ] && HEDEF="$DIR/Caddyfile"
fi
echo "NOT: Caddyfile kapsayıcıda: ${HEDEF:-bulunamadı}"
if [ -n "$HEDEF" ] && ! grep -q '^api.aksarayenerji.net' $CF; then
  cp $CF $CF.yedek-$(date +%Y%m%d%H%M)
  cat >> $CF <<'BLOK'

api.aksarayenerji.net {
	tls {
		issuer acme {
			disable_http_challenge
		}
	}
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Content-Type-Options nosniff
		Referrer-Policy no-referrer
		-Server
	}
	reverse_proxy aesun-api:8000
}
BLOK
  if docker exec $C caddy validate --config "$HEDEF" --adapter caddyfile >/tmp/cv.txt 2>&1; then
    docker exec $C caddy reload --config "$HEDEF" --adapter caddyfile && echo "NOT: Caddy yeniden yüklendi (api bloğu eklendi)"
  else
    echo "NOT: Caddy doğrulaması BAŞARISIZ, geri alındı: $(tail -2 /tmp/cv.txt | tr '\n' ' ' | cut -c1-200)"
    cp $(ls -t $CF.yedek-* | head -1) $CF
    exit 1
  fi
else
  echo "NOT: Caddy bloğu zaten var ya da dosya bulunamadı"
fi
sleep 25
echo "NOT: iç sağlık: $(docker exec aesun-api python -c "import urllib.request;print(urllib.request.urlopen('http://127.0.0.1:8000/v1/saglik').read().decode())" 2>&1 | cut -c1-300)"
echo "NOT: dış sağlık: $(curl -s --max-time 20 https://api.aksarayenerji.net/v1/saglik | cut -c1-300)"
echo "NOT: yetkisiz deneme: $(curl -s -o /dev/null -w '%{http_code}' --max-time 20 https://api.aksarayenerji.net/v1/dosya/antminer_panel.json)"
echo "NOT: bellek: $(docker stats --no-stream --format '{{.Name}} {{.MemUsage}}' aesun-api aesun-isler | tr '\n' ' ')"
sleep 20; echo "NOT: işler durumu: $(docker exec aesun-isler cat /veri/durum.json 2>&1 | cut -c1-300)"
