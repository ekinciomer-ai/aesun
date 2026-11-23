#!/bin/bash
# Kara Kutu (KK_TR) · "Mit mi Gerçek mi?" #1 ve #2: videoları sunucuya koyar, Yükleme Yöneticisi'ne teslim eder,
# planlar ve Ömer'in 21.11.2026 "yayına al en uygun saate" onayıyla yöneticinin önerdiği saate onaylayıp kuyruğa yönlendirir.
set -u
mkdir -p /opt/aesun/video_bekleyen
for kod in KK_MIT_01_ANI_FREN KK_MIT_02_YAYA; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; exit 1; }
done
for kod in KK_MIT_01_ANI_FREN KK_MIT_02_YAYA; do
  python3 /opt/aesun/havuz/yonetici.py teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 /opt/aesun/havuz/yonetici.py planla
for kod in KK_MIT_01_ANI_FREN KK_MIT_02_YAYA; do
  python3 /opt/aesun/havuz/yonetici.py onay "$kod" evet "Ömer 21.11.2026: yayına al, en uygun saate"
done
python3 /opt/aesun/havuz/yonetici.py yonlendir
python3 - <<'PY'
import json
d=json.load(open("/opt/aesun/havuz/havuz.json",encoding="utf-8"))
for k in ("KK_MIT_01_ANI_FREN","KK_MIT_02_YAYA"):
    it=d.get(k,{});c=it.get("kart",{})
    print("NOT:",k,"durum:",it.get("durum"),"plan:",c.get("plan_zamani"),"yayin:",c.get("yayin_zamani"),"kontrol:",json.dumps(it.get("kontrol",""),ensure_ascii=False)[:300])
PY
