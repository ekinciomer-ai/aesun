#!/usr/bin/env bash
# aesun — Pi envanteri. Sadece OKUR, hicbir seyi degistirmez.
# Gizli bilgileri (sifre, token, key) yildizlar. Ciktiyi kopyalayip gonderin.
#   curl -fsSL https://raw.githubusercontent.com/ekinciomer-ai/aesun/main/pi/envanter.sh | bash
gizle() { sed -E 's/((PASS|PASSWORD|SIFRE|TOKEN|SECRET|KEY|APPKEY)[A-Z_]*[=:][[:space:]]*)[^[:space:]"]+/\1***/Ig'; }
b() { echo; echo "===== $* ====="; }

b "Sistem"
hostname; uname -a; cat /etc/os-release 2>/dev/null | grep -E '^(PRETTY_NAME|VERSION_CODENAME)='
uptime; free -h | head -2; df -h / | tail -1
b "Python"
python3 --version; pip3 --version 2>/dev/null
python3 -c "import playwright; print('playwright', playwright.__version__)" 2>/dev/null || echo "playwright yok"
for m in requests flask bs4 cryptography openpyxl schedule; do python3 -c "import $m" 2>/dev/null && echo "$m var" || echo "$m YOK"; done
b "Ag"
ip -4 -brief addr 2>/dev/null; iw dev wlan0 get power_save 2>/dev/null
tailscale status 2>/dev/null | head -5 || echo "tailscale yok"
b "Calisan servisler (aesun/osos/miner/fusion/sungrow)"
systemctl list-units --type=service --all --no-pager 2>/dev/null | grep -Ei 'osos|miner|fusion|sungrow|inavitas|aesun|otocoin|panel' || echo "ilgili servis yok"
for u in $(systemctl list-unit-files --type=service --no-legend 2>/dev/null | awk '{print $1}' | grep -Ei 'osos|miner|fusion|sungrow|inavitas|aesun|otocoin|panel'); do
  b "Servis dosyasi: $u"; systemctl cat "$u" 2>/dev/null | gizle
  b "Son kayitlar: $u"; journalctl -u "$u" -n 15 --no-pager 2>/dev/null | gizle
done
b "Zamanlanmis isler (crontab)"
crontab -l 2>/dev/null | gizle || echo "crontab yok"
b "Klasorler"
for d in ~/otocoin ~/aesun ~/osos /home/pi/otocoin; do [ -d "$d" ] && { echo "--- $d"; ls -la "$d" | head -40; }; done
b "OSOS toplayicisinin abone listesi"
f=$(ls ~/otocoin/osos_endeks_takip.py /home/pi/otocoin/osos_endeks_takip.py 2>/dev/null | head -1)
[ -n "$f" ] && grep -nE 'json_key|tesisat_no|carpan|GH_REPO|github_yaz|def github' "$f" | head -30 || echo "osos_endeks_takip.py bulunamadi"
b "Bitti"
