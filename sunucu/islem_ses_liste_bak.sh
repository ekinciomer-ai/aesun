#!/bin/bash
# Salt okunur: ElevenLabs'taki kendi seslerin adları ve kimlikleri (anahtar yazdırılmaz)
set -u
K=$(grep '^ELEVENLABS_API_KEY=' /opt/cutkoda/motor.env 2>/dev/null | cut -d= -f2-)
[ -n "$K" ] || { echo "NOT: HATA anahtar yok"; exit 1; }
python3 - "$K" <<'PY'
import json,sys,urllib.request
r=urllib.request.urlopen(urllib.request.Request("https://api.elevenlabs.io/v1/voices",headers={"xi-api-key":sys.argv[1]}),timeout=30)
for v in json.load(r)["voices"]:
    if v.get("category")!="premade": print(f"NOT: SES {v['name']} | {v['voice_id']} | {v.get('category')}")
PY
