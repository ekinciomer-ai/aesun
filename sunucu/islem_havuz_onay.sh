#!/bin/bash
# Yükleme Yöneticisi: Ömer'in kararlarını uygular (karar: evet|hayir|beklet; kod HEPSI + evet = planı tek tıkla onayla) (sunucu/havuz/karar/<kod>.json: {"kod","karar":"evet|hayir","not","yayin_zamani"}),
# onaylananları platform kuyruklarına hazırlar; kuyruk kartları çıktıda (===YONLENDIR===) — depoya Claude işler.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
for k in sunucu/havuz/karar/*.json; do [ -f "$k" ] || continue
  python3 - "$k" <<'PY'
import json, subprocess, sys
k = json.load(open(sys.argv[1], encoding="utf-8"))
Y = "/opt/aesun/havuz/yonetici.py"
if k["karar"] == "beklet":
    subprocess.run(["python3", Y, "beklet", k["kod"], k.get("not", "")])
elif k["kod"] == "HEPSI" and k["karar"] == "evet":
    subprocess.run(["python3", Y, "planla"]); subprocess.run(["python3", Y, "onay_toplu", k.get("not", "")])
else:
    subprocess.run(["python3", Y, "onay", k["kod"], k["karar"], k.get("not", ""), k.get("yayin_zamani", "")])
PY
done
python3 /opt/aesun/havuz/yonetici.py planla >/dev/null
python3 /opt/aesun/havuz/yonetici.py yonlendir
python3 /opt/aesun/havuz/yonetici.py durum --json
