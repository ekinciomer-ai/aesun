#!/bin/bash
# AI motoru Normal girişi: Kasa'daki ücretsiz anahtarları (gemini_api_key, pixabay_anahtari) tampon MoneyPrinterTurbo
# ayarına yazar, yeniden başlatır ve kısa bir metin denemesi yapar. Anahtar değerleri hiçbir yere yazdırılmaz.
set -u
R=/opt/tampon/mpt/repo; AD=tampon-mpt; CFG=$R/config.toml
[ -f "$CFG" ] || { echo "NOT: HATA önce tampon_mpt kurulmalı"; exit 1; }
cp "$CFG" "$CFG.onceki"
GEM=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null || true)
PIX=$(/opt/aesun/kasa_coz.sh pixabay_anahtari 2>/dev/null || true)
echo "NOT: Kasa: gemini=$([ -n "$GEM" ] && echo var || echo yok) pixabay=$([ -n "$PIX" ] && echo var || echo yok)"
GEM="$GEM" PIX="$PIX" python3 - "$CFG" <<'PY'
import os,re,sys,json
p=sys.argv[1]; s=open(p,encoding='utf-8').read()
def ayar(k,v):
    global s
    s,n=re.subn(rf'(?m)^{k}\s*=.*$', lambda m: f'{k} = {v}', s, count=1)
    if not n: raise SystemExit("ayar bulunamadı: "+k)
g=os.environ.get("GEM","").strip(); x=os.environ.get("PIX","").strip()
if g:
    ayar("gemini_api_key", json.dumps(g)); ayar("gemini_model_name", '"gemini-flash-lite-latest"'); ayar("llm_provider", '"gemini"')
if x:
    ayar("pixabay_api_keys", json.dumps([x])); ayar("video_source", '"pixabay"')
open(p,'w',encoding='utf-8').write(s)
print("NOT: biçim: gemini " + ("AIza…/" + str(len(g)) if g.startswith("AIza") else ("tanınmayan/" + str(len(g)) if g else "-")))
PY
unset GEM PIX
chmod 600 "$CFG"
docker restart $AD >/dev/null
for i in $(seq 1 30); do c=$(curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8180/docs); [ "$c" = 200 ] && break; sleep 2; done
echo "NOT: MPT: $c"
# Deneme: İspanyolca kısa metin (ücretsiz model)
curl -s --max-time 90 -X POST http://127.0.0.1:8180/api/v1/scripts -H 'Content-Type: application/json' \
  -d '{"video_subject":"La caída de Granada en 1492","video_language":"es","paragraph_number":1}' > /tmp/mpt_deneme.json
python3 -c "
import json
try:
  d=json.load(open('/tmp/mpt_deneme.json')); t=(d.get('data') or {}).get('video_script') or d.get('message')
  import re;print('NOT: metin denemesi: ' + re.sub(r'AIza[0-9A-Za-z_-]+','AIza***',str(t))[:300].replace(chr(10),' '))
except Exception as e: print('NOT: metin denemesi okunamadı: ' + open('/tmp/mpt_deneme.json').read()[:300])"
docker logs --since 2m $AD 2>&1 | grep -iE 'error|exception' | tail -2 | cut -c1-250 | sed -E 's/AIza[0-9A-Za-z_-]+/AIza***/g; s/^/NOT: günlük: /'
rm -f "$CFG.onceki" /tmp/mpt_deneme.json
