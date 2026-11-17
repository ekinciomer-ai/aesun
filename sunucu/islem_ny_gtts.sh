#!/bin/bash
# Nasıl Yapıldı: Google Cloud Text-to-Speech (nöral ses) ile seslendirme. Anahtar kasada: google_tts_anahtar (yazdırılmaz).
# Girdi: ./kuyruk/<kod>.json {"kod","ses"?,"parcalar":[{"id","metin"}]}  Çıktı: ./cikti/<kod>/<id>.mp3 + meta.json
set -u
F=/var/lib/docker/volumes/aesun_aesun_veri/_data/kasa/istenen.json
python3 - "$F" <<'PY'
import json, sys, os
f = sys.argv[1]; d = json.load(open(f)) if os.path.exists(f) else {}
if "google_tts_anahtar" not in d:
    d["google_tts_anahtar"] = "Google Cloud Text-to-Speech API anahtarı: console.cloud.google.com → Kanal Yonetim projesi → Text-to-Speech API'yi etkinleştir → Kimlik Bilgileri → API anahtarı (yalnız Text-to-Speech'e kısıtla). Nasıl Yapıldı seslendirmesi için."
    json.dump(d, open(f, "w"), ensure_ascii=False, indent=1); os.chown(f, 1001, 1001); os.chmod(f, 0o600)
PY
K=$(/opt/aesun/kasa_coz.sh google_tts_anahtar 2>/dev/null) || K=""
[ -n "$K" ] || { echo "NOT: ANAHTAR_YOK kasaya google_tts_anahtar girilmeli"; exit 0; }
mkdir -p cikti
python3 - "$K" <<'PY'
import json, sys, glob, os, base64, urllib.request, urllib.error
K = sys.argv[1]
SESLER = ["tr-TR-Chirp3-HD-Charon", "tr-TR-Chirp3-HD-Orus", "tr-TR-Wavenet-E", "tr-TR-Wavenet-B"]
def soyle(metin, ses):
    g = {"input": {"text": metin}, "voice": {"languageCode": "tr-TR", "name": ses}, "audioConfig": {"audioEncoding": "MP3", "sampleRateHertz": 48000}}
    r = urllib.request.Request(f"https://texttospeech.googleapis.com/v1/text:synthesize?key={K}", data=json.dumps(g).encode(), headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(r, timeout=90) as y: return base64.b64decode(json.load(y)["audioContent"])
for jf in sorted(glob.glob("kuyruk/*.json")):
    j = json.load(open(jf, encoding="utf-8")); kod = j["kod"]; os.makedirs(f"cikti/{kod}", exist_ok=True)
    adaylar = ([j["ses"]] if j.get("ses") else []) + SESLER; kullanilan = None
    for p in j["parcalar"]:
        for s in ([kullanilan] if kullanilan else adaylar):
            try:
                open(f"cikti/{kod}/{p['id']}.mp3", "wb").write(soyle(p["metin"], s)); kullanilan = s; break
            except urllib.error.HTTPError as e:
                print(f"NOT: {kod}/{p['id']} {s} HTTP {e.code} {e.read().decode('utf-8','replace')[:140]}")
        else:
            print(f"NOT: HATA {kod}/{p['id']} seslendirilemedi"); sys.exit(1)
    json.dump({"kaynak": "google-cloud-tts", "ses": kullanilan, "tempo": 1.08}, open(f"cikti/{kod}/meta.json", "w"))
    print(f"NOT: {kod} tamam · ses {kullanilan} · {len(j['parcalar'])} parça")
PY
