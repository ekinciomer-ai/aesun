#!/bin/bash
# Animasyon denemesi: metin.txt'den ElevenLabs ile ses + kelime zamanları (Claude animasyon rehberi, ses.py yöntemi).
# Anahtar /opt/cutkoda/motor.env'den okunur, yazdırılmaz. Çıktı /opt/sosyal/animasyon/<ad>/ ve günlükte base64 (indirmek için).
set -uo pipefail
AD=${AD:-kombin}; K=/tmp/aesun_paket/sunucu/sosyal/animasyon/public/$AD; H=/opt/sosyal/animasyon/$AD
mkdir -p $H && cp $K/metin.txt $H/
EL=$(grep '^ELEVENLABS_API_KEY=' /opt/cutkoda/motor.env 2>/dev/null | cut -d= -f2-)
[ -n "$EL" ] || { echo "NOT: HATA ElevenLabs anahtarı yok"; exit 1; }
EL="$EL" H="$H" python3 - <<'PY'
import base64, json, os, re, urllib.request, urllib.error
klasor = os.environ["H"]; ses = "u2ZPme1hNaHzZRbw9S82"   # Ses D (kanalın varsayılan klon sesi)
satirlar = [x.strip() for x in open(f"{klasor}/metin.txt", encoding="utf-8") if x.strip()]
metin, kelimeler = "", []
for c, satir in enumerate(satirlar):
    for parca in re.findall(r"\[[^\]]*\]|\S+", satir):
        if metin:
            metin += " "
        if parca.startswith("["):
            metin += parca
            continue
        gor, oku = parca.split("|", 1) if "|" in parca else (parca, parca)
        oku = oku.replace("_", " ")
        kelimeler.append({"w": gor, "a": len(metin), "b": len(metin) + len(oku), "c": c})
        metin += oku
print("NOT: metin", len(metin), "karakter")
sonuc = None
for model in ("eleven_v4", "eleven_v3"):
    for dil in (True, False):
        govde = {"text": metin, "model_id": model,
                 "voice_settings": {"stability": 0.3, "similarity_boost": 0.85, "speed": 1.0}}
        if dil:
            govde["language_code"] = "tr"
        r = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{ses}/with-timestamps?output_format=mp3_44100_128",
                                   data=json.dumps(govde).encode(), headers={"xi-api-key": os.environ["EL"], "Content-Type": "application/json"})
        try:
            sonuc = json.load(urllib.request.urlopen(r, timeout=240)); print("NOT: model", model, "dil kodu", dil); break
        except urllib.error.HTTPError as e:
            print("NOT: deneme", model, dil, "HTTP", e.code, e.read()[:160])
    if sonuc:
        break
if not sonuc:
    raise SystemExit("NOT: HATA ses üretilemedi")
open(f"{klasor}/ses.mp3", "wb").write(base64.b64decode(sonuc["audio_base64"]))
h = sonuc.get("normalized_alignment") or sonuc["alignment"]
h = sonuc["alignment"]
cikti = [{"w": k["w"], "s": h["character_start_times_seconds"][k["a"]], "e": h["character_end_times_seconds"][k["b"] - 1], "c": k["c"]} for k in kelimeler]
json.dump(cikti, open(f"{klasor}/kelimeler.json", "w", encoding="utf-8"), ensure_ascii=False)
print("NOT: süre", round(cikti[-1]["e"], 1), "sn,", len(cikti), "kelime")
PY
[ -f $H/ses.mp3 ] || exit 1
echo "SES_BASLA"; base64 -w 0 $H/ses.mp3; echo; echo "SES_BITIS"
echo "KEL_BASLA"; base64 -w 0 $H/kelimeler.json; echo; echo "KEL_BITIS"
