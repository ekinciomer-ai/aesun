#!/bin/bash
# Henüz YouTube'a yüklenmemiş bir videoyu yeni sürümle değiştirir (havuz kopyası + yükleme dosyası). Eskisi .eski olarak saklanır.
# Kullanım: sunucu/havuz/gelen/<KOD>.mp4 + YENILE_KOD / YENILE_NOT aşağıda.
set -u
N=${YENILE_NOT:-"gerçek harita: Kızılay → Anıtkabir (OSM)"}
for K in ${YENILE_KODLAR:-KZ_MAT_08_NAV}; do
Y=/opt/aesun/video_bekleyen
for f in $Y/${K}.mp4 $Y/${K}_kaynak.mp4; do [ -f "$f" ] && cp -p "$f" "$f.eski"; install -m 644 sunucu/havuz/gelen/$K.mp4 "$f"; done
( cd /opt/aesun/havuz && python3 - "$K" "$N" <<'PY'
import shutil, sys, os
sys.path.insert(0, "/opt/aesun/havuz"); import yonetici as y
k, n = sys.argv[1], sys.argv[2]; idx = y.yukle(); it = idx.get(k)
if not it: print(f"NOT: HATA {k} havuzda yok"); sys.exit(1)
if it.get("durum") in ("yayinda", "yuklendi"): print(f"NOT: HATA {k} zaten yüklenmiş ({it['durum']})"); sys.exit(1)
h = it.get("dosya")
if h and os.path.exists(h): shutil.copy2(h, h + ".eski"); shutil.copy2(f"/opt/aesun/video_bekleyen/{k}_kaynak.mp4", h); it.update(sha256=y.sha(h), boyut=os.path.getsize(h))
y.olay(it, f"video yenilendi: {n}"); idx[k] = it; y.kaydet(idx); print(f"NOT: {k}: video yenilendi ({it['durum']})")
PY
)
done
