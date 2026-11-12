#!/bin/bash
# Tampon bölge: belluxx/aleph (MIT) harita alanı indirme paneli. /opt/tampon/aleph, ayrı kapsayıcı (aleph-tampon).
# Ömer onayı (12 Kas 2026): Google kaynakları (uydu, Street View, 3D) kapasite denemesi için AÇIK; ticari işte kapatılacak/lisanslanacak.
# Başka uygulamaya dokunmaz; ck-caddy'ye yalnız kendi ek dosyası (aleph.caddy) eklenir, hata olursa geri alınır.
# Panel şifresi kasada (aleph_panel_sifre); yoksa site açılmaz, kapsayıcı yalnız içeriden çalışır.
set -uo pipefail
SURUM=1b307cdb7c470a7715da497ba406355dfe7d3163
D=/opt/tampon/aleph; EK=/opt/cutkoda/caddy-ek/aleph.caddy
mkdir -p $D/captures $D/cache
# 1) Kod (sabit sürüm)
rm -rf $D/kod.yeni && git clone -q https://github.com/belluxx/aleph $D/kod.yeni && git -C $D/kod.yeni checkout -q $SURUM \
  || { echo "NOT: HATA aleph indirilemedi"; rm -rf $D/kod.yeni; exit 1; }
rm -rf $D/kod && mv $D/kod.yeni $D/kod
# 2) Panel dışarıdan erişilsin diye küçük başlatıcı (kod değişmez; yalnız dinlenen adres 0.0.0.0)
cat > $D/baslat.py <<'P'
import sys, http.server as h, alephgeo.dashboard as d
class S(h.ThreadingHTTPServer):
    def __init__(s, adr, H): super().__init__(("0.0.0.0", adr[1]), H)
d.ThreadingHTTPServer = S
from alephgeo.__main__ import main
sys.argv = ["alephgeo", "dashboard", "-o", "/veri/captures", "--cache-dir", "/veri/cache", "--no-browser", "--port", "8100"]
main()
P
cat > $D/Dockerfile <<'F'
FROM python:3.12-slim
COPY kod /kod
RUN pip install --no-cache-dir /kod && useradd -u 1500 -m aleph
COPY baslat.py /baslat.py
USER aleph
CMD ["python", "/baslat.py"]
F
chown -R 1500:1500 $D/captures $D/cache
docker build -q -t aleph-tampon:${SURUM:0:7} $D >/tmp/ab.txt 2>&1 || { tail -5 /tmp/ab.txt | sed 's/^/NOT: /'; echo "NOT: HATA imaj kurulamadı"; exit 1; }
AG=$(docker inspect ck-caddy -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | tr ' ' '\n' | grep -m1 'ck-dis')
docker rm -f aleph-tampon >/dev/null 2>&1
docker run -d --name aleph-tampon --restart unless-stopped --network "$AG" -m 1500m --cpus 2 \
  -v $D/captures:/veri/captures -v $D/cache:/veri/cache --log-opt max-size=5m --log-opt max-file=2 \
  aleph-tampon:${SURUM:0:7} >/dev/null || { echo "NOT: HATA kapsayıcı başlamadı"; exit 1; }
sleep 4
echo "NOT: kapsayıcı: $(docker ps --filter name=aleph-tampon --format '{{.Status}}') · panel iç: $(docker exec ck-caddy wget -qO- --header 'Host: 127.0.0.1:8100' http://aleph-tampon:8100/ 2>/dev/null | grep -o '<title>[^<]*' | cut -c8-)"
# 3) Kapasite denemesi (Aksaray merkez, ~1 km², bütün kaynaklar dahil Google)
T0=$(date +%s)
docker exec aleph-tampon timeout 900 alephgeo capture create --bbox 38.368 34.025 38.376 34.036 \
  --sources osm terrain satellite streetview mesh --satellite-zoom 18 --step 60 --yes -o /veri/captures/deneme >/tmp/ad.txt 2>&1
echo "NOT: deneme bitti ($(( $(date +%s)-T0 )) sn): $(grep -v '%' /tmp/ad.txt | tail -4 | tr '\n' ' ' | cut -c1-400)"
SON=$(ls -td $D/captures/deneme/aleph-* 2>/dev/null | head -1)
if [ -n "$SON" ]; then
  echo "NOT: toplam boyut $(du -sh $SON | cut -f1) · dosya $(find $SON -type f | wc -l)"
  for k in osm terrain satellite streetview mesh; do echo "NOT:   $k: $(find $SON -ipath "*$k*" -type f | wc -l) dosya, $(du -ch $(find $SON -ipath "*$k*" -type f) 2>/dev/null | tail -1 | cut -f1)"; done
fi
# 4) Kasa: şifre isteği (mevcut listeye ekle, silme)
F=/var/lib/docker/volumes/aesun_aesun_veri/_data/kasa/istenen.json
python3 - "$F" <<'P'
import json, sys, os
p = sys.argv[1]; d = json.load(open(p)) if os.path.exists(p) else {}
d["aleph_panel_sifre"] = "Aleph harita indirme paneli şifresi: kendiniz belirleyin (en az 10 karakter). Kullanıcı adı: omer. Tarayıcı bir kez sorar, sonra hatırlar."
json.dump(d, open(p, "w"), ensure_ascii=False, indent=1)
P
chown 1001:1001 $F; chmod 600 $F
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
