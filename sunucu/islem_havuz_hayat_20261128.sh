#!/bin/bash
# Hayatımızda YZ #7 İş yerinde + #8 İnternet: sunucuya koyar, Yükleme Yöneticisi havuzuna teslim eder, planlar. Yayın yalnız Ömer onayıyla.
set -u
mkdir -p /opt/aesun/video_bekleyen
for kod in KZ_HAYAT_07_ISYERI KZ_HAYAT_08_INTERNET; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; continue; }
  timeout 360 python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json" 2>&1 | grep -E "NOT:|${kod}" | cut -c1-200
done
timeout 120 python3 /opt/aesun/havuz/yonetici.py planla 2>&1 | grep -E "KZ_HAYAT|PLAN" | head -8
python3 /opt/aesun/havuz/yonetici.py durum --json 2>/dev/null | python3 -c "import sys,json
try:
  j=json.loads(sys.stdin.read()); L=j if isinstance(j,list) else j.get('videolar',[])
  for x in L:
    if str(x.get('kod','')).startswith('KZ_HAYAT'): print('NOT: durum', x.get('kod'), x.get('durum'), x.get('plan') or x.get('yayin_zamani'))
except Exception as e: print('NOT: durum okunamadı', str(e)[:80])"
