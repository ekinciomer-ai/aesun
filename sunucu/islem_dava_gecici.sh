#!/bin/bash
# Davalar · geçici salt-okunur bağlantı (tek kullanıcı: bulenta) → https://<sunucu IP>:<port>/
# Portal/API'den bağımsız tek kap (dava-gecici): şifreli dava klasörünü YALNIZ OKUR; salt-okunur kap, yetkisiz kullanıcı.
# Sertifika kendinden imzalı (IP için resmi sertifika alınamıyor): ilk açılışta tarayıcı uyarısı normaldir, trafik şifrelidir.
# Süre: DG_GUN gün (varsayılan 7). Süre dolunca sayfa 410 verir, kap ve port kuralı otomatik kaldırılır. Şifre düz yazılmaz (PBKDF2 özeti).
set -uo pipefail
K="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
D=/opt/dava_gecici; GUN=${DG_GUN:-7}
mkdir -p "$D/tls"
[ -s "$D/port" ] || echo $(( 40000 + RANDOM % 10000 )) > "$D/port"
P=$(cat "$D/port")
IP=$(curl -s4 --max-time 5 https://api.ipify.org || hostname -I | awk '{print $1}')
kaldir() { docker rm -f dava-gecici dava-tunel >/dev/null 2>&1; command -v ufw >/dev/null && ufw delete allow "$P/tcp" >/dev/null 2>&1; true; }
cp "$K/dava_gecici/app.py" "$K/dava_gecici/index.html" "$K/dava_gecici/Dockerfile" "$D/"
if [ ! -s "$D/tls/cert.pem" ]; then
  openssl req -x509 -newkey rsa:2048 -nodes -days 30 -subj "/CN=$IP" -addext "subjectAltName=IP:$IP" \
    -keyout "$D/tls/key.pem" -out "$D/tls/cert.pem" >/dev/null 2>&1 || { echo "NOT: HATA sertifika üretilemedi"; exit 1; }
fi
chown -R 1001:1001 "$D/tls"; chmod 700 "$D/tls"; chmod 400 "$D/tls/key.pem"; chmod 444 "$D/tls/cert.pem"
docker build -q -t dava-gecici:latest "$D" >/tmp/dg_build.txt 2>&1 || { tail -5 /tmp/dg_build.txt | sed 's/^/NOT: /'; echo "NOT: HATA imaj derlenemedi"; exit 1; }
docker rm -f dava-gecici dava-tunel >/dev/null 2>&1
BITIS=$(( $(date +%s) + GUN * 86400 ))
docker run -d --name dava-gecici --restart unless-stopped -p "$P:8443" --read-only --cap-drop ALL \
  --security-opt no-new-privileges -m 128m --cpus 0.5 --log-opt max-size=2m --log-opt max-file=2 \
  -e DG_KUL=bulenta -e 'DG_PAROLA=UMV+7WEAw80XKee6quvFIg==$f3862cff573e8e3be3c5e3f6cb4aa921330361bee0f61b179208d1d1997a17b9' -e DG_BITIS=$BITIS \
  -v /opt/aesun/ozel/davalar/sunum:/davalar:ro -v /opt/aesun/ozel/davalar/anahtar.bin:/davalar_anahtar:ro -v "$D/tls:/tls:ro" \
  dava-gecici:latest >/dev/null || { echo "NOT: HATA dava-gecici başlatılamadı"; kaldir; exit 1; }
command -v ufw >/dev/null && ufw status 2>/dev/null | grep -q "Status: active" && ufw allow "$P/tcp" comment dava-gecici >/dev/null
A="https://$IP:$P/"
k=0; for i in $(seq 1 20); do k=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "$A"); [ "$k" = 200 ] && break; sleep 2; done
y=$(curl -sk -o /dev/null -w '%{http_code}' --max-time 10 "${A}api/dizin")
if [ "$k" != 200 ] || [ "$y" != 401 ]; then docker logs dava-gecici 2>&1 | tail -3 | sed 's/^/NOT: /'; echo "NOT: HATA sağlık: sayfa $k, girişsiz liste $y (200/401 beklenir) — kaldırıldı"; kaldir; exit 1; fi
systemctl stop dava-gecici-bitis.timer dava-gecici-bitis.service >/dev/null 2>&1 || true
systemd-run --unit dava-gecici-bitis --on-active="${GUN}d" /bin/sh -c "docker rm -f dava-gecici; ufw delete allow $P/tcp || true" >/dev/null 2>&1 \
  && echo "NOT: ${GUN} gün sonra otomatik kapanır" || echo "NOT: otomatik kapanma zamanlanamadı (sayfa yine de süre sonunda 410 verir)"
echo "NOT: sağlık tamam (sayfa 200, girişsiz liste 401)"
echo "NOT: ADRES $A"
