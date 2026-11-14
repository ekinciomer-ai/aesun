#!/bin/bash
# Yükleme Yöneticisi: Ömer'in kararlarını uygular (icerik/havuz/karar/<kod>.json: {"kod","karar":"evet|hayir","not","yayin_zamani"}),
# onaylananları platform kuyruklarına hazırlar; kuyruk kartları çıktıda (===YONLENDIR===) — depoya Claude işler.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
for k in icerik/havuz/karar/*.json; do [ -f "$k" ] || continue
  python3 - "$k" <<'PY'
import json, subprocess, sys
k = json.load(open(sys.argv[1], encoding="utf-8"))
subprocess.run(["python3", "/opt/aesun/havuz/yonetici.py", "onay", k["kod"], k["karar"], k.get("not", ""), k.get("yayin_zamani", "")])
PY
done
python3 /opt/aesun/havuz/yonetici.py yonlendir
python3 /opt/aesun/havuz/yonetici.py durum --json
