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
# nabız kutusuz üretilir (kutu yoksa da rapor gider); son hatalar dahil
HATA=$(grep -h HATA kur.log guncelle.log 2>/dev/null | tail -n 4 | tr '\n' '|' | tr -d '"\\' | cut -c1-900)
printf '{"ad":"%s","zaman":"%s","gpu_sayisi":%s,"gpular":"%s","imaj":"%s","docker":"%s","yuk":"%s","pci_amd":%s,"son_hatalar":"%s"}\n' \
  "$AD" "$(date -u +%FT%TZ)" "$NG" "$(echo "$GPUS" | tr -d '"\\')" "$(cat imaj_surum 2>/dev/null)" "$(docker --version 2>/dev/null | cut -c1-40)" \
  "$(cut -d' ' -f1-3 /proc/loadavg)" "$(lspci 2>/dev/null | grep -ciE 'vga.*(amd|ati)')" "$HATA" > is/nabiz.json
NB=$(gonder nabiz.json); echo "$(date '+%F %T') nabız: $NB · gpu $NG"
[ "$NB" = 200 ] || { echo "nabız gönderilemedi, deneme atlandı"; exit 0; }
# hız denemesi (imaj başına bir kez)
if [ -z "${DENEMESIZ:-}" ] && [ ! -f deneme_tamam ] && [ "$NG" -gt 0 ]; then
  rm -f is/deneme.json
  $KUTU bash /is/deneme.sh "$(seq -s, 0 $((NG-1)))" > is/kutu.log 2>&1
  if [ -s is/deneme.json ]; then
    R=$(gonder deneme.json); echo "$(date '+%F %T') deneme: $R $(cat is/deneme.json)"
    [ "$R" = 200 ] && touch deneme_tamam
  else echo "$(date '+%F %T') HATA deneme: $(tail -c 400 is/kutu.log)"; fi
fi
