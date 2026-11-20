#!/bin/bash
# Kara Kutu Mit #1-#2: kalite kapısı uyarısı (ilk kare siyah, renk soluk) düzeltildi. Kuyruktaki videoları yenisiyle değiştirir;
# eski dosyalar .yedek_21112026 olarak yerinde kalır (geri alınabilir). Yayın saati ve onay değişmez.
set -u
for kod in KK_MIT_01_ANI_FREN KK_MIT_02_YAYA; do
  yeni="sunucu/havuz/gelen/${kod}.mp4"
  for hedef in "/opt/aesun/video_bekleyen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" $(python3 -c "import json;d=json.load(open('/opt/aesun/havuz/havuz.json',encoding='utf-8'));print(d.get('$kod',{}).get('dosya',''))"); do
    [ -f "$hedef" ] || continue
    cp -p "$hedef" "${hedef}.yedek_21112026" && install -m 644 "$yeni" "$hedef" && echo "NOT: $kod güncellendi → $hedef"
  done
done
python3 - <<'PY'
import json
d=json.load(open("/opt/aesun/havuz/havuz.json",encoding="utf-8"))
for k in ("KK_MIT_01_ANI_FREN","KK_MIT_02_YAYA"):
    it=d.get(k,{});print("NOT:",k,"durum:",it.get("durum"),"yayin:",it.get("kart",{}).get("yayin_zamani"))
PY
