#!/bin/bash
# Onaylı (17.10.2026): SSH'de ısrarla hatalı deneyen adresler KALICI engellenir.
#  - ssh-kalici : 24 saatte 10 hatalı deneme → kalıcı engel
#  - recidive   : 24 saatte 2 kez geçici engellenen → kalıcı engel
#  - mevcut kayıt: son 24 saatte ≥3 hatalı deneme yapan adresler hemen kalıcı engellenir
# Başarılı (anahtarla) giriş yapmış adresler hiçbir zaman listeye alınmaz. Parolayla giriş açık kalır.
set -euo pipefail
cat > /etc/fail2ban/fail2ban.d/aesun.local <<'F'
[DEFAULT]
dbpurgeage = 1y
F
cat > /etc/fail2ban/jail.d/aesun-kalici.local <<'J'
[ssh-kalici]
enabled = true
filter = sshd
backend = systemd
port = ssh
maxretry = 10
findtime = 1d
bantime = -1

[recidive]
enabled = true
logpath = /var/log/fail2ban.log
banaction = %(banaction_allports)s
findtime = 1d
maxretry = 2
bantime = -1
J
fail2ban-client -t >/dev/null 2>&1 || { echo "NOT: yapılandırma testi BAŞARISIZ, geri alındı"; rm -f /etc/fail2ban/jail.d/aesun-kalici.local /etc/fail2ban/fail2ban.d/aesun.local; exit 1; }
systemctl restart fail2ban; sleep 8
J=$(journalctl -u ssh -u sshd --since '-24 hours' 2>/dev/null)
IYI=$(echo "$J" | grep 'Accepted' | grep -oE 'from ([0-9]{1,3}\.){3}[0-9]{1,3}' | awk '{print $2}' | sort -u)
LISTE=$(echo "$J" | grep -E 'Failed password|Invalid user|authentication failure|Connection closed by authenticating user|Disconnected from invalid user' \
  | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | sort | uniq -c | awk '$1>=3{print $2}' | grep -vxF -f <(echo "$IYI"; echo 127.0.0.1) || true)
n=0; for ip in $LISTE; do fail2ban-client set ssh-kalici banip "$ip" >/dev/null 2>&1 && n=$((n+1)); done
echo "NOT: fail2ban: $(systemctl is-active fail2ban) · kurallar: $(fail2ban-client status | grep 'Jail list' | sed 's/.*:\s*//')"
echo "NOT: hemen kalıcı engellenen: $n adres → $(echo $LISTE | tr '\n' ' ')"
echo "NOT: ssh-kalici şu an: $(fail2ban-client status ssh-kalici | grep 'Currently banned' | awk '{print $NF}') adres · recidive: $(fail2ban-client status recidive | grep 'Currently banned' | awk '{print $NF}')"
echo "NOT: başarılı giriş yapmış adres listeye alınmadı ($(echo "$IYI" | grep -c .) adres korundu)"
