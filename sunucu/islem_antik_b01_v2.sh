#!/bin/bash
# Antik Stüdyo B01 v2 (yeni senaryo: tek gizem + açık döngü + ödül). Ses yeniden üretilir, tepe taşı fotoğrafı indirilir, gerçek görüntü kurgusu. YAYINLAMAZ.
set -u
bash sunucu/islem_antik_b01.sh | grep -E '^NOT:' | grep -vE 'ÇIKTI|kalite' 
K=/opt/tampon/antik_b01/klip
if [ ! -s $K/piramidyon.jpg ]; then
  curl -sSL -A "AntikStudyo/1.0 (ekinciomer-ai)" -o $K/piramidyon.jpg "https://commons.wikimedia.org/wiki/Special:FilePath/Pyramidion_of_the_Pyramid_of_Amenemhet_III_at_Dahshur.jpg"
  chown 1500:1500 $K/piramidyon.jpg
fi
echo "NOT: tepe taşı fotoğrafı $(file -b $K/piramidyon.jpg | cut -c1-60)"
bash sunucu/islem_antik_b01_gercek_tam.sh
