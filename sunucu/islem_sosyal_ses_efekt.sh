#!/bin/bash
# Ortam ve efekt sesleri: ElevenLabs Sound Effects (abonelikle ticari kullanım). Liste public/<ad>/efektler.json.
# Çıktı günlükte base64. Anahtar yazdırılmaz.
set -uo pipefail
AD=${AD:-$(cat /tmp/aesun_paket/sunucu/sosyal/animasyon/DIYALOG_ISI 2>/dev/null || echo ezgi3b)}
EL=$(grep '^ELEVENLABS_API_KEY=' /opt/cutkoda/motor.env 2>/dev/null | cut -d= -f2-)
[ -n "$EL" ] || { echo "NOT: HATA ElevenLabs anahtarı yok"; exit 1; }
EL="$EL" L=/tmp/aesun_paket/sunucu/sosyal/animasyon/public/$AD/efektler.json python3 - <<'PY'
import base64, json, os, urllib.request, urllib.error
H = {"xi-api-key": os.environ["EL"], "Content-Type": "application/json"}
for e in json.load(open(os.environ["L"], encoding="utf-8")):
    govde = {"text": e["metin"], "duration_seconds": e["sure"], "prompt_influence": 0.5}
    try:
        r = urllib.request.Request("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", data=json.dumps(govde).encode(), headers=H)
        ses = urllib.request.urlopen(r, timeout=180).read()
    except urllib.error.HTTPError as h:
        print("NOT: HATA", e["ad"], h.code, h.read()[:160]); continue
    print("NOT: efekt", e["ad"], len(ses), "bayt")
    print(f"EFEKT_{e['ad']}_BASLA"); print(base64.b64encode(ses).decode()); print(f"EFEKT_{e['ad']}_BITIS")
PY
