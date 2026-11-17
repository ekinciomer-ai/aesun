#!/bin/bash
# Gemini TTS (AI Studio anahtarı) deneme.
# Kasa: gemini_api_anahtar (yoksa gemini_api_key). Charon ve Fenrir sesleriyle kısa Türkçe deneme üretir → /opt/tampon/disari/gemini_tts_deneme.tgz (iş çıktısı olarak indirilir).
# Anahtar değeri hiçbir yere yazdırılmaz.
set -uo pipefail
G=$(/opt/aesun/kasa_coz.sh gemini_api_anahtar 2>/dev/null) || G=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null) || { echo "NOT: HATA kasada Gemini anahtarı yok"; exit 1; }
U=https://generativelanguage.googleapis.com/v1beta
T=$(mktemp -d); trap 'rm -rf $T' EXIT
curl -s -m 30 -H "x-goog-api-key: $G" "$U/models?pageSize=200" -o $T/m.json
MODELLER=$(python3 -c "import json;print(' '.join(m['name'].split('/')[1] for m in json.load(open('$T/m.json')).get('models',[]) if 'tts' in m['name']))" 2>/dev/null)
echo "NOT: TTS modelleri: ${MODELLER:-yok ($(head -c 200 $T/m.json | tr '\n' ' '))}"
METIN='Heyecanlı, merak uyandıran bir belgesel anlatıcısı gibi oku: Türkiye’nin çatısı neresi? En yüksek on dağa haritada tek tek dolaşalım. Ve birinci… Ağrı Dağı! Beş bin yüz otuz yedi metre ile Türkiye’nin çatısı.'
mkdir -p $T/out
for SES in Charon Fenrir; do
 for MODEL in gemini-3.8-flash-tts gemini-3.8-flash-lite-tts gemini-3.1-flash-tts-preview gemini-2.5-flash-preview-tts; do
  case " $MODELLER " in *" $MODEL "*) ;; *) continue;; esac
  python3 - "$METIN" "$SES" > $T/istek.json <<'PY'
import json, sys
print(json.dumps({"contents":[{"parts":[{"text":sys.argv[1]}]}],
 "generationConfig":{"responseModalities":["AUDIO"],
  "speechConfig":{"voiceConfig":{"prebuiltVoiceConfig":{"voiceName":sys.argv[2]}}}}}))
PY
  k=$(curl -s -m 120 -o $T/y.json -w '%{http_code}' -H "x-goog-api-key: $G" -H 'Content-Type: application/json' -d @$T/istek.json "$U/models/$MODEL:generateContent")
  python3 - $T/y.json $T/out/${SES}__$MODEL.wav <<'PY' && { echo "NOT: $SES / $MODEL: $k tamam"; break; } || echo "NOT: $SES / $MODEL: $k $(grep -o '"message": "[^"]\{0,90\}' $T/y.json | head -1)"
import base64, json, sys, wave
d = json.load(open(sys.argv[1]))
p = d["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
w = wave.open(sys.argv[2], "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(24000); w.writeframes(base64.b64decode(p)); w.close()
PY
 done
done
ls $T/out/*.wav >/dev/null 2>&1 || exit 1
if command -v ffmpeg >/dev/null; then for f in $T/out/*.wav; do ffmpeg -loglevel error -y -i $f -b:a 128k ${f%.wav}.mp3 && rm $f; done
else docker run --rm -v $T/out:/o --entrypoint sh aesun-tts:1 -c 'for f in /o/*.wav; do ffmpeg -loglevel error -y -i $f -b:a 128k ${f%.wav}.mp3 && rm $f; done' 2>/dev/null || true; fi
mkdir -p /opt/tampon/disari && tar czf /opt/tampon/disari/gemini_tts_deneme.tgz -C $T/out . && echo "NOT: deneme dosyaları: $(ls $T/out | tr '\n' ' ')"
