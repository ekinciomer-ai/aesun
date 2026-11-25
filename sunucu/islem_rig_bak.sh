#!/bin/bash
# Yalnız okur: onay bekleyen rig'ler ve rig nabız/deneme sonuçları.
docker exec -i aesun-api python - <<'PY'
import json
from pathlib import Path
b = Path("/veri/rig_bekleyen.json")
print("NOT: bekleyen:", b.read_text().replace("\n", " ")[:600] if b.exists() else "yok")
print("NOT: onaylı rig anahtarları:", [k for k in json.load(open("/veri/anahtarlar.json")) if k.startswith("rig_")])
for p in sorted(Path("/veri/depo/rig").glob("*/*.json")):
    print("NOT:", p.relative_to("/veri/depo"), p.read_text().replace("\n", " ")[:1500])
PY
