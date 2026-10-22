#!/bin/bash
# Salt okunur: ns1'den OSB Ace Center'a (95.9.199.129:7080) erişim ve toplayıcı durumu. Sır basmaz.
set -uo pipefail
echo "NOT: Ace Center giriş sayfası HTTP $(curl -s -o /dev/null -m 15 -w '%{http_code}' http://95.9.199.129:7080/Account/Login || echo erişilemedi)"
echo "NOT: OSB_KULLANICI tanımlı: $(grep -c '^OSB_KULLANICI' /opt/aesun/musteri.env 2>/dev/null || echo 0)"
echo "NOT: ACE_OTURUM tanımlı: $(grep -c '^ACE_OTURUM=.' /opt/aesun/musteri.env 2>/dev/null || echo 0)"
docker exec aesun-musteri python3 -c "
import json, pathlib
d = json.load(open('/musteri/durum.json'))
osb = {k: v for k, v in d.get('hesaplar', {}).items() if k.startswith('osb') or k == 'ace'}
print('NOT: osb_durum:', json.dumps(osb, ensure_ascii=False))
s = json.load(open('/musteri/santraller.json'))
for sid, m in s.items():
    p = pathlib.Path(f'/musteri/{sid}/son.json')
    son = json.loads(p.read_text()) if p.is_file() else {}
    sy = son.get('sayac') or {}
    print(f'NOT: santral {sid} ({m.get(\"ad\")}): inv={son.get(\"inverter_var\")} sayac={son.get(\"sayac_var\")} ay_u={sy.get(\"ay_uretim_kwh\")} ay_t={sy.get(\"ay_tuketim\")} son_ok={sy.get(\"osf07_son_okuma\")}')
" 2>/dev/null || echo "NOT: durum okunamadı"
