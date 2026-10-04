#!/usr/bin/env bash
# aesun — Pi nabzı. n8n'e "hayattayım" ve servis durumlarını yollar.
# systemd zamanlayıcısı (aesun-nabiz.timer) her 5 dakikada çalıştırır.
URL="${AESUN_NABIZ_URL:-https://xbay.app.n8n.cloud/webhook/aesun-pi-nabiz}"
SERVISLER="${AESUN_SERVISLER:-osos altminer}"
sv=""
for s in $SERVISLER; do
  d=$(systemctl is-active "$s" 2>/dev/null); sv="$sv\"$s\":\"${d:-unknown}\","
done
disk=$(df -h / | awk 'NR==2{print $5}')
isi=$(awk '{printf "%.0f", $1/1000}' /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
govde="{\"cihaz\":\"$(hostname)\",\"servisler\":{${sv%,}},\"not_\":\"disk $disk, CPU ${isi:-?}°C, uptime $(uptime -p)\"}"
curl -fsS -m 20 -X POST -H 'Content-Type: application/json' -d "$govde" "$URL" >/dev/null
