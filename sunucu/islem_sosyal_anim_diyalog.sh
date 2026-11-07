#!/bin/bash
# İki sesli diyalog: metin.txt'de "S:" satırları soran ses (Uğur), "C:" satırları cevap veren ses (Ses D).
# Her satır ayrı üretilir, aralarına sessizlik konur; kelime zamanları tek zaman çizelgesinde birleşir.
# Anahtar /opt/cutkoda/motor.env'den okunur, yazdırılmaz. Çıktı günlükte base64 (indirmek için).
set -uo pipefail
AD=${AD:-$(cat /tmp/aesun_paket/sunucu/sosyal/animasyon/DIYALOG_ISI 2>/dev/null || echo tablo_sor)}
K=/tmp/aesun_paket/sunucu/sosyal/animasyon/public/$AD; H=/opt/sosyal/animasyon/$AD
mkdir -p $H/parca && cp $K/metin.txt $H/
EL=$(grep '^ELEVENLABS_API_KEY=' /opt/cutkoda/motor.env 2>/dev/null | cut -d= -f2-)
[ -n "$EL" ] || { echo "NOT: HATA ElevenLabs anahtarı yok"; exit 1; }
command -v ffmpeg >/dev/null || { echo "NOT: HATA ffmpeg yok"; exit 1; }
EL="$EL" H="$H" python3 - <<'PY'
import base64, json, os, re, subprocess, urllib.request, urllib.error
klasor = os.environ["H"]
SESLER = {"S": ("fSruVisKJEvQqmgx0yZT", 0.45), "C": ("u2ZPme1hNaHzZRbw9S82", 0.3)}  # Uğur (soru), Ses D (cevap)
BOSLUK = {"S": 0.45, "C": 0.75}  # satırdan sonra sessizlik (sn)
def uret(ses, metin, stab):
    for model in ("eleven_v4", "eleven_v3"):
        for dil in (True, False):
            govde = {"text": metin, "model_id": model, "voice_settings": {"stability": stab, "similarity_boost": 0.85, "speed": 1.0}}
            if dil:
                govde["language_code"] = "tr"
            r = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{ses}/with-timestamps?output_format=mp3_44100_128",
                data=json.dumps(govde).encode(), headers={"xi-api-key": os.environ["EL"], "Content-Type": "application/json"})
            try:
                return json.load(urllib.request.urlopen(r, timeout=240))
            except urllib.error.HTTPError as e:
                print("NOT: deneme", model, dil, "HTTP", e.code, e.read()[:160])
    raise SystemExit("NOT: HATA ses üretilemedi")
satirlar = [x.strip() for x in open(f"{klasor}/metin.txt", encoding="utf-8") if x.strip()]
t0, kelimeler, liste, toplam = 0.0, [], [], 0
for c, satir in enumerate(satirlar):
    kim, govde = satir.split(":", 1); kim = kim.strip(); govde = govde.strip()
    metin, ks = "", []
    for parca in re.findall(r"\[[^\]]*\]|\S+", govde):
        if metin: metin += " "
        if parca.startswith("["): metin += parca; continue
        gor, oku = parca.split("|", 1) if "|" in parca else (parca, parca)
        ks.append({"w": gor, "a": len(metin), "b": len(metin) + len(oku)}); metin += oku
    toplam += len(metin)
    ses, stab = SESLER[kim]; s = uret(ses, metin, stab)
    mp3 = f"{klasor}/parca/{c:02d}.mp3"; open(mp3, "wb").write(base64.b64decode(s["audio_base64"]))
    h = s["alignment"]
    sure = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp3], capture_output=True, text=True).stdout)
    for k in ks:
        kelimeler.append({"w": k["w"], "s": round(t0 + h["character_start_times_seconds"][k["a"]], 3),
                          "e": round(t0 + h["character_end_times_seconds"][k["b"] - 1], 3), "c": c, "k": kim})
    wav = f"{klasor}/parca/{c:02d}.wav"
    subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", mp3, "-af", f"aresample=44100,apad=pad_dur={BOSLUK[kim]}", "-ac", "1", wav], check=True)
    liste.append(wav); t0 += sure + BOSLUK[kim]
    print("NOT: satır", c, kim, round(sure, 2), "sn")
with open(f"{klasor}/parca/liste.txt", "w") as f:
    f.writelines(f"file '{x}'\n" for x in liste)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-f", "concat", "-safe", "0", "-i", f"{klasor}/parca/liste.txt", "-c:a", "libmp3lame", "-b:a", "160k", f"{klasor}/ses.mp3"], check=True)
json.dump(kelimeler, open(f"{klasor}/kelimeler.json", "w", encoding="utf-8"), ensure_ascii=False)
print("NOT: toplam", toplam, "karakter, süre", round(t0, 1), "sn,", len(kelimeler), "kelime")
PY
[ -f $H/ses.mp3 ] || exit 1
echo "SES_BASLA"; base64 -w 0 $H/ses.mp3; echo; echo "SES_BITIS"
echo "KEL_BASLA"; base64 -w 0 $H/kelimeler.json; echo; echo "KEL_BITIS"
