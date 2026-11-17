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
# 1) Gemini TTS (Google, tonlu anlatım) — önce kanala ayrılmış anahtar (gemini_api_anahtar_nasilyapildi; diğer kanalların ses hakkını tüketmez),
#    yoksa ortak: gemini_api_anahtar / gemini_api_key
G=$(/opt/aesun/kasa_coz.sh gemini_api_anahtar_nasilyapildi 2>/dev/null) || G=""
[ -n "$G" ] && echo "NOT: Nasıl Yapıldı kanal anahtarı kullanılıyor" || { G=$(/opt/aesun/kasa_coz.sh gemini_api_anahtar 2>/dev/null) || G=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null) || G=""; }
if [ -n "$G" ]; then
python3 - "$G" <<'PY'
# Ücretsiz katman günde az istek verir: her video TEK istekte okunur, paragraflar arası sessizlikten parçalara bölünür.
import json, sys, glob, os, base64, time, wave, array, urllib.request, urllib.error
G = sys.argv[1]; U = "https://generativelanguage.googleapis.com/v1beta"
def get(u): return json.load(urllib.request.urlopen(urllib.request.Request(u, headers={"x-goog-api-key": G}), timeout=30))
try: ml = [m["name"].split("/")[1] for m in get(f"{U}/models?pageSize=200").get("models", []) if "tts" in m["name"]]
except Exception as e: print(f"NOT: Gemini model listesi alınamadı {e}"); sys.exit(0)
fl = [m for m in ml if "flash" in m]; modeller = fl + [m for m in ml if m not in fl]
if not modeller: print("NOT: Gemini TTS modeli yok"); sys.exit(0)
SR = 24000
def oku(model, metin, ses):
    g = {"contents": [{"parts": [{"text": metin}]}], "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": {"prebuiltVoiceConfig": {"voiceName": ses}}}}}
    r = urllib.request.Request(f"{U}/models/{model}:generateContent", data=json.dumps(g).encode(), headers={"x-goog-api-key": G, "Content-Type": "application/json"}, method="POST")
    y = json.load(urllib.request.urlopen(r, timeout=300)); return base64.b64decode(y["candidates"][0]["content"]["parts"][0]["inlineData"]["data"])
def kes(pcm, n, agirlik):
    a = array.array("h"); a.frombytes(pcm); fr = SR // 50  # 20 ms
    en = [max(abs(x) for x in a[i:i + fr]) if a[i:i + fr] else 0 for i in range(0, len(a), fr)]
    esik = max(en) * 0.03; sess = []; b = None
    for i, e in enumerate(en + [esik * 99]):
        if e < esik and b is None: b = i
        elif e >= esik and b is not None:
            if i - b >= 8 and b > 0 and i < len(en): sess.append((i - b, (b + i) // 2))
            b = None
    T = len(en); top = sum(agirlik); hedef = []; c = 0
    for w in agirlik[:-1]: c += w; hedef.append(T * c / top)
    secim = []
    for h in hedef:  # her beklenen sınıra en yakın uzun sessizlik
        aday = [s for s in sess if s[1] not in secim and abs(s[1] - h) < T * 0.12]
        if not aday: return None
        secim.append(max(aday, key=lambda s: s[0] - abs(s[1] - h) / 25)[1])
    if secim != sorted(secim): return None
    return [x * fr for x in secim]
for jf in sorted(glob.glob("kuyruk/*.json")):
    j = json.load(open(jf, encoding="utf-8")); kod = j["kod"]; ses = j.get("gemini_ses", "Charon"); P = j["parcalar"]
    talimat = ("Türkçe, merak uyandıran, canlı ve tonları sürekli değişen bir belgesel anlatıcısı gibi oku; tekdüze olma. "
               "Her paragraftan sonra bir saniye sus. Paragrafların tonları sırayla: " + " | ".join(p.get("ton", "canlı") for p in P) + ".\n\n")
    metin = talimat + "\n\n".join(p["metin"] for p in P)
    import hashlib
    ONB = "/opt/tampon/ny_gemini"; onb = f"{ONB}/{kod}_{hashlib.md5((ses + metin).encode()).hexdigest()[:10]}.pcm"
    pcm = open(onb, "rb").read() if os.path.exists(onb) else None
    if pcm: print(f"NOT: {kod} önbellekten")
    for model in ([] if pcm else modeller):
        try: pcm = oku(model, metin, ses); print(f"NOT: {kod} Gemini {model} {ses} {len(pcm)/2/SR:.1f} sn"); break
        except urllib.error.HTTPError as e: print(f"NOT: {kod} {model} HTTP {e.code} {e.read().decode('utf-8','replace')[:120]}")
        except Exception as e: print(f"NOT: {kod} {model} {e}")
    if not pcm: continue
    os.makedirs(f"cikti/{kod}", exist_ok=True)
    w = wave.open(f"cikti/{kod}/tam.wav", "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm); w.close()
    os.makedirs(ONB, exist_ok=True); open(onb, "wb").write(pcm)
    json.dump({"kaynak": "gemini-tts", "ses": ses, "tempo": 1.0, "bol": 1}, open(f"cikti/{kod}/meta.json", "w")); print(f"NOT: {kod} tam ses hazır")
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
