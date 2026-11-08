#!/bin/bash
# Salt okur: ElevenLabs hesabındaki kişisel seslerin adı ve kimliği (anahtar yazdırılmaz).
K=$(grep '^ELEVENLABS_API_KEY=' /opt/cutkoda/motor.env | cut -d= -f2-)
curl -s -H "xi-api-key: $K" https://api.elevenlabs.io/v1/voices | python3 -c '
import json,sys
for v in json.load(sys.stdin).get("voices",[]):
    if v.get("category")!="premade": print("NOT: ses", v["voice_id"], v["name"], v.get("category"))'
exit 0
