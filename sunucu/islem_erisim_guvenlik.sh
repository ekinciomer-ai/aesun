#!/bin/bash
# Onaylı (25.10.2026, Ömer): tüm giriş/erişim denemeleri tek yerde + API saldırganlarına otomatik engel.
#  1) aesun-api yeniden derlenir (erişim günlüğü /veri/erisim: red.log, iyi_ip.json, giris.jsonl; POST /v1/olay/giris)
#  2) bekçi + guvenlik.py güncellenir
#  3) fail2ban: aesun-api-tarama (10 dk'da 3 zafiyet taraması → 1 gün, artan) ve aesun-api-yetki (10 dk'da 20 red → 1 sa, artan)
#     Son 7 günde geçerli anahtar/çerezle başarılı istek yapan adresler (Pi, cPanel köprüsü, kullanıcılar) ASLA engellenmez.
#     Engel yalnız Docker üzerinden gelen web trafiğine (Caddy) uygulanır; SSH kuralları ve diğer uygulamalar değişmez.
# Doğrulama başarısızsa fail2ban değişikliği geri alınır.
set -euo pipefail
cp -r sunucu/aesun/. /opt/aesun/ && chmod 700 /opt/aesun/bekci.sh /opt/aesun/guvenlik.py
cd /opt/aesun && docker compose build -q api && docker compose up -d --no-deps api >/dev/null 2>&1 && cd - >/dev/null
sleep 8
docker exec -u root aesun-api sh -c 'mkdir -p /veri/erisim && touch /veri/erisim/red.log /veri/erisim/giris.jsonl && chown -R 1001:1001 /veri/erisim'
KAYNAK=$(docker inspect aesun-api --format '{{range .Mounts}}{{if eq .Destination "/veri"}}{{.Source}}{{end}}{{end}}')
LOG=$KAYNAK/erisim/red.log; IYI=$KAYNAK/erisim/iyi_ip.json
[ -f "$LOG" ] || { echo "NOT: red.log bulunamadı ($LOG)"; exit 1; }
echo "NOT: api: $(docker inspect -f '{{.State.Status}}' aesun-api) · günlük: $LOG"
# test isteği: tarama satırı oluşmalı (127.0.0.1 → ignoreip, engellenmez)
curl -s -o /dev/null --max-time 10 https://api.aksarayenerji.net/.env || true
sleep 2; echo "NOT: red.log son satır: $(tail -1 $LOG | sed -E 's/ip=[0-9a-f.:]+/ip=***/')"

cat > /opt/aesun/f2b_iyi.sh <<S
#!/bin/bash
# 0 = engelleme (son 7 günde geçerli anahtarla başarılı istek yapmış adres)
python3 -c "import json,sys,time;d=json.load(open('$IYI'));sys.exit(0 if time.time()-d.get(sys.argv[1],0)<7*86400 else 1)" "\$1" 2>/dev/null
S
chmod 700 /opt/aesun/f2b_iyi.sh

CHAIN=DOCKER-USER
[ "$(docker inspect gesfin-caddy -f '{{.HostConfig.NetworkMode}}' 2>/dev/null)" = host ] && CHAIN=INPUT
cat > /etc/fail2ban/filter.d/aesun-api-tarama.conf <<'F'
[Definition]
datepattern = ^%%Y-%%m-%%dT%%H:%%M:%%S%%z
failregex = ^\s*RED ip=<HOST> kod=\d+ tur=tarama\b
F
cat > /etc/fail2ban/filter.d/aesun-api-yetki.conf <<'F'
[Definition]
datepattern = ^%%Y-%%m-%%dT%%H:%%M:%%S%%z
failregex = ^\s*RED ip=<HOST> kod=\d+ tur=(?:yetkisiz|hiz)\b
F
SUNUCU_IP=$(hostname -I | tr ' ' '\n' | grep -E '^[0-9.]+$' | head -3 | tr '\n' ' ')
cat > /etc/fail2ban/jail.d/aesun-api.local <<J
[aesun-api-tarama]
enabled = true
backend = auto
filter = aesun-api-tarama
logpath = $LOG
maxretry = 3
findtime = 10m
bantime = 1d
bantime.increment = true
bantime.maxtime = 4w
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 100.64.0.0/10 $SUNUCU_IP
ignorecommand = /opt/aesun/f2b_iyi.sh <ip>
action = iptables-allports[name=aesun-api-tarama, chain=$CHAIN, protocol=all]

