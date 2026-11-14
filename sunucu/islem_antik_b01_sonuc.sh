#!/bin/bash
# Salt okunur: arka plan kaydının durumu; bittiyse 480p önizlemeyi günlüğe basar.
K=/opt/tampon/antik_b01
if [ -f $K/arka.bitti ]; then echo "NOT: bitti $(cat $K/arka.bitti)"; grep 'NOT:' $K/arka.log | grep -v ONIZLEME | tail -5
  echo "ONIZLEME_BASLA karma_480.mp4"; base64 -w 4000 $K/cikti/antik_b01_gercek_480.mp4; echo "ONIZLEME_BITTI"
else echo "NOT: sürüyor · $(tail -c 300 $K/isg.log | tr '\n' ' ' | tail -c 120)"; fi
