#!/bin/bash
# Onaylı (16.10.2026): fail2ban kurulumu — yalnız SSH koruması. 10 dk içinde 5 yanlış deneme → 1 saat engel (tekrarlayana artan süre).
# Parolayla giriş açık kalır; diğer uygulamalara ve Docker kurallarına dokunulmaz.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive
command -v fail2ban-client >/dev/null || { apt-get update -qq >/dev/null; apt-get install -y -qq fail2ban >/dev/null; }
cat > /etc/fail2ban/jail.d/aesun-ssh.local <<'J'
[DEFAULT]
ignoreip = 127.0.0.1/8 ::1
bantime = 1h
bantime.increment = true
bantime.maxtime = 1w
findtime = 10m
maxretry = 5
backend = systemd

[sshd]
enabled = true
port = ssh
J
fail2ban-client -t >/dev/null 2>&1 || { echo "NOT: yapılandırma testi BAŞARISIZ, kaldırıldı"; rm -f /etc/fail2ban/jail.d/aesun-ssh.local; exit 1; }
systemctl enable fail2ban >/dev/null 2>&1
systemctl restart fail2ban
sleep 6
echo "NOT: fail2ban: $(systemctl is-active fail2ban) · sürüm $(fail2ban-client --version 2>/dev/null | head -1)"
echo "NOT: sshd koruması: $(fail2ban-client status sshd 2>/dev/null | grep -E 'Currently failed|Currently banned|Total banned' | sed 's/.*- //' | tr -s '\t ' ' ' | tr '\n' ';')"
echo "NOT: ayar: 10 dk içinde 5 yanlış → 1 saat engel (tekrarlayana artan, en çok 1 hafta) · parolayla giriş açık"
