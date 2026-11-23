#!/bin/bash
# Antik Stüdyo · Mit mi Gerçek mi? POV (gol sevinci/sarılma): videoyu sunucuya koyar, Yükleme Yöneticisi havuzuna teslim eder ve planlar. Yayın yalnız Ömer onayıyla.
set -u
mkdir -p /opt/aesun/video_bekleyen
kod=AS_MIT_01_SARILMA_POV
install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; exit 1; }
python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json"
python3 /opt/aesun/havuz/yonetici.py planla
python3 /opt/aesun/havuz/yonetici.py durum --json | python3 -c "import sys,json
d=sys.stdin.read()
try:
  j=json.loads(d); o=[x for x in (j if isinstance(j,list) else j.get('videolar',[])) if x.get('kod')=='$kod']; print('NOT: durum', json.dumps(o,ensure_ascii=False)[:600])
except Exception as e: print('NOT: durum okunamadı', str(e)[:80])"
