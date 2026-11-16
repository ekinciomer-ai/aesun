#!/bin/bash
# Gündem+Tarih: Muhtesib (taklit/tağşiş/teşhir açıklamalı v2) ve Boğaz 1621 (canlandırılmış nesneler) videolarını havuzda yeniler.
# Yalnız onay_bekliyor işlerde; eski dosya .eski olarak saklanır. Boğaz kar tetiği için bekletmeye alınır (Ömer 17.11).
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
cp /opt/aesun/havuz/havuz.json /opt/aesun/havuz/havuz.json.yenile_oncesi_$(date +%s)
for k in AS_GT_MUHTESIB AS_GT_BOGAZ1621; do install -m 644 sunucu/havuz/gelen/$k.mp4 /opt/aesun/video_bekleyen/${k}_kaynak.mp4 || { echo "NOT: HATA $k kopyalanamadı"; exit 1; }; done
cd /opt/aesun/havuz && python3 - "$OLDPWD" <<'PY'
import shutil, sys, os, json
sys.path.insert(0, "/opt/aesun/havuz"); import yonetici as y
depo = sys.argv[1]; idx = y.yukle()
for k, neden in [("AS_GT_MUHTESIB", "v2: başta taklit/tağşiş, ceza kısmında teşhir açıklandı"), ("AS_GT_BOGAZ1621", "v2: eski fotolarda nesneler canlandırıldı (vapur, kızak, yürüyen adam)")]:
    it = idx.get(k)
    if not it or it.get("durum") != "onay_bekliyor": print(f"NOT: HATA {k} onay beklemiyor ({it and it.get('durum')})"); continue
    h = it["dosya"]; shutil.copy2(h, h + ".eski"); shutil.copy2(f"/opt/aesun/video_bekleyen/{k}_kaynak.mp4", h)
    kart = json.load(open(f"{depo}/sunucu/havuz/teslim/{k}.json", encoding="utf-8")); it["kart"]["aciklama"] = kart["aciklama"]
    it.update(sha256=y.sha(h), boyut=os.path.getsize(h)); y.olay(it, "video yenilendi: " + neden); idx[k] = it
    print(f"NOT: {k}: video yenilendi")
y.kaydet(idx)
PY
cd "$OLDPWD"
python3 /opt/aesun/havuz/yonetici.py beklet AS_GT_BOGAZ1621 "kar uyarısı bekleniyor (Ömer 17.11: kar olunca yayınla) — kar_tetik.yml"
python3 /opt/aesun/havuz/yonetici.py planla | grep -E "AS_GT_|BEKLET" || true
