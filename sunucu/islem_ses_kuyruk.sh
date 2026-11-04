#!/bin/bash
# Seslendirme kuyruğu (bilgisayar gerekmez): sunucudaki ElevenLabs bağlantısıyla (anahtar: /opt/cutkoda/motor.env, yazdırılmaz)
# kuyruk/<kod>.json → {"kod","voice_id","model","parcalar":[{"ad","metin"}],"ayar":{...},"dil"} → cikti/<kod>__<ad>.mp3
set -u
K=$(grep '^ELEVENLABS_API_KEY=' /opt/cutkoda/motor.env 2>/dev/null | cut -d= -f2-)
[ -n "$K" ] || { echo "NOT: HATA ElevenLabs anahtarı sunucuda bulunamadı"; exit 1; }
mkdir -p cikti
python3 - "$K" <<'PY'
import json, sys, glob, os, urllib.request, urllib.error
K = sys.argv[1]
for jf in sorted(glob.glob("kuyruk/*.json")):
    j = json.load(open(jf, encoding="utf-8"))
    for p in j["parcalar"]:
        govde = {"text": p["metin"], "model_id": j.get("model", "eleven_v3"), "voice_settings": j.get("ayar", {})}
        if j.get("dil"): govde["language_code"] = j["dil"]
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{j['voice_id']}?output_format=mp3_44100_128",
                                     data=json.dumps(govde).encode(), headers={"xi-api-key": K, "Content-Type": "application/json"}, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                open(f"cikti/{j['kod']}__{p['ad']}.mp3", "wb").write(r.read())
            print(f"NOT: {j['kod']}/{p['ad']} tamam")
        except urllib.error.HTTPError as e:
            print(f"NOT: HATA {j['kod']}/{p['ad']} HTTP {e.code} {e.read().decode('utf-8','replace')[:160]}")
try:
    with urllib.request.urlopen(urllib.request.Request("https://api.elevenlabs.io/v1/user/subscription", headers={"xi-api-key": K}), timeout=30) as r:
        d = json.load(r); print(f"NOT: ElevenLabs kalan karakter: {d.get('character_limit',0) - d.get('character_count',0)} / {d.get('character_limit')}")
except Exception: pass
PY
