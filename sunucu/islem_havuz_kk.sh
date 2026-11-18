#!/bin/bash
# Kara Kutu Mayday (KK_TR, @KaraKutu7700) kanalını Yükleme Yöneticisi'ne ekler ve KK_01 + KK_02 videolarını havuza teslim edip planlı kuyruğa kaydeder.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 - <<'PY'
import json, os
f = "/opt/aesun/havuz/sinirlar.json"
d = json.load(open(f, encoding="utf-8")) if os.path.exists(f) else {}
d["KK_TR"] = {"acilis": "2026-11-09", "gunluk": 2, "ara_saat": 3, "saatler": ["14:00", "18:00"]}
json.dump(d, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("NOT: KK_TR sınır ayarı:", json.dumps(d["KK_TR"], ensure_ascii=False))
PY
for k in sunucu/havuz/teslim/KK_01_AEROPERU_603_KAZA.json sunucu/havuz/teslim/KK_02_JAL_123_KOPAN_KUYRUK.json; do
  [ -f "$k" ] && python3 /opt/aesun/havuz/yonetici.py teslim "$k"
done
for k in sunucu/havuz/karar/KK_01_AEROPERU_603_KAZA.json sunucu/havuz/karar/KK_02_JAL_123_KOPAN_KUYRUK.json; do
  [ -f "$k" ] || continue
  python3 - "$k" <<'PY'
import json, subprocess, sys
c = json.load(open(sys.argv[1], encoding="utf-8"))
subprocess.run(["python3", "/opt/aesun/havuz/yonetici.py", "onay", c["kod"], c["karar"], c.get("not", ""), c.get("yayin_zamani", "")])
PY
done
python3 /opt/aesun/havuz/yonetici.py planla >/dev/null
python3 /opt/aesun/havuz/yonetici.py yonlendir
python3 /opt/aesun/havuz/yonetici.py durum --json
