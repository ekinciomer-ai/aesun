#!/bin/bash
# Salt okuma: genel durum (en çok 9 NOT satırı).
echo "NOT: fail2ban: $(systemctl is-active fail2ban) · $(fail2ban-client status sshd 2>/dev/null | grep -E 'Total failed|Currently banned|Total banned' | sed 's/.*- //' | tr -s '\t ' ' ' | tr '\n' ';')"
echo "NOT: gece başarısız ssh: $(journalctl -u ssh -u sshd --since '-8 hours' 2>/dev/null | grep -c 'Failed password\|Invalid user') · başarılı giriş: $(journalctl -u ssh -u sshd --since '-8 hours' 2>/dev/null | grep -c 'Accepted')"
echo "NOT: api: $(curl -s --max-time 15 https://api.aksarayenerji.net/v1/saglik | cut -c1-110)"
echo "NOT: işler: $(docker exec aesun-isler cat /veri/durum.json 2>/dev/null | python3 -c "import json,sys;d=json.load(sys.stdin);print('; '.join(f\"{k}: {v.get('son','?')[-14:] if isinstance(v,dict) else v} {v.get('sonuc','') if isinstance(v,dict) else ''}\" for k,v in list(d.items())[:5]))" 2>&1 | cut -c1-260)"
echo "NOT: demo: şifresiz $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://159.198.76.80/) · demo/demo $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -u demo:demo https://159.198.76.80/) · sertifika $(echo | openssl s_client -connect 159.198.76.80:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)"
echo "NOT: portal $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://portal.aksarayenerji.net/) · disk $(df -h / | tail -1 | awk '{print $5}') · bellek kullanılabilir $(free -m | awk '/Mem/{print $7}') MB · kapsayıcı $(docker ps -q | wc -l) çalışıyor, $(docker ps -aq --filter status=exited --filter status=restarting | wc -l) durmuş"
