#!/bin/bash
# Gürses Yapı · Konut Bloğu 3D — ayrı proje. https://gursesyapi.<ip-tireli>.sslip.io (ücretsiz ad, Let's Encrypt sertifikası)
# Ömer onayı (9 Kas 2026): ck-caddy'ye yalnız kendi ek dosyası eklenir; hata olursa geri alınır.
set -uo pipefail
IP=$(curl -s4 --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')
AD="gursesyapi.$(echo $IP | tr . -).sslip.io"
EK=/opt/cutkoda/caddy-ek/bina3d.caddy
D=/opt/bina3d/site
mkdir -p $D && cp sunucu/bina3d/* $D/ && chmod -R a+rX /opt/bina3d
rm -rf /opt/aesun-web/portal/teklif/konut-blogu 2>/dev/null
AG=$(docker inspect ck-caddy -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | tr ' ' '\n' | grep -m1 'ck-dis')
docker rm -f bina3d-web >/dev/null 2>&1
docker run -d --name bina3d-web --restart unless-stopped --network "$AG" -m 64m --cpus 0.5 --read-only \
  --tmpfs /var/cache/nginx --tmpfs /var/run --tmpfs /tmp \
  -v $D:/usr/share/nginx/html:ro --log-opt max-size=5m --log-opt max-file=2 nginx:1.27-alpine >/dev/null \
  || { echo "NOT: kapsayıcı başlatılamadı"; exit 1; }
sleep 3
echo "NOT: kapsayıcı iç: $(docker exec ck-caddy wget -qO- http://bina3d-web/ 2>/dev/null | grep -o '<title>[^<]*' | cut -c8-)"
ESKI=""; [ -f $EK ] && ESKI=$(cat $EK)
cat > $EK <<C
# Gürses Yapı · Konut Bloğu 3D (bina3d-web) — ayrı proje
$AD {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Robots-Tag "noindex, nofollow"
		X-Content-Type-Options nosniff
		X-Frame-Options SAMEORIGIN
		Referrer-Policy no-referrer
		Permissions-Policy "camera=(), microphone=(), geolocation=()"
		-Server
	}
	@yaz not method GET HEAD
	respond @yaz 405
	reverse_proxy bina3d-web:80
}
C
if docker exec ck-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/tmp/b3.txt 2>&1 && docker exec ck-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >>/tmp/b3.txt 2>&1; then
  echo "NOT: Caddy yenilendi"
else
  echo "NOT: Caddy HATA, geri alındı: $(grep -i error /tmp/b3.txt | tail -1 | cut -c1-250)"
  if [ -n "$ESKI" ]; then echo "$ESKI" > $EK; else rm -f $EK; fi
  docker exec ck-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; exit 1
fi
U=https://$AD
for i in $(seq 1 18); do curl -s -o /dev/null --max-time 8 $U/ && break; sleep 10; done
echo "NOT: site: $(curl -s -o /tmp/k.html -w '%{http_code}' --max-time 15 $U/ || echo SERTIFIKA_YOK) $(grep -o '<title>[^<]*' /tmp/k.html 2>/dev/null | cut -c8-) · bina.html $(curl -s -o /dev/null -w '%{http_code} %{size_download}' --max-time 30 $U/bina.html) · plan $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 $U/plan-A.jpg) · POST $(curl -s -o /dev/null -w '%{http_code}' -X POST --max-time 10 $U/)"
echo "NOT: sertifika: $(echo | openssl s_client -connect 127.0.0.1:443 -servername $AD 2>/dev/null | openssl x509 -noout -issuer -enddate 2>/dev/null | tr '\n' ' ' | cut -c1-140)"
echo "NOT: diğer siteler: cutkoda $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://cutkoda.com/) · api $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/saglik) · portal $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://portal.aksarayenerji.net/) · portal eski kopya $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://portal.aksarayenerji.net/teklif/konut-blogu/)"
echo "NOT: caddy hata: $(docker logs --since 4m ck-caddy 2>&1 | grep -i '"error"' | grep -i 'sslip\|bina3d' | tail -1 | cut -c1-250)"
