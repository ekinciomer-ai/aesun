#!/bin/bash
# Midong 480p önizleme kurgusu: Blender kareleri (12 kare/sn, 165 sn) + Earth Studio yeri (15 sn, şimdilik yer tutucu) + yazılar.
# Kullanım: midong_kurgu.sh <kare_klasörü> <çıktı.mp4> [earth_klip.mp4]
set -euo pipefail
K=$1; OUT=$2; EARTH=${3:-}
FONT=$(fc-match -f '%{file}' 'DejaVu Sans:bold' 2>/dev/null || echo /usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf)
FONTR=$(fc-match -f '%{file}' 'DejaVu Sans' 2>/dev/null || echo /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf)
W=854; H=480; T=$(mktemp -d)
n=$(ls $K/kare_*.jpg | wc -l); echo "kare: $n"
# 1) Blender filmi (165 sn) → ham video
ffmpeg -loglevel error -y -framerate 12 -start_number 1 -i $K/kare_%04d.jpg -vf "scale=$W:$H,fps=30,format=yuv420p" -c:v libx264 -preset veryfast -crf 20 $T/film.mp4 2>/dev/null \
 || ffmpeg -loglevel error -y -framerate 12 -pattern_type glob -i "$K/kare_*.jpg" -vf "scale=$W:$H,fps=30,format=yuv420p" -c:v libx264 -preset veryfast -crf 20 $T/film.mp4
# 2) Earth Studio inişi: klip varsa o, yoksa 15 sn yer tutucu
if [ -n "$EARTH" ] && [ -f "$EARTH" ]; then
  ffmpeg -loglevel error -y -i "$EARTH" -t 15 -vf "scale=$W:$H:force_original_aspect_ratio=increase,crop=$W:$H,fps=30,format=yuv420p" -an -c:v libx264 -preset veryfast -crf 20 $T/earth.mp4
else
  ffmpeg -loglevel error -y -f lavfi -i "color=c=0x101418:s=${W}x$H:d=15:r=30" -vf "drawtext=fontfile=$FONT:text='GOOGLE EARTH İNİŞİ':fontcolor=0xf05a23:fontsize=24:x=(w-tw)/2:y=h*0.18,drawtext=fontfile=$FONTR:text='Uzaydan Urumçi / Midong sahasına (44,08° K · 87,74° D)':fontcolor=white:fontsize=16:x=(w-tw)/2:y=h*0.18+36,drawtext=fontfile=$FONTR:text='Earth Studio klibi gelince buraya eklenecek':fontcolor=0x9aa0a6:fontsize=13:x=(w-tw)/2:y=h*0.18+62,format=yuv420p" -c:v libx264 -preset veryfast -crf 20 $T/earth.mp4
fi
# 3) Sıralama: film 0–5 (kanca) + earth 15 sn + film 5–165
ffmpeg -loglevel error -y -i $T/film.mp4 -t 5 -c copy $T/a.mp4
ffmpeg -loglevel error -y -ss 5 -i $T/film.mp4 -c:v libx264 -preset veryfast -crf 20 $T/c.mp4
printf "file '%s'\nfile '%s'\nfile '%s'\n" $T/a.mp4 $T/earth.mp4 $T/c.mp4 > $T/liste.txt
ffmpeg -loglevel error -y -f concat -safe 0 -i $T/liste.txt -c:v libx264 -preset veryfast -crf 20 $T/ham.mp4
# 4) Yazılar (video zamanı = film zamanı + 15, kanca hariç)
dt() { # $1 metin, $2 başla, $3 bitir, $4 boyut, $5 y, $6 renk
  echo "drawtext=fontfile=$FONT:text='$1':fontcolor=${6:-white}:fontsize=$4:x=(w-tw)/2:y=$5:box=1:boxcolor=0x000000@0.45:boxborderw=10:enable='between(t,$2,$3)'"
}
lt() { # alt yazı bandı: başlık + alt satır
  echo "drawtext=fontfile=$FONT:text='$1':fontcolor=0xf05a23:fontsize=22:x=28:y=h-92:box=1:boxcolor=0x0b0d0f@0.6:boxborderw=8:enable='between(t,$3,$4)',drawtext=fontfile=$FONTR:text='$2':fontcolor=white:fontsize=17:x=28:y=h-56:box=1:boxcolor=0x0b0d0f@0.6:boxborderw=8:enable='between(t,$3,$4)'"
}
F=$(cat <<EOF
$(dt '3 dakikada 3,5 GW güneş santrali' 0.2 5 30 'h*0.38'),$(dt 'nasıl yapılır?' 0.6 5 34 'h*0.38+46' 0xf05a23),$(dt 'NASIL YAPILDI?' 15 20 40 'h*0.42' 0xf05a23),
$(lt 'Ağustos 2023 · Boş çöl' 'Urumçi, Sincan · 20 万亩 ≈ 133 km²' 20.5 34),
$(lt 'Kazık çakma' '1.230.000 çelik kazık · sahada 10.000+ işçi' 35.5 58),
$(lt 'Konstrüksiyon' 'Yedi üretici aynı anda üretti' 59.5 74),
$(lt 'Panel montajı' '5.260.000 panel × 650 W ≈ 3,42 GWp' 75.5 94),
$(lt 'Kablo ve inverter' 'Doğru akım sahada alternatif akıma çevrilir' 95.5 109),
$(lt '5 × 220 kV trafo merkezi' 'Her 700 MW için bir merkez · 208 km iletim hattı' 110.5 124),
$(lt 'Hızlandırılmış: Ağustos 2023 → Haziran 2024' 'Yaklaşık 10 ayda çölden şebekeye' 125.5 154),
$(lt '3,5 GW · yılda 6,09 TWh' '3 milyon hanenin yıllık elektriği' 155.5 172),
$(dt 'Sizce Türkiye böyle bir santrali kaç ayda kurar?' 172.5 180 20 'h*0.42'),
drawtext=fontfile=$FONTR:text='Canlandırma · Kozmos Lab':fontcolor=white@0.8:fontsize=13:x=w-tw-14:y=12,
drawtext=fontfile=$FONTR:text='3D modeller (CC BY): Randonavt, Daniel Zhabotinsky, Ricardo Sanchez, AirDigitalca':fontcolor=white@0.7:fontsize=11:x=14:y=h-18:enable='between(t,172,180)'
EOF
)
F=$(echo "$F" | tr -d '\n')
ffmpeg -loglevel error -y -i $T/ham.mp4 -vf "$F,format=yuv420p" -c:v libx264 -preset veryfast -crf 22 -movflags +faststart "$OUT"
ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT" | sed 's/^/süre: /'
rm -rf $T
