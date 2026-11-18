#!/bin/bash
# İndirici: LVL MAX için araştırmada bulunan en çok izlenen sıralama Shorts'larını en iyi kalitede indirir.
# Çıktı: /opt/tampon/indirici/disari/rank.tgz (iş akışı geri getirir, sonra siler)
set -u
KOK=/opt/tampon/indirici; H=$KOK/rank; mkdir -p $H $KOK/disari
[ -x $KOK/indir ] || { echo "NOT: HATA indirici kurulu değil"; exit 1; }
n=0; ok=0
while read -r AD ID; do
  [ -z "${AD:-}" ] && continue; n=$((n+1))
  if ls $H/${AD}__* >/dev/null 2>&1; then ok=$((ok+1)); echo "NOT: $AD zaten var"; continue; fi
  F=$(timeout 400 $KOK/indir "https://www.youtube.com/shorts/$ID" $H/tmp 2>$H/hata.txt | tail -1)
  if [ -n "$F" ] && [ -s "$F" ]; then
    E=$(ffprobe -v error -select_streams v:0 -show_entries stream=height -of csv=p=0 "$F" </dev/null)
    mv "$F" "$H/${AD}__${ID}_${E}p.mp4"; ok=$((ok+1)); echo "NOT: $AD indirildi · ${E}p · $(du -h "$H/${AD}__${ID}_${E}p.mp4" | cut -f1)"
  else echo "NOT: HATA $AD: $(grep -m1 ERROR $H/hata.txt | cut -c1-150)"; fi
done <<'EOF'
01_exploding_basketball FFL6j7QMghs
02_cheetah mXaq8qzjO_4
03_hibachi_chef M279AmmMOdg
04_perfect_timing_cop a61gETRjrFg
05_police_escape PQoY3b1x-bk
06_airplane_top5 D2jA6WuUqgk
07_bro_edit eUq_cw8PW5I
08_physics 7jH-ayTNxvU
09_funny_cat TsIvLpSJQbk
10_panda MgWX5wKkHks
11_trashtier_football_fails vL6HG9qLaBA
12_trashtier_dodgeball_fails J-YnFmLwpqU
13_rankingguy_turtle_talk Vwqunng5djI
14_level1_vs_100_base Ck3eLlRChSw
15_blaster_1_to_100 f5A8ucHn3mw
16_mystery_boxes_1_to_1000 Sfcx3JxXGds
EOF
rm -rf $H/tmp $H/hata.txt
tar cf $KOK/disari/rank.tgz -C $H . && echo "NOT: paket $(du -h $KOK/disari/rank.tgz | cut -f1) · $ok/$n video"
