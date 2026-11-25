#!/bin/bash
# aesun-api güncelle (yalnız api kapsayıcısı): önce yedek, sonra derle ve başlat, sağlık kontrolü; başarısızsa otomatik geri alma.
# 23.11.2026: /v1/komut (panelden cihaz komutu, n8n yerine).
# 25.11.2026: Özel Alan kullanıcı yetkileri (oz_* rolleri: asistan, davalar) + /v1/portal/teklif.
set -uo pipefail
Y=/opt/aesun/yedek_api_$(date +%Y%m%d%H%M%S)
mkdir -p "$Y" && cp -a /opt/aesun/*.py /opt/aesun/Dockerfile /opt/aesun/docker-compose.yml "$Y"/ 2>/dev/null
echo "NOT: yedek $Y"
cp -r sunucu/aesun/. /opt/aesun/
cd /opt/aesun
docker compose build -q api && docker compose up -d --no-deps api
saglik() {
  for i in $(seq 1 20); do
    k=$(docker exec aesun-api python -c "import urllib.request as u;print(u.urlopen('http://127.0.0.1:8000/v1/saglik',timeout=5).status)" 2>/dev/null)
    [ "$k" = 200 ] && return 0; sleep 3
  done; return 1
}
if saglik; then
  echo "NOT: sağlık 200 · komut yetkisiz: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST https://api.aksarayenerji.net/v1/komut -H 'Content-Type: application/json' -d '{"action":"wake","targets":"all"}') (401 beklenir)"
  echo "NOT: dış adres sağlık: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/saglik)"
else
  echo "NOT: SAĞLIK BAŞARISIZ — geri alınıyor"
  cp -a "$Y"/. /opt/aesun/ && docker compose build -q api && docker compose up -d --no-deps api
  saglik && echo "NOT: geri alındı, eski sürüm çalışıyor" || echo "NOT: geri alma sonrası da sağlıksız!"
  exit 1
fi
