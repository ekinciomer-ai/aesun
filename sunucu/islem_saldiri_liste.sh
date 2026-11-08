#!/bin/bash
# Salt okuma: son 24 saatte SSH'ye başarısız giriş deneyen adresler (sunucunun kendi güvenlik kaydı).
J=$(journalctl -u ssh -u sshd --since '-24 hours' 2>/dev/null)
F=$(echo "$J" | grep -E 'Failed password|Invalid user|authentication failure|Connection closed by authenticating user|Disconnected from invalid user')
echo "NOT: deneme satırı $(echo "$F" | grep -c .) · farklı adres $(echo "$F" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | sort -u | wc -l)"
echo "NOT: EN ÇOK DENEYEN: $(echo "$F" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' | sort | uniq -c | sort -rn | head -40 | awk '{printf "%s(%s) ", $2, $1}')"
echo "NOT: DENENEN KULLANICI ADLARI: $(echo "$F" | grep -oE '(invalid user|Invalid user|for) [^ ]+' | awk '{print $NF}' | grep -v '^user$' | sort | uniq -c | sort -rn | head -25 | awk '{printf "%s(%s) ", $2, $1}')"
echo "NOT: ŞU AN ENGELLİ: $(fail2ban-client status sshd 2>/dev/null | grep 'Banned IP list' | sed 's/.*list:\s*//')"
echo "NOT: ENGELLENMİŞ OLANLAR (fail2ban kaydı): $(grep -h ' Ban ' /var/log/fail2ban.log* 2>/dev/null | awk '{print $1, substr($2,1,5), $NF}' | tail -20 | tr '\n' ';')"
echo "NOT: BAŞARILI GİRİŞ KAYNAKLARI (anahtarla): $(echo "$J" | grep 'Accepted' | grep -oE 'from ([0-9]{1,3}\.){3}[0-9]{1,3}' | awk '{print $2}' | sort | uniq -c | awk '{printf "%s(%s) ", $2, $1}')"
