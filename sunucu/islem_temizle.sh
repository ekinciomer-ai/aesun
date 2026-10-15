#!/bin/bash
# Onaylı disk temizliği (15.10.2026): yalnız yeniden üretilebilen önbellekler.
# Çalışan kapsayıcılar, imajlar, birimler (veritabanları), yedekler ve uygulama dosyaları SİLİNMEZ.
set -u
once=$(df -B1 --output=avail / | tail -1)
echo "NOT: önce: $(df -h / | tail -1 | awk '{print $3" dolu / "$2", boş "$4" ("$5")"}')"
docker builder prune -af >/dev/null 2>&1 && echo "NOT: docker derleme önbelleği temizlendi"
journalctl --vacuum-size=200M >/dev/null 2>&1 && echo "NOT: sistem günlüğü 200 MB'a indirildi"
apt-get clean >/dev/null 2>&1 && echo "NOT: apt önbelleği temizlendi"
for d in /root/.npm/_cacache /root/.cache/pip; do [ -d "$d" ] && rm -rf "$d" && echo "NOT: $d temizlendi"; done
sonra=$(df -B1 --output=avail / | tail -1)
echo "NOT: sonra: $(df -h / | tail -1 | awk '{print $3" dolu / "$2", boş "$4" ("$5")"}') · kazanılan $(( (sonra-once)/1024/1024/1024 )) GB"
echo "NOT: kapsayıcılar: $(docker ps --format '{{.Names}}' | tr '\n' ' ')"
# merkez kurulumu için bilgi (yalnız okuma)
echo "NOT: caddy ağları: $(docker inspect $(docker ps -q --filter name=caddy | head -1) --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' 2>/dev/null)"
echo "NOT: caddy kapsayıcı: $(docker ps --filter name=caddy --format '{{.Names}} {{.Image}}')"
echo "NOT: caddy dosyası bağlama: $(docker inspect $(docker ps -q --filter name=caddy | head -1) --format '{{range .Mounts}}{{.Source}}->{{.Destination}} {{end}}' 2>/dev/null)"
echo "NOT: caddy compose: $(ls /opt/caddy 2>/dev/null | tr '\n' ' ')"
echo "NOT: bellek: $(free -m | awk '/Mem/{print $3" MB kullanılıyor / "$2" MB, kullanılabilir "$7" MB"}')"
