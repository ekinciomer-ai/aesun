#!/bin/bash
# Nasıl Yapıldı (NY) kanalını Yükleme Yöneticisi'ne ekler: güncel yonetici.py + yeni hesap açılış tarihi (ilk 30 gün günde 1).
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 - <<'PY'
import json, os
f = "/opt/aesun/havuz/sinirlar.json"
d = json.load(open(f, encoding="utf-8")) if os.path.exists(f) else {}
d.setdefault("NY", {}).setdefault("acilis", "2026-11-16")
json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("NOT: NY sınır ayarı:", json.dumps(d["NY"], ensure_ascii=False))
PY
python3 - <<'PY'
import sys; sys.path.insert(0, "/opt/aesun/havuz")
import yonetici as y
print("NOT: NY kanal adı:", y.KANALLAR.get("NY"), "· plan saatleri:", y.saatler_al("NY"), "· günlük sınır:", y.sinir_al("NY"))
PY
ls /opt/aesun/youtube/kanallar/UCscZRPONJahcgtZhTNeUcRA.json >/dev/null 2>&1 && echo "NOT: NY yenileme anahtarı sunucuda var" || echo "NOT: HATA NY yenileme anahtarı yok"
