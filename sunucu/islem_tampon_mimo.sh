#!/bin/bash
# Tampon bölge: Xiaomi MiMo-V2.5-TTS Türkçe seslendirme denemesi (24.11.2026).
# Kasa: mimo_api_key (Ömer portal Kasa'ya girdi). Anahtar hiçbir yere yazdırılmaz.
# Aynı metin: MiMo hazır sesler (mimo_default, Mia, Chloe, Milo, Dean) + ses tasarımı (2 tarif) + karşılaştırma için Gemini Charon.
# Yalnız /opt/tampon/mimo altına yazar, başka uygulamaya dokunmaz. Çıktı: /opt/tampon/mimo/cikti/*.mp3
set -uo pipefail
KOK=/opt/tampon/mimo; OUT=$KOK/cikti
mkdir -p $OUT; rm -f $OUT/*
K=$(/opt/aesun/kasa_coz.sh mimo_api_key 2>/dev/null) || { echo "NOT: HATA kasada mimo_api_key yok"; exit 1; }
T=$(mktemp -d); trap 'rm -rf $T' EXIT
METIN='Türkiye’nin çatısı neresi? Gelin, en yüksek on dağı haritada tek tek dolaşalım. Onuncu sıradan başlıyoruz… Ve birinci… Ağrı Dağı! Beş bin yüz otuz yedi metre ile Türkiye’nin zirvesi.'
STIL='Türkçe oku. Heyecanlı, merak uyandıran bir belgesel anlatıcısı gibi; soru cümlelerinde merak, sıralamada gerilim, son cümlede coşku olsun. Tekdüze okuma.'
U=https://api.xiaomimimo.com/v1/chat/completions

mimo() { # $1 dosya adı, $2 model, $3 ses(boş olabilir), $4 user mesajı
  python3 - "$2" "$3" "$4" "$METIN" > $T/i.json <<'PY'
import json, sys
model, ses, user, metin = sys.argv[1:5]
m = [{"role": "user", "content": user}] if user else []
m.append({"role": "assistant", "content": metin})
a = {"format": "wav"}
if ses: a["voice"] = ses
print(json.dumps({"model": model, "messages": m, "audio": a}))
PY
  local bas=$(date +%s)
  local k=$(curl -s -m 180 -o $T/y.json -w '%{http_code}' -H "api-key: $K" -H 'Content-Type: application/json' -d @$T/i.json $U)
  python3 - $T/y.json $OUT/$1.wav <<'PY' && echo "NOT: $1: tamam ($(( $(date +%s)-bas )) sn)" || echo "NOT: $1: HATA $k $(head -c 220 $T/y.json | tr '\n' ' ')"
import base64, json, sys
d = json.load(open(sys.argv[1]))
open(sys.argv[2], "wb").write(base64.b64decode(d["choices"][0]["message"]["audio"]["data"]))
PY
}

for S in Dean Milo mimo_default Mia Chloe; do mimo "mimo_$S" mimo-v2.5-tts "$S" "$STIL"; done
mimo mimo_tasarim_erkek mimo-v2.5-tts-voicedesign "" "Türkçe konuşan, 40'lı yaşlarda, derin ve sıcak sesli erkek belgesel anlatıcısı. Net Türkçe telaffuz, dramatik ama doğal, merak uyandıran tonlama."
mimo mimo_tasarim_kadin mimo-v2.5-tts-voicedesign "" "Türkçe konuşan, 30'lu yaşlarda, enerjik ve samimi kadın anlatıcı. Net Türkçe telaffuz, canlı ve meraklı tonlama, sosyal medya videosu havası."

# Karşılaştırma: Gemini Charon (şu an kullanılan ses)
G=$(/opt/aesun/kasa_coz.sh gemini_api_anahtar 2>/dev/null) || G=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null) || G=""
if [ -n "$G" ]; then
  GU=https://generativelanguage.googleapis.com/v1beta
  curl -s -m 30 -H "x-goog-api-key: $G" "$GU/models?pageSize=200" -o $T/m.json
  for MODEL in $(python3 -c "import json;print(' '.join(m['name'].split('/')[1] for m in json.load(open('$T/m.json')).get('models',[]) if 'tts' in m['name']))" 2>/dev/null); do
    python3 - "$STIL $METIN" > $T/g.json <<'PY'
import json, sys
print(json.dumps({"contents":[{"parts":[{"text":sys.argv[1]}]}],"generationConfig":{"responseModalities":["AUDIO"],"speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":"Charon"}}}}}))
PY
    curl -s -m 120 -o $T/gy.json -H "x-goog-api-key: $G" -H 'Content-Type: application/json' -d @$T/g.json "$GU/models/$MODEL:generateContent"
    python3 - $T/gy.json $OUT/gemini_Charon.wav <<'PY' && { echo "NOT: gemini_Charon ($MODEL): tamam"; break; }
import base64, json, sys, wave
p = json.load(open(sys.argv[1]))["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
w = wave.open(sys.argv[2], "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(base64.b64decode(p)); w.close()
PY
  done
else echo "NOT: Gemini anahtarı yok, karşılaştırma atlandı"; fi

ls $OUT/*.wav >/dev/null 2>&1 || { echo "NOT: HATA hiç ses üretilemedi"; exit 1; }
if command -v ffmpeg >/dev/null; then for f in $OUT/*.wav; do ffmpeg -loglevel error -y -i $f -b:a 128k ${f%.wav}.mp3 && rm $f; done
else docker run --rm -v $OUT:/o --entrypoint sh aesun-tts:1 -c 'for f in /o/*.wav; do ffmpeg -loglevel error -y -i $f -b:a 128k ${f%.wav}.mp3 && rm $f; done' 2>/dev/null || true; fi
echo "NOT: dosyalar: $(ls $OUT | tr '\n' ' ')"
