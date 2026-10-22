#!/bin/bash
# Salt okunur: ns1'den OSB Ace Center'a (95.9.199.129:7080) erişim ve toplayıcı durumu. Sır basmaz.
set -uo pipefail
echo "NOT: Ace Center giriş sayfası HTTP $(curl -s -o /dev/null -m 15 -w '%{http_code}' http://95.9.199.129:7080/Account/Login || echo erişilemedi)"
echo "NOT: OSB_KULLANICI tanımlı: $(grep -c '^OSB_KULLANICI' /opt/aesun/musteri.env 2>/dev/null || echo 0)"
echo "NOT: ACE_OTURUM tanımlı: $(grep -c '^ACE_OTURUM=.' /opt/aesun/musteri.env 2>/dev/null || echo 0)"
docker exec aesun-musteri python3 -c "
import json; d=json.load(open('/musteri/durum.json')); a=d.get('hesaplar',{}).get('ace'); print('NOT: ace:', json.dumps(a, ensure_ascii=False))
" 2>/dev/null || echo "NOT: durum okunamadı"
