#!/bin/bash
# Albastı v2 videolarını (video-teslim dalında sunucu/video_gelen/) bekleyen klasöre koyar, kartı havuza teslim eder.
set -u
mkdir -p /opt/aesun/video_bekleyen
for a in 916 169; do
  s=sunucu/video_gelen/ALBASTI_$a.mp4; h=/opt/aesun/video_bekleyen/albasti_v2_$a.mp4
  [ -f "$s" ] || { echo "NOT: HATA $s yok"; exit 1; }
  [ -f "$h" ] && cp -n "$h" "$h.eski_$(date +%s)"
  cp "$s" "$h" && echo "NOT: $h hazır ($(du -h $h | cut -f1))"
done
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 /opt/aesun/havuz/yonetici.py teslim sunucu/havuz/teslim/AS_HB_ALBASTI.json
python3 /opt/aesun/havuz/yonetici.py durum --json | python3 -c "import sys,json;d=json.load(sys.stdin);[print('NOT: havuz',x.get('kod'),x.get('durum'),x.get('uyari')) for x in (d if isinstance(d,list) else d.get('isler',[])) if 'ALBASTI' in str(x.get('kod'))]" 2>/dev/null || true
