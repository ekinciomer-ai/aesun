#!/bin/bash
# Nabız + (imaj değişince bir kez) hız denemesi. Sonuçlar sunucuya rig/<ad>/ altına yazılır (rig anahtarı yalnız bu alana yazabilir).
set -u
K=/opt/aerig; API=https://api.aksarayenerji.net; cd $K || exit 1
AD=$(cat ad); AN=$(cat anahtar)
gonder(){ curl -s -o /dev/null -w '%{http_code}' --max-time 30 -X POST -H "X-AE-Anahtar: $AN" -H 'Content-Type: application/json' \
          --data-binary @"$K/is/$1" "$API/v1/veri?a=yaz&yol=rig/$AD/$1"; }
mkdir -p is; cp deneme.sh is/
KUTU="docker run --rm --device /dev/dri -v $K/is:/is aerig:1"
GPUS=$($KUTU vulkaninfo --summary 2>/dev/null | grep -i deviceName | grep -vi llvmpipe | sed 's/.*= *//' | paste -sd';')
NG=$(echo "$GPUS" | tr ';' '\n' | grep -c .)
$KUTU python3 -c "import json,time,sys;g=[x for x in sys.argv[1].split(';') if x];print(json.dumps({'ad':sys.argv[2],'zaman':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),'gpu_sayisi':len(g),'gpular':g,'imaj':sys.argv[3],'yuk':sys.argv[4]},ensure_ascii=False))" \
  "$GPUS" "$AD" "$(cat imaj_surum 2>/dev/null)" "$(cut -d' ' -f1-3 /proc/loadavg)" > is/nabiz.json 2>/dev/null
echo "$(date '+%F %T') nabız: $(gonder nabiz.json) · gpu $NG"
# hız denemesi (imaj başına bir kez)
if [ ! -f deneme_tamam ] && [ "$NG" -gt 0 ]; then
  rm -f is/deneme.json
  $KUTU bash /is/deneme.sh "$(seq -s, 0 $((NG-1)))" > is/kutu.log 2>&1
  if [ -s is/deneme.json ]; then
    R=$(gonder deneme.json); echo "$(date '+%F %T') deneme: $R $(cat is/deneme.json)"
    [ "$R" = 200 ] && touch deneme_tamam
  else echo "$(date '+%F %T') HATA deneme: $(tail -c 400 is/kutu.log)"; fi
fi
