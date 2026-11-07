#!/bin/bash
# Genç Türkçe kadın sesi adayları: hesaptaki sesler + ElevenLabs paylaşılan kütüphanesi (tr, kadın, genç).
# En uygun 3 aday için aynı örnek cümle üretilir; günlükte base64 (dinlemek için). Anahtar yazdırılmaz.
set -uo pipefail
EL=$(grep '^ELEVENLABS_API_KEY=' /opt/cutkoda/motor.env 2>/dev/null | cut -d= -f2-)
[ -n "$EL" ] || { echo "NOT: HATA ElevenLabs anahtarı yok"; exit 1; }
EL="$EL" python3 - <<'PY'
import base64, json, os, urllib.request, urllib.error, urllib.parse
H = {"xi-api-key": os.environ["EL"], "Content-Type": "application/json"}
def get(u):
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=H), timeout=60))
adaylar = []
try:
    for v in get("https://api.elevenlabs.io/v1/voices").get("voices", []):
        lb = v.get("labels") or {}
        print("NOT: hesap sesi", v["voice_id"], v.get("name"), lb.get("gender"), lb.get("age"), lb.get("accent"), lb.get("language"))
        if (lb.get("gender") == "female") and (lb.get("age") in ("young", None)):
            adaylar.append(("hesap", v["voice_id"], v.get("name"), None))
except Exception as e:
    print("NOT: hesap sesleri okunamadı", e)
try:
    q = urllib.parse.urlencode({"language": "tr", "gender": "female", "age": "young", "page_size": 12, "sort": "trending"})
    for v in get("https://api.elevenlabs.io/v1/shared-voices?" + q).get("voices", []):
        print("NOT: kütüphane", v["voice_id"], v.get("name"), v.get("age"), v.get("accent"), v.get("use_case"), (v.get("description") or "")[:60])
        adaylar.append(("kutuphane", v["voice_id"], v.get("name"), v.get("public_owner_id")))
except Exception as e:
    print("NOT: kütüphane okunamadı", e)
metin = "Dede! Ekmeği unuttuk! ... Dede, bu sen misin?"
uretilen = 0
for kaynak, vid, ad, sahip in adaylar:
    if uretilen >= 4: break
    if kaynak == "kutuphane" and sahip:
        try:
            r = urllib.request.Request(f"https://api.elevenlabs.io/v1/voices/add/{sahip}/{vid}", data=json.dumps({"new_name": f"Genc kiz - {ad}"[:40]}).encode(), headers=H)
            vid = json.load(urllib.request.urlopen(r, timeout=60)).get("voice_id", vid)
        except urllib.error.HTTPError as e:
            print("NOT: eklenemedi", ad, e.code, e.read()[:120]); continue
    govde = {"text": metin, "model_id": "eleven_v3", "language_code": "tr", "voice_settings": {"stability": 0.4, "similarity_boost": 0.8}}
    try:
        r = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{vid}?output_format=mp3_44100_128", data=json.dumps(govde).encode(), headers=H)
        ses = urllib.request.urlopen(r, timeout=120).read()
    except urllib.error.HTTPError as e:
        print("NOT: üretilemedi", ad, e.code, e.read()[:120]); continue
    uretilen += 1
    print(f"NOT: örnek {uretilen}: {ad} ({vid})")
    print(f"ORNEK_{uretilen}_BASLA"); print(base64.b64encode(ses).decode()); print(f"ORNEK_{uretilen}_BITIS")
print("NOT: üretilen örnek", uretilen)
PY
