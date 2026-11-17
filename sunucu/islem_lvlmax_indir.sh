#!/bin/bash
# Tampon bölge: LVL MAX kaynak kliplerini indirir (yt-dlp), her klipten 8 kare + bilgi çıkarır.
# Yalnız /opt/tampon/lvlmax içinde çalışır; sır okumaz, port açmaz, diğer uygulamalara dokunmaz.
# Kaynak listesi: sunucu/lvlmax/<proje>_kaynak.txt  ("ad url" satırları). Çıktı kareleri /opt/tampon/disari/lvlmax_kare.tgz
set -u
P=${P:-p01}
KOK=/opt/tampon/lvlmax; mkdir -p $KOK/$P/kaynak /opt/tampon/disari; cd $KOK || exit 1
L=/tmp/aesun_paket/sunucu/lvlmax/${P}_kaynak.txt; [ -f $L ] || { echo "NOT: HATA liste yok"; exit 1; }
command -v ffmpeg >/dev/null || { echo "NOT: HATA ffmpeg yok"; exit 1; }
[ -x $KOK/venv/bin/yt-dlp ] || { python3 -m venv $KOK/venv && $KOK/venv/bin/pip install -q -U yt-dlp; } >/dev/null 2>&1
$KOK/venv/bin/pip install -q -U yt-dlp >/dev/null 2>&1
rm -rf $KOK/$P/kare && mkdir -p $KOK/$P/kare
while read -r AD URL; do
  [ -z "${AD:-}" ] && continue
  case "$URL" in https://www.youtube.com/*|https://www.tiktok.com/*|https://www.instagram.com/*) ;; *) echo "NOT: $AD geçersiz"; continue;; esac
  cd $KOK/$P/kaynak; rm -f $AD.*
  if timeout 300 $KOK/venv/bin/yt-dlp -q --no-warnings -f "bv*[height<=1920][ext=mp4]+ba[ext=m4a]/b[ext=mp4]/b" --merge-output-format mp4 -o "$AD.%(ext)s" "$URL" 2> $AD.hata; then
    F=$AD.mp4; S=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$F"); WH=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 "$F")
    for i in $(seq 0 15); do T=$(python3 -c "print(round($S*($i+0.5)/16,2))"); ffmpeg -v error -y -ss "$T" -i "$F" -frames:v 1 -vf "scale=240:-2,drawtext=text='$T':x=4:y=4:fontsize=18:fontcolor=yellow:box=1:boxcolor=black" -q:v 5 "$KOK/$P/kare/${AD}_$(printf %02d $i).jpg" 2>/dev/null || ffmpeg -v error -y -ss "$T" -i "$F" -frames:v 1 -vf "scale=240:-2" -q:v 5 "$KOK/$P/kare/${AD}_$(printf %02d $i).jpg"; done
    echo "NOT: $AD indirildi · $S sn · $WH"
  else echo "NOT: HATA $AD: $(tail -1 $AD.hata | cut -c1-180)"; fi
done < $L
tar czf /opt/tampon/disari/lvlmax_kare.tgz -C $KOK/$P kare
echo "NOT: kareler hazır"
