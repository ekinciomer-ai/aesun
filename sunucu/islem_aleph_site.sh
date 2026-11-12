#!/bin/bash
# Tampon aleph: yalnız şifreli siteyi açar (kurulum ve kapasite denemesi tekrarlanmaz). Şifre kasada: aleph_panel_sifre.
set -uo pipefail
EK=/opt/cutkoda/caddy-ek/aleph.caddy
docker ps --filter name=aleph-tampon --format "{{.Status}}" | grep -q Up || { echo "NOT: HATA aleph-tampon çalışmıyor"; exit 1; }
SIF=$(/opt/aesun/kasa_coz.sh aleph_panel_sifre 2>/dev/null || true)
if [ ${#SIF} -lt 10 ]; then
  echo "NOT: KASA_BEKLIYOR panel şifresi kasada yok; site açılmadı (kapsayıcı yalnız içeriden çalışıyor)"; exit 0
fi
# 5) Site: aleph.<ip>.sslip.io, şifre korumalı
IP=$(curl -s4 --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')
AD="aleph.$(echo $IP | tr . -).sslip.io"
HASH=$(docker exec ck-caddy caddy hash-password --plaintext "$SIF"); unset SIF
ESKI=""; [ -f $EK ] && ESKI=$(cat $EK)
cat > $EK <<C
# Aleph harita paneli (aleph-tampon) — tampon bölge
$AD {
	basic_auth {
		omer $HASH
	}
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Robots-Tag "noindex, nofollow"
		X-Content-Type-Options nosniff
		Referrer-Policy no-referrer
		-Server
	}
	reverse_proxy aleph-tampon:8100 {
		header_up Host 127.0.0.1:8100
		header_up -Origin
	}
}
C
if docker exec ck-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/tmp/ac.txt 2>&1 && docker exec ck-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >>/tmp/ac.txt 2>&1; then
  echo "NOT: Caddy yenilendi"
else
  echo "NOT: Caddy HATA, geri alındı: $(grep -i error /tmp/ac.txt | tail -1 | cut -c1-250)"
  if [ -n "$ESKI" ]; then echo "$ESKI" > $EK; else rm -f $EK; fi
  docker exec ck-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; exit 1
fi
U=https://$AD
for i in $(seq 1 18); do curl -s -o /dev/null --max-time 8 $U/ && break; sleep 10; done
echo "NOT: site $U · şifresiz $(curl -s -o /dev/null -w '%{http_code}' --max-time 15 $U/) (401 beklenir)"
echo "NOT: diğer siteler: cutkoda $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://cutkoda.com/) · portal $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://portal.aksarayenerji.net/) · gursesyapi $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://gursesyapi.$(echo $IP | tr . -).sslip.io/)"