[aesun-api-yetki]
enabled = true
backend = auto
filter = aesun-api-yetki
logpath = $LOG
maxretry = 20
findtime = 10m
bantime = 1h
bantime.increment = true
bantime.maxtime = 1w
ignoreip = 127.0.0.1/8 ::1 10.0.0.0/8 172.16.0.0/12 192.168.0.0/16 100.64.0.0/10 $SUNUCU_IP
ignorecommand = /opt/aesun/f2b_iyi.sh <ip>
action = iptables-allports[name=aesun-api-yetki, chain=$CHAIN, protocol=all]
J
geri() { rm -f /etc/fail2ban/jail.d/aesun-api.local /etc/fail2ban/filter.d/aesun-api-*.conf; systemctl restart fail2ban; echo "NOT: $1 — fail2ban API kuralı GERİ ALINDI (SSH koruması aynen çalışıyor)"; exit 1; }
printf '%s RED ip=203.0.113.77 kod=404 tur=tarama yontem=GET yol=/.env\n%s RED ip=203.0.113.78 kod=401 tur=yetkisiz yontem=GET yol=/v1/dosya/x.json\n' "$(date -u +%Y-%m-%dT%H:%M:%S+0000)" "$(date -u +%Y-%m-%dT%H:%M:%S+0000)" > /tmp/f2b_ornek.log
T1=$(fail2ban-regex /tmp/f2b_ornek.log /etc/fail2ban/filter.d/aesun-api-tarama.conf 2>/dev/null | grep -oE '^Lines: .* ([0-9]+) matched' | grep -oE '[0-9]+ matched' | head -1)
T2=$(fail2ban-regex /tmp/f2b_ornek.log /etc/fail2ban/filter.d/aesun-api-yetki.conf 2>/dev/null | grep -oE '[0-9]+ matched' | head -1)
echo "NOT: süzgeç testi: tarama=$T1 · yetki=$T2 (beklenen 1 ve 1)"
[ "${T1%% *}" = 1 ] && [ "${T2%% *}" = 1 ] || geri "süzgeç testi başarısız"
fail2ban-client -t >/dev/null 2>&1 || geri "yapılandırma testi başarısız"
systemctl restart fail2ban; sleep 8
fail2ban-client status aesun-api-tarama >/dev/null 2>&1 && fail2ban-client status aesun-api-yetki >/dev/null 2>&1 || geri "kurallar başlamadı"
echo "NOT: fail2ban: $(systemctl is-active fail2ban) · kurallar: $(fail2ban-client status | grep 'Jail list' | sed 's/.*:\s*//') · zincir $CHAIN"
echo "NOT: SSH hâlâ korumada: $(fail2ban-client status sshd | grep 'Currently banned' | awk '{print $NF}') engelli"
# mevcut günlükteki ısrarcı tarayıcılar hemen engellenir (iyi listedekiler hariç)
n=0; for ip in $(grep 'tur=tarama' $LOG | grep -oE 'ip=[^ ]+' | cut -d= -f2 | sort | uniq -c | awk '$1>=3{print $2}'); do
  /opt/aesun/f2b_iyi.sh "$ip" && continue
  case "$ip" in 127.*|10.*|172.1[6-9].*|172.2?.*|172.3[01].*|192.168.*) continue;; esac
  fail2ban-client set aesun-api-tarama banip "$ip" >/dev/null 2>&1 && n=$((n+1)); done
echo "NOT: hemen engellenen tarayıcı: $n · korunan (iyi) adres: $(python3 -c "import json;print(len(json.load(open('$IYI'))))" 2>/dev/null || echo 0)"
systemctl start aesun-bekci.service || true
python3 /opt/aesun/guvenlik.py --zorla 2>&1 | tail -1 | sed 's/^/NOT: /'
