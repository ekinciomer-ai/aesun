#!/bin/bash
# GES kurulum filmi (Walking Block yöntemi + Polyfork modelleri) — tampon bölgede kurar ve render'ı arka planda başlatır.
# Orijinal repo /opt/tampon/ges_film/orijinal altında değiştirilmeden saklanır; iş kopyası /opt/tampon/ges_film/is.
# Durum ve teslim: islem_ges_film_bak. Canlı sistemlere dokunmaz.
set -uo pipefail
SD=$(cd "$(dirname "$0")" && pwd); . "$SD/ges_film/ayar.env"
T=/opt/tampon/ges_film; O=$T/orijinal; IS=$T/is; IMG=aesun-gesfilm:1
REPO=https://github.com/leonxlnx/walking-block; SABIT=54bd15b63b767801dc4d5186a0eb9935c7a08ee5
mkdir -p $T
docker ps -q -f name=^gesfilm$ | grep -q . && { echo "NOT: render zaten çalışıyor (gesfilm). Durum için ges_film_bak."; exit 0; }
if [ ! -d $O/.git ]; then git clone -q $REPO $O && git -C $O checkout -q $SABIT && echo "NOT: walking-block alındı ($SABIT)" || { echo "NOT: HATA repo alınamadı"; exit 1; }; fi
echo "NOT: orijinal sürüm $(git -C $O rev-parse --short HEAD) (lisans: $(head -1 $O/LICENSE))"
# iş kopyası: orijinal + bizim sahne dosyaları + CPU yaması
rm -rf $IS.yeni && cp -a $O $IS.yeni && rm -rf $IS.yeni/.git
cp -r "$SD/ges_film/src/ges" $IS.yeni/src/ && cp "$SD/ges_film/ges.html" $IS.yeni/ && cp "$SD/ges_film/tools/ges_ses.mjs" $IS.yeni/tools/
(cd $IS.yeni && patch -s -p1 < "$SD/ges_film/tools/render_cpu.patch") || { echo "NOT: HATA yama uygulanamadı"; exit 1; }
mkdir -p $IS.yeni/assets/polyfork
for m in mobile-crane-671d3f tracked-excavator-8ebd3c pickup-truck-a34bf2 construction-worker-c1ad8c groundworker-083f5c crane-banksman-3994e0 cargo-container-fd73bc cargo-forklift-91f591 tall-pine-tree-ab4108 oak-tree-50ee7c articulated-dump-truck-ee50f3 commander-s-tent-c8b8b5; do
  cp /opt/tampon/polyfork/modeller/$m.glb $IS.yeni/assets/polyfork/ || { echo "NOT: HATA model yok: $m (önce tampon_polyfork)"; exit 1; }
done
# önceki çıktı varsa sakla (geri alınabilir)
[ -d $IS/out ] && mv $IS/out $IS.yeni/out_onceki_$(date +%m%d%H%M)
rm -rf $IS && mv $IS.yeni $IS
# kapsayıcı imajı: puppeteer (Chrome + Node) + ffmpeg
if ! docker image inspect $IMG >/dev/null 2>&1; then
  mkdir -p $T/imaj && cat > $T/imaj/Dockerfile <<'D'
FROM ghcr.io/puppeteer/puppeteer:23.11.1
USER root
RUN apt-get update -qq && apt-get install -y -qq ffmpeg >/dev/null && rm -rf /var/lib/apt/lists/*
USER pptruser
D
  docker build -q -t $IMG $T/imaj >/dev/null && echo "NOT: imaj kuruldu ($IMG)" || { echo "NOT: HATA imaj kurulamadı"; exit 1; }
fi
chown -R 10042:10042 $IS 2>/dev/null || chmod -R a+rwX $IS
if [ "$MOD" = "taslak" ]; then R="--w 540 --h 960 --every 3"; else R="--w 1080 --h 1920 --mb 3"; fi
cat > $IS/calistir.sh <<C
set -e
cd /w
npm install --ignore-scripts --no-audit --no-fund -q
export CHROME_PATH=\$(node -e "console.log(require('puppeteer').executablePath())" 2>/dev/null || ls /home/pptruser/.cache/puppeteer/chrome/*/chrome-linux64/chrome | head -1)
node tools/ges_ses.mjs --out out/ges_ses.wav
node tools/render.mjs --page ges.html --fps 30 --from 0 --to 15 $R --dir out/kareler
if [ "$MOD" = "taslak" ]; then
  ffmpeg -v error -y -framerate 10 -i out/kareler/f_%06d.png -i out/ges_ses.wav -filter_complex "[0:v]minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:scd=fdiff:scd_threshold=8,scale=1080:1920:flags=lanczos,format=yuv420p[v]" -map "[v]" -map 1:a -c:v libx264 -crf 20 -c:a aac -b:a 192k -shortest -movflags +faststart out/ges_film_taslak.mp4
else
  ls out/kareler | head -1 | grep -q f_000000 && bash tools/mux.sh out/kareler out/ges_ses.wav out/ges_film_1080x1920.mp4
fi
echo BITTI > out/durum.txt
C
mkdir -p $IS/out && echo BASLADI > $IS/out/durum.txt
docker run -d --name gesfilm --rm --cpus 6 -m 6g -v $IS:/w -w /w --entrypoint bash $IMG /w/calistir.sh >/dev/null && echo "NOT: render başladı (MOD=$MOD, 6 çekirdek). Durum: ges_film_bak" || echo "NOT: HATA render başlatılamadı"
