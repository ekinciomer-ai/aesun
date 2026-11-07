#!/bin/bash
# ElevenLabs "ses tasarımı": tarifinden özgün ses üretir (kimse klonlanmaz). 3 önizleme, günlükte base64.
# Tarif ve örnek metin sosyal/animasyon/public/ezgi3b/ses_tarifi.json'dan. Anahtar yazdırılmaz.
set -uo pipefail
EL=$(grep '^ELEVENLABS_API_KEY=' /opt/cutkoda/motor.env 2>/dev/null | cut -d= -f2-)
[ -n "$EL" ] || { echo "NOT: HATA ElevenLabs anahtarı yok"; exit 1; }
EL="$EL" T=/tmp/aesun_paket/sunucu/sosyal/animasyon/public/ezgi3b/ses_tarifi.json python3 - <<'PY'
import base64, json, os, urllib.request, urllib.error
t = json.load(open(os.environ["T"], encoding="utf-8"))
H = {"xi-api-key": os.environ["EL"], "Content-Type": "application/json"}
govde = {"voice_description": t["tarif"], "text": t["metin"], "model_id": "eleven_ttv_v3", "guidance_scale": 5}
for yol in ("https://api.elevenlabs.io/v1/text-to-voice/design", "https://api.elevenlabs.io/v1/text-to-voice/create-previews"):
    try:
        r = json.load(urllib.request.urlopen(urllib.request.Request(yol, data=json.dumps(govde).encode(), headers=H), timeout=240))
        break
    except urllib.error.HTTPError as e:
        print("NOT: deneme", yol.rsplit("/", 1)[-1], "HTTP", e.code, e.read()[:200]); r = None
if not r:
    raise SystemExit("NOT: HATA ses tasarlanamadı")
for i, p in enumerate(r.get("previews", []), 1):
    print(f"NOT: önizleme {i} id {p.get('generated_voice_id')}")
    print(f"ORNEK_{i}_BASLA"); print(p.get("audio_base_64") or p.get("audio_base64")); print(f"ORNEK_{i}_BITIS")
PY
