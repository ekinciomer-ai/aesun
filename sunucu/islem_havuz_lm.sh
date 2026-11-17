#!/bin/bash
# LVL MAX (LM, @lvlmaxtv, lvlmax.tv@gmail.com) kanalını Yükleme Yöneticisi'ne ekler: güncel yonetici.py + yeni hesap açılış tarihi (ilk 30 gün günde 1, 17:00).
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 - <<'PY'
import json, os
f = "/opt/aesun/havuz/sinirlar.json"
d = json.load(open(f, encoding="utf-8")) if os.path.exists(f) else {}
d.setdefault("LM", {}).setdefault("acilis", "2026-11-17")
json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("NOT: LM sınır ayarı:", json.dumps(d["LM"], ensure_ascii=False))
PY
python3 - <<'PY'
import sys; sys.path.insert(0, "/opt/aesun/havuz")
import yonetici as y
print("NOT: LM kanal adı:", y.KANALLAR.get("LM"), "· plan saatleri:", y.saatler_al("LM"), "· günlük sınır:", y.sinir_al("LM"))
PY
ls /opt/aesun/youtube/kanallar/UCDwQWwMPkGKxsEz7t1HCPbA.json >/dev/null 2>&1 && echo "NOT: LM yenileme anahtarı sunucuda var" || echo "NOT: HATA LM yenileme anahtarı yok"
