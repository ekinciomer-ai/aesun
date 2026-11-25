#!/bin/bash
# Davalar · geçici salt-okunur bağlantı (tek kullanıcı: bulenta). Portal/API'den bağımsız iki kap:
#   dava-gecici : şifreli dava klasörünü YALNIZ OKUR (salt-okunur kap, yetkisiz kullanıcı, dışarıya port yok)
#   dava-tunel  : Cloudflare geçici tüneli → rastgele *.trycloudflare.com adresi (sunucu IP'si / alan adımız görünmez)
# Süre: DG_GUN gün (varsayılan 7). Süre dolunca sayfa 410 verir ve iki kap otomatik kaldırılır. Şifre düz yazılmaz (PBKDF2 özeti).
set -uo pipefail
K="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
D=/opt/dava_gecici; GUN=${DG_GUN:-7}
kaldir() { docker rm -f dava-gecici dava-tunel >/dev/null 2>&1; }
mkdir -p "$D" && cp "$K/dava_gecici/app.py" "$K/dava_gecici/index.html" "$K/dava_gecici/Dockerfile" "$D/"
docker build -q -t dava-gecici:latest "$D" >/tmp/dg_build.txt 2>&1 || { tail -5 /tmp/dg_build.txt | sed 's/^/NOT: /'; echo "NOT: HATA imaj derlenemedi"; exit 1; }
docker network inspect dava-ag >/dev/null 2>&1 || docker network create dava-ag >/dev/null
kaldir
BITIS=$(( $(date +%s) + GUN * 86400 ))
docker run -d --name dava-gecici --restart unless-stopped --network dava-ag --read-only --cap-drop ALL \
  --security-opt no-new-privileges -m 128m --cpus 0.5 --log-opt max-size=2m --log-opt max-file=2 \
  -e DG_KUL=bulenta -e 'DG_PAROLA=UMV+7WEAw80XKee6quvFIg==$f3862cff573e8e3be3c5e3f6cb4aa921330361bee0f61b179208d1d1997a17b9' -e DG_BITIS=$BITIS \
  -v /opt/aesun/ozel/davalar/sunum:/davalar:ro -v /opt/aesun/ozel/davalar/anahtar.bin:/davalar_anahtar:ro \
  dava-gecici:latest >/dev/null || { echo "NOT: HATA dava-gecici başlatılamadı"; kaldir; exit 1; }
docker run -d --name dava-tunel --restart unless-stopped --network dava-ag -m 128m --log-opt max-size=2m --log-opt max-file=2 \
  cloudflare/cloudflared:latest tunnel --no-autoupdate --url http://dava-gecici:8000 >/dev/null || { echo "NOT: HATA tünel başlatılamadı"; kaldir; exit 1; }
A=""
for i in $(seq 1 30); do A=$(docker logs dava-tunel 2>&1 | grep -o 'https://[a-z0-9-]*\.trycloudflare\.com' | tail -1); [ -n "$A" ] && break; sleep 2; done
[ -n "$A" ] || { docker logs dava-tunel 2>&1 | tail -5 | sed 's/^/NOT: /'; echo "NOT: HATA tünel adresi alınamadı, kaldırıldı"; kaldir; exit 1; }
k=0; for i in $(seq 1 20); do k=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$A/"); [ "$k" = 200 ] && break; sleep 3; done
y=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$A/api/dizin")
if [ "$k" != 200 ] || [ "$y" != 401 ]; then echo "NOT: HATA sağlık: sayfa $k, girişsiz liste $y (200/401 beklenir) — kaldırıldı"; kaldir; exit 1; fi
systemctl stop dava-gecici-bitis.timer dava-gecici-bitis.service >/dev/null 2>&1 || true
systemd-run --unit dava-gecici-bitis --on-active="${GUN}d" /usr/bin/docker rm -f dava-gecici dava-tunel >/dev/null 2>&1 \
  && echo "NOT: ${GUN} gün sonra otomatik kapanır" || echo "NOT: otomatik kapanma zamanlanamadı (sayfa yine de süre sonunda 410 verir)"
echo "NOT: sağlık tamam (sayfa 200, girişsiz liste 401)"
echo "NOT: ADRES $A"
