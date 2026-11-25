#!/bin/bash
# Her 30 dk (cron) ve kurulumda: dosyaları depodan yeniler, anahtar/kayıt, Docker ve kutu imajı, sonra işçi.
set -u
K=/opt/aerig; HAM=https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/rig; API=https://api.aksarayenerji.net
cd $K || exit 1
exec 9>/tmp/aerig.lock; flock -n 9 || { echo "zaten çalışıyor"; exit 0; }
log(){ echo "$(date '+%F %T') $*"; }
[ -f guncelle.log ] && [ $(stat -c%s guncelle.log) -gt 1000000 ] && tail -n 2000 guncelle.log > g.tmp && mv g.tmp guncelle.log
# 1) kendini yenile (bir sonraki çalışmada geçerli)
for f in guncelle.sh isci.sh deneme.sh Dockerfile kaldir.sh; do curl -fsSL --retry 2 "$HAM/$f" -o "$f.yeni" 2>/dev/null && mv "$f.yeni" "$f"; done
chmod +x *.sh
# 2) kimlik: anahtar yalnız bu rig'de (600); sunucuya yalnız özeti gider
[ -s anahtar ] || { head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' > anahtar; chmod 600 anahtar; log "anahtar üretildi"; }
AD=$( (. /hive-config/rig.conf 2>/dev/null; echo "${WORKER_NAME:-$(hostname)}") | tr -cd 'A-Za-z0-9_-' | cut -c1-32)
IF=$(ip route show default 2>/dev/null | awk '{print $5; exit}')
MAC=$(cat /sys/class/net/$IF/address 2>/dev/null | tr a-f A-F)
echo "$AD" > ad
# 3) kazımı durdur (yalnız ilk kurulumda; HiveOS'ta uçuş planını kaldırmak kalıcı yapar)
[ "${1:-}" = ilk ] && command -v miner >/dev/null && { miner stop >/dev/null 2>&1; log "madenci durduruldu"; }
# 4) Docker
if ! command -v docker >/dev/null; then
  log "docker kuruluyor"; apt-get update -qq && DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io >/dev/null || log "HATA docker kurulamadı"
  systemctl enable --now docker >/dev/null 2>&1
fi
# 5) kutu imajı (Dockerfile değişince yeniden)
H=$(sha256sum Dockerfile | cut -c1-12)
if [ "$(cat imaj_surum 2>/dev/null)" != "$H" ]; then
  log "imaj derleniyor ($H)"
  if docker build -q -t aerig:1 . >> imaj.log 2>&1; then echo "$H" > imaj_surum; rm -f deneme_tamam; log "imaj hazır"; else log "HATA imaj (imaj.log)"; fi
fi
# 6) kayıt (onaylanana kadar her turda yenilenir)
OZ=$(sha256sum anahtar | cut -c1-64)
GPU=$(lspci 2>/dev/null | grep -ciE 'vga.*(amd|ati)')
D=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 -H "X-AE-Anahtar: $(cat anahtar)" "$API/v1/veri?a=oku&yol=rig/$AD/nabiz.json")
if [ "$D" = 401 ]; then
  R=$(curl -s --max-time 15 -X POST "$API/v1/rig/kayit" -H 'Content-Type: application/json' \
      -d "{\"ad\":\"$AD\",\"mac\":\"$MAC\",\"ozet\":\"$OZ\",\"gpu\":\"$GPU AMD kart\"}")
  log "kayıt: $R"
fi
# 7) zamanlayıcı
[ -f /etc/cron.d/aerig ] || { echo "*/30 * * * * root bash $K/guncelle.sh >> $K/guncelle.log 2>&1" > /etc/cron.d/aerig; log "zamanlayıcı kuruldu"; }
# 8) işçi
bash $K/isci.sh
