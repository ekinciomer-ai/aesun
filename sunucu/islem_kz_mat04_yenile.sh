#!/bin/bash
# KZ_MAT_04_GPS: havuzda onay bekleyen videoyu düzeltilmiş sürümle değiştirir ("Aynştayn" telaffuzu). Yalnız onay_bekliyor durumunda; eski dosya .eski olarak saklanır.
set -u
K=KZ_MAT_04_GPS
install -m 644 sunucu/havuz/gelen/$K.mp4 /opt/aesun/video_bekleyen/${K}_kaynak.mp4 || { echo "NOT: HATA kopyalanamadı"; exit 1; }
cd /opt/aesun/havuz && python3 - <<'PY'
import shutil, sys, os
sys.path.insert(0, "/opt/aesun/havuz"); import yonetici as y
idx = y.yukle(); k = "KZ_MAT_04_GPS"; it = idx.get(k)
if not it or it.get("durum") != "onay_bekliyor": print(f"NOT: HATA {k} onay beklemiyor ({it and it.get('durum')})"); sys.exit(1)
h = it["dosya"]; shutil.copy2(h, h + ".eski"); shutil.copy2(f"/opt/aesun/video_bekleyen/{k}_kaynak.mp4", h)
it.update(sha256=y.sha(h), boyut=os.path.getsize(h)); y.olay(it, "video yenilendi: son cümlede 'Aynştayn' telaffuzu düzeltildi"); idx[k] = it; y.kaydet(idx)
print(f"NOT: {k}: video yenilendi, durum {it['durum']}")
PY
