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
mkdir -p cikti
# 1) Gemini TTS (Google, tonlu anlatım) — kasa: gemini_api_anahtar / gemini_api_key
G=$(/opt/aesun/kasa_coz.sh gemini_api_anahtar 2>/dev/null) || G=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null) || G=""
if [ -n "$G" ]; then
python3 - "$G" <<'PY'
import json, sys, glob, os, base64, time, wave, urllib.request, urllib.error
G = sys.argv[1]; U = "https://generativelanguage.googleapis.com/v1beta"
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"x-goog-api-key": G}), timeout=30))
try: ml = [m["name"].split("/")[1] for m in get(f"{U}/models?pageSize=200").get("models", []) if "tts" in m["name"]]
except Exception as e: print(f"NOT: Gemini model listesi alınamadı {e}"); sys.exit(0)
pro = [m for m in ml if "pro" in m]; model = (pro or ml or [None])[0]
if not model: print("NOT: Gemini TTS modeli yok"); sys.exit(0)
print(f"NOT: Gemini TTS model {model}")
for jf in sorted(glob.glob("kuyruk/*.json")):
    j = json.load(open(jf, encoding="utf-8")); kod = j["kod"]; os.makedirs(f"cikti/{kod}", exist_ok=True); ses = j.get("gemini_ses", "Charon"); tamam = True
    for p in j["parcalar"]:
        metin = (p.get("ton", "Belgesel anlatıcısı gibi canlı oku") + ": " + p["metin"])
        g = {"contents": [{"parts": [{"text": metin}]}], "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": ses}}}}}
        for d in range(6):
            try:
                r = urllib.request.Request(f"{U}/models/{model}:generateContent", data=json.dumps(g).encode(), headers={"x-goog-api-key": G, "Content-Type": "application/json"}, method="POST")
                y = json.load(urllib.request.urlopen(r, timeout=180)); pcm = base64.b64decode(y["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
                w = wave.open(f"cikti/{kod}/{p['id']}.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(pcm); w.close(); break
            except urllib.error.HTTPError as e:
                m = e.read().decode("utf-8", "replace")[:160]; print(f"NOT: {kod}/{p['id']} HTTP {e.code} {m}"); time.sleep(25 * (d + 1))
            except Exception as e: print(f"NOT: {kod}/{p['id']} {e}"); time.sleep(10)
        else: tamam = False; break
        time.sleep(7)
    if tamam:
        json.dump({"kaynak": "gemini-tts", "model": model, "ses": ses, "tempo": 1.0}, open(f"cikti/{kod}/meta.json", "w")); print(f"NOT: {kod} tamam · Gemini {ses}")
PY
fi
K=$(/opt/aesun/kasa_coz.sh google_tts_anahtar 2>/dev/null) || K=""
if [ -z "$K" ]; then ls cikti/*/meta.json >/dev/null 2>&1 || echo "NOT: ANAHTAR_YOK kasaya google_tts_anahtar ya da gemini_api_anahtar girilmeli"; exit 0; fi
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
    if os.path.exists(f"cikti/{kod}/meta.json"): continue
    if os.path.exists(f"cikti/{kod}/meta.json"): continue
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
