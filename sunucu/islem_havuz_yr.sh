#!/bin/bash
# Yolu Seç ! (YR, Yeraltı) kanalını Yükleme Yöneticisi'ne ekler: güncel yonetici.py + yeni hesap açılış tarihi (ilk 30 gün günde 1).
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 - <<'PY'
import json, os
f = "/opt/aesun/havuz/sinirlar.json"
d = json.load(open(f, encoding="utf-8")) if os.path.exists(f) else {}
d.setdefault("YR", {}).setdefault("acilis", "2026-11-16")
json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("NOT: YR sınır ayarı:", json.dumps(d["YR"], ensure_ascii=False))
PY
python3 - <<'PY'
import sys; sys.path.insert(0, "/opt/aesun/havuz")
import yonetici as y
print("NOT: YR kanal adı:", y.KANALLAR.get("YR"), "· plan saatleri:", y.saatler_al("YR"), "· günlük sınır:", y.sinir_al("YR"))
PY
ls /opt/aesun/youtube/kanallar/UCqVae87VSs6HokK4Qdm29Hw.json >/dev/null 2>&1 && echo "NOT: YR yenileme anahtarı sunucuda var" || echo "NOT: HATA YR yenileme anahtarı yok"
