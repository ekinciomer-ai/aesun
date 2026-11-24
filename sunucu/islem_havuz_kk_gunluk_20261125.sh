#!/bin/bash
# Kara Kutu (KK_TR) · Mit mi Gerçek mi? 25.11.2026:
#  1) #15 videosu düzeltildi (sahne artık virajlı yol; Ömer geri bildirimi). Kuyruktaki dosya yenisiyle değişir, eski .yedek_25112026 olarak kalır. Onay/yayın saati değişmez.
#  2) #16 teslim + planla. Yayın yalnız Ömer'in panel onayıyla; onay/yonlendir/yayın adımı YOK.
set -u
kod=KK_MIT_15_OLUMLU_KAZA; yeni="sunucu/havuz/gelen/${kod}.mp4"
for hedef in "/opt/aesun/video_bekleyen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" $(python3 -c "import json;d=json.load(open('/opt/aesun/havuz/havuz.json',encoding='utf-8'));print(d.get('$kod',{}).get('dosya',''))"); do
  [ -f "$hedef" ] || continue
  cp -p "$hedef" "${hedef}.yedek_25112026" && install -m 644 "$yeni" "$hedef" && echo "NOT: $kod güncellendi → $hedef"
done
mkdir -p /opt/aesun/video_bekleyen
for kod in KK_MIT_16_HATIR_TASIMASI; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; continue; }
  python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 - <<'PY'
import json
d=json.load(open("/opt/aesun/havuz/havuz.json",encoding="utf-8"))
for k in ("KK_MIT_15_OLUMLU_KAZA","KK_MIT_16_HATIR_TASIMASI"):
    it=d.get(k,{});print("NOT:",k,"durum:",it.get("durum"))
PY
python3 /opt/aesun/havuz/yonetici.py planla | grep -E "KK_MIT_1[56]" || true
