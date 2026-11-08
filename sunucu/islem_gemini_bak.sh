#!/bin/bash
# Salt okunur: Kasa'daki Gemini anahtarı ile kısa denemeler (değer yazdırılmaz).
G=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null) || { echo "NOT: Kasa'da gemini_api_key yok"; exit 0; }
B='{"contents":[{"parts":[{"text":"Responde solo: hola"}]}]}'
for m in gemini-flash-lite-latest gemini-3.5-flash gemini-flash-latest; do
  r=$(curl -s -m 60 -o /tmp/g.json -w '%{http_code} %{time_total}s' -H "x-goog-api-key: $G" -H 'Content-Type: application/json' -d "$B" "https://generativelanguage.googleapis.com/v1beta/models/$m:generateContent")
  echo "NOT: $m: $r · $(head -c 300 /tmp/g.json | tr '\n' ' ' | sed -E 's/AIza[0-9A-Za-z_-]+/***/g')"
done
echo "NOT: GET modeller: $(curl -s -m 30 -o /dev/null -w '%{http_code} %{time_total}s' -H "x-goog-api-key: $G" https://generativelanguage.googleapis.com/v1beta/models)"
rm -f /tmp/g.json
