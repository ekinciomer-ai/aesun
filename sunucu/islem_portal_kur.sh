#!/bin/bash
# Portal + kurumsal siteyi bu sunucuda çalıştırır (Hostigen cPanel yerine). Dosyalar /opt/aesun-web/{site,portal}'a önceden gönderilir.
# Kalıcı veri (canlı izleme, TM konumları, ae_veri) aesun_web_veri biriminde /ev altında durur. Tekrar çalıştırmak güvenli.
set -uo pipefail
W=/opt/aesun-web; IP=$(curl -s4 --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')
cd /tmp/aesun_paket/sunucu/portal || exit 1
# cPanel'e özel PHP işleyici satırları kaldırılır (burada PHP doğrudan çalışır; kalsa .php dosyaları düz metin inerdi)
for f in $W/site/.htaccess $W/portal/.htaccess; do
  [ -f "$f" ] && python3 - "$f" <<'PY'
import re, sys
p = sys.argv[1]; s = open(p).read()
s = re.sub(r"# php -- BEGIN cPanel-generated handler.*?# php -- END cPanel-generated handler, do not edit\n?", "", s, flags=re.S)
open(p, "w").write(s)
PY
done
docker build -q -t aesun-web:latest . > /tmp/aw_build.txt 2>&1 || { echo "NOT: derleme hatası: $(tail -5 /tmp/aw_build.txt | tr '\n' ' ')"; exit 1; }
AG=$(docker inspect ck-caddy -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | tr ' ' '\n' | grep -m1 'ck-dis')
docker volume create aesun_web_veri >/dev/null
if [ "$(docker inspect -f '{{.Config.Image}}' aesun-web 2>/dev/null)" != "aesun-web:latest" ] || [ -n "$(docker images -q aesun-web:latest | grep -v "$(docker inspect -f '{{.Image}}' aesun-web 2>/dev/null | cut -c8-19)")" ]; then
  docker rm -f aesun-web >/dev/null 2>&1
  docker run -d --name aesun-web --restart unless-stopped --network "$AG" -m 512m --cpus 2 \
    -v $W/site:/ev/p/site:ro -v $W/portal:/ev/p/portal -v aesun_web_veri:/ev/veri \
    -e AE_VERI=/ev/veri/ae_veri \
    --add-host api.aksarayenerji.net:$IP --add-host portal.aksarayenerji.net:$IP --add-host fatura.aksarayenerji.net:$IP \
    --log-opt max-size=10m --log-opt max-file=3 aesun-web:latest >/dev/null
fi
# PHP'nin beklediği ev dizini (~): ae_canli, ae_veri kalıcı birimde
docker exec aesun-web sh -c 'mkdir -p /ev/veri/ae_canli /ev/veri/ae_veri && ln -sfn /ev/veri/ae_canli /ev/ae_canli && ln -sfn /ev/veri/ae_veri /ev/ae_veri && chown -R www-data /ev/veri /ev/p/portal' 2>&1
# Caddy: kök, www, portal (sertifika DNS bu sunucuya dönünce kendiliğinden alınır)
cat > /opt/cutkoda/caddy-ek/aesun-web.caddy <<'C'
# Hostigen cPanel yerine bu sunucu (aesun-web kabı)
aksarayenerji.net, www.aksarayenerji.net, portal.aksarayenerji.net, www.portal.aksarayenerji.net {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		-Server
		-X-Powered-By
	}
	request_body {
		max_size 64MB
	}
	reverse_proxy aesun-web:80
}
C
docker exec ck-caddy caddy reload --config /etc/caddy/Caddyfile >/tmp/aw_caddy.txt 2>&1 && echo "NOT: Caddy yenilendi" || echo "NOT: Caddy yenilenemedi: $(tail -c 300 /tmp/aw_caddy.txt)"
sleep 3
for h in aksarayenerji.net portal.aksarayenerji.net; do
  echo "NOT: iç $h: $(docker exec ck-caddy wget -qO- --header "Host: $h" http://aesun-web/ 2>/dev/null | grep -o '<title>[^<]*' | head -1 | cut -c8-) · api/canli.php $(docker exec ck-caddy wget -qO /dev/null -S --header "Host: $h" http://aesun-web/api/canli.php 2>&1 | grep -m1 HTTP | xargs)"
done
echo "NOT: php kaynak sızıntı denetimi: $(docker exec ck-caddy wget -qO- --header 'Host: portal.aksarayenerji.net' http://aesun-web/api/veri.php 2>/dev/null | head -c 5 | grep -c '<?php') (0 olmalı)"
echo "NOT: dosyalar: site $(find $W/site -type f | wc -l) · portal $(find $W/portal -type f | wc -l)"
