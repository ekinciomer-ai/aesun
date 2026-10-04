#!/usr/bin/env bash
# aesun — Pi nabzı + canlı veri. aesun-nabiz.timer her 10 dakikada çalıştırır.
# n8n yanıtı (aesun_son + etkin uyarılar) yerel önbelleğe yazılır; panel buradan okur.
# n8n'e ulaşılamazsa GitHub'daki saatlik yedek (n8n/aesun_son.json) okunur.
set -u
KOK="$(cd "$(dirname "$0")/.." && pwd)"
for f in "$KOK/env.txt" "$KOK/.env"; do [ -f "$f" ] && set -a && . "$f" && set +a; done
URL="${AESUN_NABIZ_URL:-https://xbay.app.n8n.cloud/webhook/aesun-nabiz}"
BASLIK="${AESUN_PI_BASLIK:-X-Aesun-Anahtar}"
ANAHTAR="${AESUN_PI_ANAHTAR:?env.txt içinde AESUN_PI_ANAHTAR tanımlı değil}"
SERVISLER="${AESUN_SERVISLER:-osos altminer}"
ONBELLEK="${AESUN_ONBELLEK:-$KOK/onbellek}"
mkdir -p "$ONBELLEK"
sv=""
for s in $SERVISLER; do d=$(systemctl is-active "$s" 2>/dev/null); sv="$sv\"$s\":\"${d:-unknown}\","; done
disk=$(df -h / | awk 'NR==2{print $5}')
isi=$(awk '{printf "%.0f", $1/1000}' /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
govde="{\"cihaz\":\"saha-pi\",\"servisler\":{${sv%,}},\"not_\":\"$(hostname) disk $disk, CPU ${isi:-?}°C, $(uptime -p)\"}"
gecici="$ONBELLEK/.son.tmp"
if curl -fsS -m 30 -X POST -H 'Content-Type: application/json' -H "$BASLIK: $ANAHTAR" -d "$govde" "$URL" -o "$gecici"; then
  mv "$gecici" "$ONBELLEK/son.json"; echo canli > "$ONBELLEK/kaynak.txt"
elif curl -fsS -m 30 https://raw.githubusercontent.com/ekinciomer-ai/epias-ptf/main/n8n/aesun_son.json -o "$gecici"; then
  mv "$gecici" "$ONBELLEK/son_yedek.json"; echo github_yedek > "$ONBELLEK/kaynak.txt"
else
  echo yok > "$ONBELLEK/kaynak.txt"; rm -f "$gecici"; exit 1
fi
