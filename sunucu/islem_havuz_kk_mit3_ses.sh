#!/bin/bash
# Kara Kutu Mit #3: Ömer 21.11.2026 "arada başka bir ses akışı bozuyor" → tek TTS modeliyle yeniden seslendirilmiş sürüm.
# Havuzdaki (onay bekleyen) video yenisiyle değiştirilir; eskisi .yedek_ses olarak yerinde kalır. Onay/yayın durumu değişmez.
set -u
kod=KK_MIT_03_TUTANAK; yeni="sunucu/havuz/gelen/${kod}.mp4"
for hedef in "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" $(python3 -c "import json;d=json.load(open('/opt/aesun/havuz/havuz.json',encoding='utf-8'));print(d.get('$kod',{}).get('dosya',''))"); do
  [ -f "$hedef" ] || continue
  cp -p "$hedef" "${hedef}.yedek_ses" && install -m 644 "$yeni" "$hedef" && echo "NOT: $kod güncellendi → $hedef"
done
python3 -c "import json;d=json.load(open('/opt/aesun/havuz/havuz.json',encoding='utf-8'));it=d.get('$kod',{});print('NOT: $kod durum:',it.get('durum'),'plan:',it.get('kart',{}).get('plan_zamani'))"
