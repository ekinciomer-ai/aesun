#!/bin/bash
# Salt okuma: son 10 saatteki başarılı SSH girişlerinin yöntemi ve kaynak sayısı (IP'ler yazılmaz).
L=$(journalctl -u ssh -u sshd --since '-10 hours' 2>/dev/null | grep 'Accepted')
echo "NOT: başarılı giriş: $(echo "$L" | grep -c Accepted) · anahtarla $(echo "$L" | grep -c 'Accepted publickey') · parolayla $(echo "$L" | grep -c 'Accepted password') · farklı kaynak $(echo "$L" | grep -o 'from [0-9a-f.:]*' | sort -u | wc -l)"
echo "NOT: saatler: $(echo "$L" | awk '{print $3}' | cut -c1-5 | tr '\n' ' ')"
echo "NOT: engellenen adres sayısı (toplam): $(fail2ban-client status sshd 2>/dev/null | grep 'Total banned' | awk '{print $NF}')"
