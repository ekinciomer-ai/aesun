#!/bin/bash
# Yükleme Yöneticisi: sunucu/havuz/teslim/*.json kartlarını havuza alır (video kartın kaynak_dosya yolundan kopyalanır) ve kontrol eder.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
# Ömür Dediğin açılış tarihi (yeni hesap kilidi: günde 1)
python3 - <<'PY'
import json, os
f = "/opt/aesun/havuz/sinirlar.json"
d = json.load(open(f, encoding="utf-8")) if os.path.exists(f) else {}
d.setdefault("OD", {}).setdefault("acilis", "2026-11-09")
json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
PY
for k in sunucu/havuz/teslim/*.json; do [ -f "$k" ] || continue; python3 /opt/aesun/havuz/yonetici.py teslim "$k"; done
python3 /opt/aesun/havuz/yonetici.py planla
python3 /opt/aesun/havuz/yonetici.py durum --json
