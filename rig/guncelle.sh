#!/bin/bash
# Her 30 dk (cron) ve kurulumda: dosyaları depodan yeniler, anahtar/kayıt, Docker ve kutu imajı, sonra işçi.
set -u
K=/opt/aerig; HAM=https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/rig; API=https://api.aksarayenerji.net
cd $K || exit 1
exec 9>/tmp/aerig.lock; flock -n 9 || { echo "zaten çalışıyor"; exit 0; }
log(){ echo "$(date '+%F %T') $*"; }
[ -f guncelle.log ] && [ $(stat -c%s guncelle.log) -gt 1000000 ] && tail -n 2000 guncelle.log > g.tmp && mv g.tmp guncelle.log
# 1) kendini yenile (bir sonraki çalışmada geçerli)
ESKI=$(sha256sum guncelle.sh | cut -c1-16)
for f in guncelle.sh isci.sh deneme.sh Dockerfile kaldir.sh; do curl -fsSL --retry 2 "$HAM/$f" -o "$f.yeni" 2>/dev/null && mv "$f.yeni" "$f"; done
chmod +x *.sh
# kendisi değiştiyse yeni sürümle hemen yeniden başla (bir kez)
[ -z "${AERIG_YENI:-}" ] && [ "$ESKI" != "$(sha256sum guncelle.sh | cut -c1-16)" ] && { log "betik yenilendi, yeniden başlıyor"; AERIG_YENI=1 exec bash $K/guncelle.sh "$@"; }
# 2) kimlik: anahtar yalnız bu rig'de (600); sunucuya yalnız özeti gider
[ -s anahtar ] || { head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n' > anahtar; chmod 600 anahtar; log "anahtar üretildi"; }
AD=$( (. /hive-config/rig.conf 2>/dev/null; echo "${WORKER_NAME:-$(hostname)}") | tr -cd 'A-Za-z0-9_-' | cut -c1-32)
IF=$(ip route show default 2>/dev/null | awk '{print $5; exit}')
MAC=$(cat /sys/class/net/$IF/address 2>/dev/null | tr a-f A-F)
echo "$AD" > ad
# 3) kazımı durdur (yalnız ilk kurulumda; HiveOS'ta uçuş planını kaldırmak kalıcı yapar)
[ "${1:-}" = ilk ] && command -v miner >/dev/null && { miner stop >/dev/null 2>&1; log "madenci durduruldu"; }
# 3b) saat: sunucunun saatine göre (fark 60 sn'den büyükse); geri saat paket indirmeyi bozar
SS=$(curl -sI --max-time 15 $API/v1/saglik | tr -d '\r' | sed -n 's/^[Dd]ate: //p')
if [ -n "$SS" ]; then F=$(( $(date -d "$SS" +%s) - $(date +%s) )); F=${F#-}
  [ "$F" -gt 60 ] && { date -s "$SS" >/dev/null && hwclock -w 2>/dev/null; log "saat düzeltildi (fark ${F} sn)"; }; fi
# 4) Docker: önce paket kaynağı, olmazsa resmi hazır paket (download.docker.com, sabit sürüm)
if ! command -v docker >/dev/null; then
  log "docker kuruluyor (apt)"
  apt-get update -qq > apt.log 2>&1      # bozuk üçüncü taraf kaynak (ör. openvpn) olsa da kuruluma devam
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq docker.io >> apt.log 2>&1 || log "HATA apt: $(grep -E '^E:' apt.log | tail -n 2 | tr '\n' ' ' | cut -c1-300)"
  if ! command -v docker >/dev/null; then
    log "docker kuruluyor (hazır paket)"
    KOD=$(curl -sSL --retry 3 -w '%{http_code}' -o $K/docker.tgz https://download.docker.com/linux/static/stable/x86_64/docker-27.3.1.tgz 2>>apt.log)
    if [ "$KOD" = 200 ] && rm -rf $K/dockerbin && mkdir -p $K/dockerbin && tar xzf $K/docker.tgz -C $K/dockerbin --strip-components=1; then
      for b in $K/dockerbin/*; do ln -sf "$b" /usr/local/bin/$(basename "$b"); done; rm -f $K/docker.tgz
      cat > /etc/systemd/system/docker.service <<UNIT
[Unit]
Description=Docker (aerig)
After=network-online.target
[Service]
ExecStart=/usr/local/bin/dockerd --data-root /var/lib/docker
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
      systemctl daemon-reload; log "docker hazır paket kuruldu"
    else log "HATA hazır paket: http $KOD $(tail -n 1 apt.log | cut -c1-200)"; fi
  fi
  systemctl enable --now docker >/dev/null 2>&1; sleep 5
fi
docker info >/dev/null 2>&1 || { systemctl restart docker >/dev/null 2>&1; sleep 8; }
docker info >/dev/null 2>&1 || log "HATA docker çalışmıyor: $(journalctl -u docker -n 3 --no-pager 2>/dev/null | tail -n 2 | tr '\n' ' ' | cut -c1-300)"
# 5) kutu imajı (Dockerfile değişince yeniden)
H=$(sha256sum Dockerfile | cut -c1-12)
if [ "$(cat imaj_surum 2>/dev/null)" != "$H" ]; then
  log "imaj derleniyor ($H)"
  if docker build -q -t aerig:1 . > imaj.log 2>&1; then echo "$H" > imaj_surum; rm -f deneme_tamam; log "imaj hazır"; else log "HATA imaj: $(tail -n 3 imaj.log | tr '\n' ' ' | cut -c1-300)"; fi
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
