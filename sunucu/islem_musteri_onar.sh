#!/bin/bash
# aesun-musteri onarımı: yalnız müşteri toplayıcısı yeniden derlenir. Önceki imaj saklanır; 90 sn içinde yeniden
# çökme olursa otomatik geri alınır. Diğer kapsayıcılara dokunulmaz.
set -uo pipefail
ONCE=$(docker inspect aesun-musteri --format '{{.Image}}'); R0=$(docker inspect -f '{{.RestartCount}}' aesun-musteri)
mkdir -p /opt/aesun/musteri.onceki && cp -a /opt/aesun/musteri/. /opt/aesun/musteri.onceki/
cp -a sunucu/aesun/musteri/. /opt/aesun/musteri/
cd /opt/aesun
if ! docker compose build -q musteri >/tmp/m_build.log 2>&1; then echo "NOT: HATA derleme: $(tail -2 /tmp/m_build.log | tr '\n' ' ')"; cp -a musteri.onceki/. musteri/; exit 1; fi
docker compose up -d --no-deps musteri >/dev/null 2>&1
sleep 90
R1=$(docker inspect -f '{{.RestartCount}}' aesun-musteri); ST=$(docker inspect -f '{{.State.Status}}' aesun-musteri)
if [ "$ST" = running ] && [ "$R1" -le 1 ]; then
  echo "NOT: müşteri toplayıcısı yeni sürümde çalışıyor · yeniden başlama $R1 (önce $R0) · cpu $(docker stats --no-stream --format '{{.CPUPerc}}' aesun-musteri)"
  echo "NOT: son günlük: $(docker logs --tail 6 aesun-musteri 2>&1 | cut -c1-140 | tr '\n' ' ')"
  rm -rf musteri.onceki
else
  echo "NOT: HATA yeni sürüm kararsız (durum=$ST yeniden=$R1) · geri alınıyor"
  cp -a musteri.onceki/. musteri/; docker tag "$ONCE" aesun-musteri:latest 2>/dev/null; docker compose up -d --no-deps musteri >/dev/null 2>&1
  echo "NOT: geri alındı"; exit 1
fi
