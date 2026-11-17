#!/bin/bash
# Salt okur denetim: sunucu/tts_kuyruk/cikti/<desen>*.mp3 seslerini Gemini ile yazıya döker (ne okunduğunu görmek için).
set -u
G=$(/opt/aesun/kasa_coz.sh gemini_api_anahtar 2>/dev/null) || G=""
[ -n "$G" ] || G=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null) || G=""
[ -n "$G" ] || { echo "NOT: Gemini anahtarı yok"; exit 0; }
python3 - "$G" sunucu/tts_kuyruk/cikti/GEMINI_SES__*.mp3 <<'PY'
import sys, json, base64, urllib.request, time
k = sys.argv[1]
for f in sys.argv[2:]:
    g = {"contents": [{"parts": [{"text": "Bu ses kaydında söylenen her kelimeyi, hangi dilde olursa olsun, aynen yazıya dök. Sadece döküm."},
                                 {"inlineData": {"mimeType": "audio/mp3", "data": base64.b64encode(open(f, "rb").read()).decode()}}]}]}
    for m in ("gemini-2.5-flash", "gemini-3.8-flash", "gemini-2.0-flash"):
        try:
            r = urllib.request.Request(f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={k}",
                                       data=json.dumps(g).encode(), headers={"Content-Type": "application/json"}, method="POST")
            with urllib.request.urlopen(r, timeout=120) as y:
                t = json.load(y)["candidates"][0]["content"]["parts"][0]["text"]
            print(f"NOT: {f.split('/')[-1]} → {' '.join(t.split())[:300]}"); break
        except Exception as e:
            print(f"NOT: {m} olmadı: {str(e)[:60]}")
    time.sleep(4)
PY
exit 0
