#!/bin/bash
# Salt okuma: ns1 dış saldırı yüzeyi (en çok 9 NOT satırı). Hiçbir ayar değiştirilmez.
echo "NOT: güvenlik duvarı: ufw=$(ufw status 2>/dev/null | head -1 | awk '{print $2}') · iptables INPUT politikası=$(iptables -S INPUT 2>/dev/null | head -1 | awk '{print $3}') · DROP/REJECT kural=$(iptables -S 2>/dev/null | grep -c 'DROP\|REJECT')"
echo "NOT: dışa açık portlar: $(ss -H -tlnp | awk '{print $4}' | grep -v '^127\.\|^\[::1\]\|%lo' | sed 's/.*://' | sort -un | tr '\n' ' ')"
echo "NOT: docker yayınları: $(docker ps --format '{{.Names}}:{{.Ports}}' | grep -o '^[^:]*:\|0\.0\.0\.0:[0-9]*' | tr '\n' ' ' | sed 's/: 0/:0/g' | cut -c1-250)"
echo "NOT: ssh: $(sshd -T 2>/dev/null | grep -E '^(port|permitrootlogin|passwordauthentication|kbdinteractiveauthentication|maxauthtries) ' | tr '\n' ' ')"
echo "NOT: fail2ban=$(systemctl is-active fail2ban 2>/dev/null) · 24 saatte başarısız ssh denemesi=$(journalctl -u ssh -u sshd --since '24 hours ago' 2>/dev/null | grep -c 'Failed password\|Invalid user') · farklı IP=$(journalctl -u ssh -u sshd --since '24 hours ago' 2>/dev/null | grep -o 'from [0-9.]*' | sort -u | wc -l)"
echo "NOT: root anahtar sayısı=$(grep -cE '^(ssh-|ecdsa-)' /root/.ssh/authorized_keys 2>/dev/null) · kabuklu kullanıcılar=$(awk -F: '$7 ~ /(ba|z)?sh$/ {print $1}' /etc/passwd | tr '\n' ' ')"
echo "NOT: otomatik güvenlik güncellemesi=$(systemctl is-enabled unattended-upgrades 2>/dev/null) · bekleyen güncelleme=$(apt list --upgradable 2>/dev/null | grep -c security) · yeniden başlatma gerekli=$([ -f /var/run/reboot-required ] && echo evet || echo hayır)"
