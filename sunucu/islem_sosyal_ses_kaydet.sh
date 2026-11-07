#!/bin/bash
# Ezgi 3B sesleri: (1) Ömer'in seçtiği tasarım önizlemesini kalıcı sese çevirir,
# (2) dede için tarifinden ses tasarlar ve ilk önizlemeyi kalıcı yapar. Ses kimlikleri günlüğe yazılır (gizli değil).
set -uo pipefail
EL=$(grep '^ELEVENLABS_API_KEY=' /opt/cutkoda/motor.env 2>/dev/null | cut -d= -f2-)
[ -n "$EL" ] || { echo "NOT: HATA ElevenLabs anahtarı yok"; exit 1; }
EL="$EL" python3 - <<'PY'
import base64, json, os, urllib.request, urllib.error
H = {"xi-api-key": os.environ["EL"], "Content-Type": "application/json"}
def post(yol, govde):
    return json.load(urllib.request.urlopen(urllib.request.Request("https://api.elevenlabs.io" + yol, data=json.dumps(govde).encode(), headers=H), timeout=240))
EZGI_TARIF = "Young Turkish woman in her early 20s, warm and energetic mid-high pitched voice, fast casual speech, playful and expressive, natural Istanbul Turkish accent, social media vlogger style"
try:
    r = post("/v1/text-to-voice", {"voice_name": "Ezgi (3B animasyon)", "voice_description": EZGI_TARIF, "generated_voice_id": "F6KwjrV26xxsXxloQFnC"})
    print("NOT: EZGI_SES", r.get("voice_id"))
except urllib.error.HTTPError as e:
    print("NOT: HATA ezgi kaydedilemedi", e.code, e.read()[:200])
DEDE_TARIF = "Turkish grandfather in his 80s, warm deep slow voice, slightly raspy and gravelly, calm and few words, gentle hidden humor, natural Turkish accent"
try:
    d = post("/v1/text-to-voice/design", {"voice_description": DEDE_TARIF, "text": "Hııı... Haftaya yine gelelim. Sormadın ki. Çay soğumasın, evladım. Ördekler beni tanır.", "model_id": "eleven_ttv_v3", "guidance_scale": 5})
    pv = d["previews"]
    for i, p in enumerate(pv, 1):
        print(f"NOT: dede önizleme {i} {p.get('generated_voice_id')}")
        print(f"DEDE_{i}_BASLA"); print(p.get("audio_base_64")); print(f"DEDE_{i}_BITIS")
    r = post("/v1/text-to-voice", {"voice_name": "Dede (3B animasyon)", "voice_description": DEDE_TARIF, "generated_voice_id": pv[0]["generated_voice_id"]})
    print("NOT: DEDE_SES", r.get("voice_id"))
except urllib.error.HTTPError as e:
    print("NOT: HATA dede tasarlanamadı", e.code, e.read()[:200])
PY
