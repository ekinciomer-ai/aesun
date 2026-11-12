#!/bin/bash
# AVY · Arazi Veri Yönetimi (belluxx/aleph çekirdeği + Portal Tek Giriş SSO + Türkçe arayüz)
# /opt/tampon/aleph altındaki mevcut önbelleği (Geofabrik Türkiye OSM) ve çekimleri korur.
# Dışarıdan şifresiz erişime kapalıdır; yalnız Aksaray Enerji Portal yönetici oturumuyla (SSO) açılır.
set -uo pipefail

SURUM=1b307cdb7c470a7715da497ba406355dfe7d3163
KAYNAK_DIZIN="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
D=/opt/tampon/aleph
EK=/opt/cutkoda/caddy-ek/avy.caddy
ESKI_EK=/opt/cutkoda/caddy-ek/aleph.caddy

mkdir -p "$D/captures" "$D/cache"

# Daha önce alt klasöre (deneme/) alınmış çekim varsa doğrudan Arazi Kayıtları listesinde görünsün diye üst klasöre taşı
if [ -d "$D/captures/deneme" ]; then
  for k in "$D/captures/deneme"/aleph-*; do
    [ -d "$k" ] && [ ! -e "$D/captures/$(basename "$k")" ] && mv "$k" "$D/captures/" || true
  done
fi

# 1) Aleph çekirdek kodu (yoksa veya sürüm farklıysa indir)
MEVCUT_SURUM=$(git -C "$D/kod" rev-parse HEAD 2>/dev/null || true)
if [ "$MEVCUT_SURUM" != "$SURUM" ]; then
  rm -rf "$D/kod.yeni"
  git clone -q https://github.com/belluxx/aleph "$D/kod.yeni" && git -C "$D/kod.yeni" checkout -q "$SURUM" \
    || { echo "NOT: HATA avy çekirdeği indirilemedi"; rm -rf "$D/kod.yeni"; exit 1; }
  rm -rf "$D/kod" && mv "$D/kod.yeni" "$D/kod"
fi

# 2) AVY Portal SSO + Türkçe arayüz başlatıcısı
cp "$KAYNAK_DIZIN/avy/baslat.py" "$D/baslat.py"

# 3) İmaj derleme (aleph-tampon tabanı varsa saniyeler içinde katman ekler; yoksa sıfırdan kurar)
if docker image inspect "aleph-tampon:${SURUM:0:7}" >/dev/null 2>&1; then
  cat > "$D/Dockerfile" <<F
FROM aleph-tampon:${SURUM:0:7}
USER root
COPY --chown=1500:1500 baslat.py /baslat.py
USER aleph
CMD ["python", "/baslat.py"]
F
else
  cat > "$D/Dockerfile" <<'F'
FROM python:3.12-slim
COPY kod /kod
RUN pip install --no-cache-dir "numpy<2.3" /kod && useradd -u 1500 -m aleph
COPY --chown=1500:1500 baslat.py /baslat.py
USER aleph
CMD ["python", "/baslat.py"]
F
fi

chown -R 1500:1500 "$D/captures" "$D/cache"
docker build -q -t avy-servis:latest "$D" >/tmp/avy_build.txt 2>&1 \
  || { tail -5 /tmp/avy_build.txt | sed 's/^/NOT: /'; echo "NOT: HATA avy imajı derlenemedi"; exit 1; }

IP=$(curl -s4 --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')
AG=$(docker inspect ck-caddy -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' | tr ' ' '\n' | grep -m1 'ck-dis')

# Eski aleph-tampon kabını kaldır (çift bellek tüketmesin), avy-servis kabını başlat
docker rm -f aleph-tampon avy-servis >/dev/null 2>&1 || true
docker run -d --name avy-servis --restart unless-stopped --network "$AG" -m 1500m --cpus 2 \
  -v "$D/captures:/veri/captures" -v "$D/cache:/veri/cache" \
  --add-host "api.aksarayenerji.net:$IP" --add-host "portal.aksarayenerji.net:$IP" \
  --log-opt max-size=5m --log-opt max-file=2 \
  avy-servis:latest >/dev/null || { echo "NOT: HATA avy-servis başlatılamadı"; exit 1; }

sleep 3
IC_SAGLIK=$(docker exec ck-caddy wget -qO- --header 'Host: 127.0.0.1:8100' http://avy-servis:8100/saglik 2>/dev/null || true)
echo "NOT: avy-servis: $(docker ps --filter name=avy-servis --format '{{.Status}}') · sağlık: $IC_SAGLIK"

# 4) Caddy: avy.<ip>.sslip.io (ve geriye dönük aleph.<ip>.sslip.io) → avy-servis:8100 (Portal SSO korumalı)
AD_AVY="avy.$(echo "$IP" | tr . -).sslip.io"
AD_ESKI="aleph.$(echo "$IP" | tr . -).sslip.io"
YEDEK_AVY=""; [ -f "$EK" ] && YEDEK_AVY=$(cat "$EK")
YEDEK_ESKI=""; [ -f "$ESKI_EK" ] && YEDEK_ESKI=$(cat "$ESKI_EK")
rm -f "$ESKI_EK"

cat > "$EK" <<C
# AVY · Arazi Veri Yönetimi (Portal SSO korumalı)
$AD_AVY, $AD_ESKI {
	encode zstd gzip
	header {
		Strict-Transport-Security "max-age=31536000"
		X-Robots-Tag "noindex, nofollow"
		X-Content-Type-Options nosniff
		Referrer-Policy same-origin
		-Server
	}
	reverse_proxy avy-servis:8100 {
		header_up Host 127.0.0.1:8100
		header_up -Origin
	}
}
C

if docker exec ck-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/tmp/avy_caddy.txt 2>&1 \
   && docker exec ck-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >>/tmp/avy_caddy.txt 2>&1; then
  echo "NOT: AVY Caddy yayında: https://$AD_AVY/"
else
  echo "NOT: AVY Caddy HATA, geri alındı: $(grep -i error /tmp/avy_caddy.txt | tail -1 | cut -c1-250)"
  rm -f "$EK"
  [ -n "$YEDEK_AVY" ] && printf '%s\n' "$YEDEK_AVY" > "$EK"
  [ -n "$YEDEK_ESKI" ] && printf '%s\n' "$YEDEK_ESKI" > "$ESKI_EK"
  docker exec ck-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1 || true
  exit 1
fi

for i in $(seq 1 12); do
  KOD=$(curl -s -o /dev/null -w '%{http_code}' --max-time 6 "https://$AD_AVY/saglik" || true)
  [ "$KOD" = "200" ] && break
  sleep 4
done
echo "NOT: AVY dış kontrol: saglik=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$AD_AVY/saglik") · kok=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$AD_AVY/") (302 beklenir)"
