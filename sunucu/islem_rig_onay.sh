#!/bin/bash
# Onay bekleyen video rig'lerinden sunucu/rig_onay.txt'de MAC'i yazılı olanları anahtar listesine ekler (ad: rig_<ad>).
# Yalnız Ömer'in onayıyla çalıştırılır. Anahtarın kendisi hiçbir yerde yok; yalnız özet taşınır.
set -uo pipefail
cd /tmp/aesun_paket
ONAY=$(grep -oE '([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}' sunucu/rig_onay.txt | tr a-f A-F | tr '\n' ' ')
docker exec -e ONAY="$ONAY" aesun-api python - <<'PY'
import json, os
from pathlib import Path
b = Path("/veri/rig_bekleyen.json"); a = Path("/veri/anahtarlar.json")
bek = json.loads(b.read_text()) if b.exists() else {}
an = json.loads(a.read_text())
for mac in os.environ["ONAY"].split():
    k = bek.pop(mac, None)
    if not k:
        print(f"NOT: {mac} bekleyenlerde yok"); continue
    an["rig_" + k["ad"]] = k["ozet"]
    print(f"NOT: onaylandı rig_{k['ad']} ({mac})")
t = a.with_name("anahtarlar.json.tmp"); t.write_text(json.dumps(an, indent=1)); os.replace(t, a)
b.write_text(json.dumps(bek, ensure_ascii=False, indent=1))
print("NOT: kalan bekleyen:", ", ".join(f"{m}={v['ad']}" for m, v in bek.items()) or "yok")
PY
