#!/bin/bash
# Salt okur: ElevenLabs hesabındaki seslerin adı ve kimliği (anahtar yazdırılmaz).
K=$(grep '^ELEVENLABS_API_KEY=' /opt/cutkoda/motor.env | cut -d= -f2-)
curl -s -H "xi-api-key: $K" "https://api.elevenlabs.io/v2/voices?page_size=100" -o /tmp/v.json -w "NOT: http=%{http_code}\n"
python3 - <<'PY'
import json
d=json.load(open("/tmp/v.json"))
if "voices" not in d: print("NOT: yanit", str(d)[:200])
for v in d.get("voices",[]):
    print("NOT: ses", v["voice_id"], v.get("name"), v.get("category"))
PY
rm -f /tmp/v.json
exit 0
