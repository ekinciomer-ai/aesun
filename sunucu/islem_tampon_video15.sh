#!/bin/bash
# Tampon bölge: TikTok'taki 15 açık kaynak video/animasyon reposu (Claude ile video) yalıtılmış kapsayıcıda kurulur ve denenir.
# Yer: /opt/tampon/video15 · Kapsayıcı: tampon-video15 (--rm, kalıcı süreç yok, port açmaz, sır okumaz).
# Diğer uygulamalara (aesun, gesfin, epixa, mirsoft, agrosev, cutkoda, caddy) dokunmaz. Telemetri kapalı.
set -u
KOK=/opt/tampon/video15
IMAJ=tampon-video15:2
echo "NOT: sunucu: $(nproc) çekirdek · bellek kullanılabilir $(free -m | awk '/Mem/{print $7}') MB · disk boş $(df -h / | tail -1 | awk '{print $4}')"
BOS_GB=$(df -BG / | tail -1 | awk '{gsub("G","",$4); print $4}')
[ "${BOS_GB:-0}" -lt 12 ] && { echo "NOT: HATA disk boş alanı 12 GB altında, durduruldu"; exit 1; }
command -v docker >/dev/null || { echo "NOT: HATA docker yok"; exit 1; }
BELLEK_MB=4096; CEKIRDEK=3
echo "NOT: tampon sınırı: ${BELLEK_MB} MB bellek, ${CEKIRDEK} çekirdek"

mkdir -p $KOK/repo $KOK/is $KOK/cikti $KOK/log $KOK/.home /opt/tampon/disari
rm -f $KOK/log/*
[ -f $KOK/cikti/04_remotion_skill_focuscat.mp4 ] && mv $KOK/cikti/04_remotion_skill_focuscat.mp4 $KOK/cikti/04_remotion_skill_ornek.mp4
[ -f $KOK/cikti/05_claude_motion_effort.mp4 ] && mv $KOK/cikti/05_claude_motion_effort.mp4 $KOK/cikti/05_claude_motion.mp4

# 1) Repolar (motion ve remotion kütüphaneleri npm'den gelir)
for r in AbubakrChan/product-launch-motion charlie947/motion-graphics-skills howseen-ai/claude-motion-design nateherkai/herk-edit-kit Barty-Bart/motion-graphics cth9191/animate whaleyxbt/claude-motion haidrrrry/claude-remotion-skill 199-biotechnologies/motion-dev-animations-skill heygen-com/hyperframes remotion-dev/skills greensock/gsap-skills LottieFiles/motion-design-skill; do
  n=${r#*/}; d=$KOK/repo/$n
  if [ -d $d/.git ]; then git -C $d fetch -q --depth 1 origin HEAD && git -C $d reset -q --hard FETCH_HEAD; else git clone -q --depth 1 https://github.com/$r.git $d; fi
  say() { grep -rIlE "$1" $d --exclude-dir=.git --exclude-dir=node_modules 2>/dev/null | wc -l; }
  echo "NOT: repo $n @$(git -C $d log -1 --format=%h) · curl|sh=$(say 'curl[^|]*\|[[:space:]]*(ba)?sh') · ssh-anahtar=$(say '\.ssh/id_') · çerez=$(say 'Login Data|Cookies\.sqlite')"
done

# 2) Yalıtılmış imaj
cat > $KOK/Dockerfile <<'EOF'
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 python3-venv python3-pip git ffmpeg ca-certificates curl \
    libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libgbm1 libasound2 libxrandr2 libxkbcommon0 libxshmfence1 \
    libxfixes3 libxcomposite1 libxdamage1 libpango-1.0-0 libcairo2 libcups2 libdrm2 libxss1 libgtk-3-0 libatomic1 \
    fonts-dejavu fonts-noto-color-emoji fonts-liberation \
 && rm -rf /var/lib/apt/lists/*
RUN useradd -m -u 1500 tampon
USER tampon
EOF
docker build -q -t $IMAJ $KOK >/dev/null 2>$KOK/log/build.err || { echo "NOT: HATA imaj: $(tail -3 $KOK/log/build.err | tr '\n' ' ' | cut -c1-200)"; exit 1; }
echo "NOT: imaj hazır: $(docker image inspect $IMAJ --format '{{.Size}}' | awk '{printf "%.1f GB", $1/1e9}')"

rm -rf $KOK/is/*; cp -r sunucu/tampon_video15/* $KOK/is/
chown -R 1500:1500 $KOK
RUN="docker run --rm --memory ${BELLEK_MB}m --cpus ${CEKIRDEK} --pids-limit 2048 --shm-size 1g --security-opt no-new-privileges --cap-drop ALL \
 -e HOME=/work/.home -e DO_NOT_TRACK=1 -e HYPERFRAMES_NO_TELEMETRY=1 -e HYPERFRAMES_NO_UPDATE_CHECK=1 -e NPM_CONFIG_UPDATE_NOTIFIER=false -e NPM_CONFIG_FUND=false -e NPM_CONFIG_AUDIT=false \
 -v $KOK:/work -w /work $IMAJ"
HF="npx -y hyperframes@0.9.44"

dene() { # dene <ad> <saniye> <komut>  (çıktısı zaten varsa atlanır)
  local ad=$1 sure=$2; shift 2; local b=$(date +%s)
  ls $KOK/cikti/${ad}*.mp4 >/dev/null 2>&1 && { echo "NOT: TEST $ad: önceki çalışmada üretildi, atlandı"; return; }
  $RUN timeout $sure bash -c "$*" > $KOK/log/$ad.log 2>&1; local k=$?
  local s=$(( $(date +%s) - b ))
  echo "NOT: TEST $ad: $([ $k -eq 0 ] && echo BAŞARILI || echo "HATA kod=$k") · ${s} sn · $(grep -v '^\s*$' $KOK/log/$ad.log | tail -1 | tr -d '\r' | cut -c1-150)"
}

# GSAP dosyası (HyperFrames örnekleri için)
dene 00_gsap 300 "mkdir -p /work/.gsap && cd /work/.gsap && npm i -s gsap@3 >/dev/null && mkdir -p /work/is/antik_hf/assets && cp node_modules/gsap/dist/gsap.min.js /work/is/antik_hf/assets/ && mkdir -p /work/repo/herk-edit-kit/examples/starter/assets && cp node_modules/gsap/dist/gsap.min.js /work/repo/herk-edit-kit/examples/starter/assets/ && echo gsap tamam"

# 11 HyperFrames (+14 GSAP, 15 Lottie ilkeleri): Antik Stüdyo örnek sahne
dene 01_hyperframes_antik 1500 "cd /work/is/antik_hf && ($HF check --json | tail -c 600 || true) && $HF render --quality looks -o /work/cikti/01_hyperframes_antik.mp4"
# 4 herk-edit-kit başlangıç örneği (HyperFrames tabanlı)
dene 02_herk_starter 900 "cd /work/repo/herk-edit-kit/examples/starter && $HF render --quality draft -o /work/cikti/02_herk_starter.mp4"
# 12 Remotion: aynı Antik Stüdyo sahnesi
dene 03_remotion_antik 1500 "cd /work/is/antik_remotion && npm install -s >/dev/null && npx remotion render src/index.ts Antik /work/cikti/03_remotion_antik.mp4 --codec h264 --crf 20 --concurrency 3"
# 8 claude-remotion-skill hazır örnek
dene 04_remotion_skill_ornek 1500 "cd /work/repo/claude-remotion-skill/examples && npm install -s >/dev/null && (npm run -s audio || true) && npx remotion render src/index.ts FocusCatPromo /work/cikti/04_remotion_skill_ornek.mp4 --codec h264 --crf 22 --concurrency 3"
# 7 claude-motion hazır örnek (taslak kalite)
dene 05_claude_motion 1800 "cd /work/repo/claude-motion && npm install -s >/dev/null && npx remotion render EffortVideo /work/cikti/05_claude_motion.mp4 --scale=0.5 --crf=28 --concurrency 3"
# 6 animate: kesik kâğıt stili demo
dene 06_animate_cutpaper 1800 "cd /work/repo/animate/plugins/animate/skills/animate && (test -f package.json || npm init -y >/dev/null) && npm i -s playwright@1 >/dev/null && npx playwright install chromium >/dev/null && rm -rf pieces/demo && mkdir -p pieces && cp -r styles/cut-paper/demo pieces/demo && node tools/build.mjs pieces/demo && node tools/export.mjs pieces/demo --share --workers 3 && cp \$(ls pieces/demo/renders/share.mp4 pieces/demo/renders/final.mp4 2>/dev/null | head -1) /work/cikti/06_animate_cutpaper.mp4"
# 3 claude-motion-design örnek film (30 fps, alt kare yok: hızlı deneme)
dene 07_motion_design_film 1800 "cd /work/repo/claude-motion-design/examples/howseen-launch && python3 -m venv /work/.home/venv7 && . /work/.home/venv7/bin/activate && pip -q install playwright "numpy==1.26.4" imageio-ffmpeg >/dev/null && python -m playwright install chromium >/dev/null && (python fetch_assets.py >/dev/null 2>&1 || true) && sed -i 's/FPS, T, SUB = 60, 24.0, 8/FPS, T, SUB = 30, 24.0, 1/' render.py && mkdir -p out && (python -m http.server 8000 >/dev/null 2>&1 &) && sleep 2 && python render.py full && cp out/video.mp4 /work/cikti/07_motion_design_film.mp4"

# Kodla Film Stilleri (kendi kodumuz, canvas): Antik Stüdyo için 5 stil (Ukiyo-e, Sessiz Film, Kâğıt Kesik, Mürekkep, Vitray)
dene 08_kodla_film_5stil 1800 "mkdir -p /work/.pw && cd /work/.pw && (test -f package.json || npm init -y >/dev/null) && npm i -s playwright@1 >/dev/null && npx playwright install chromium >/dev/null && cp /work/is/kodla_film/kayit.mjs /work/.pw/ && node /work/.pw/kayit.mjs /work/is/kodla_film/index.html /work/cikti/08_kodla_film_5stil.mp4 24"

# Hata ayrıntısı (başarısız testlerin son satırları)
for t in 01_hyperframes_antik 02_herk_starter 07_motion_design_film 08_kodla_film_5stil; do
  ls $KOK/cikti/${t}*.mp4 >/dev/null 2>&1 && continue
  [ -f $KOK/log/$t.log ] && grep -v '^\s*$' $KOK/log/$t.log | tail -14 | cut -c1-180 | sed "s/^/NOT: [$t] /"
done
# Çıktılar
for f in $KOK/cikti/*.mp4; do [ -f "$f" ] || continue
  echo "NOT: ÇIKTI $(basename $f): $(du -h $f | cut -f1) · $(ffprobe -v error -show_entries stream=width,height -show_entries format=duration -of csv=p=0 $f 2>/dev/null | tr '\n' ' ')"
done
# Önizleme: her video 540 px genişlik, küçük boyut; iş günlüğüne base64 basılır (sohbete getirmek için)
mkdir -p $KOK/onizleme && chown 1500:1500 $KOK/onizleme
for f in $KOK/cikti/*.mp4; do [ -f "$f" ] || continue; o=$KOK/onizleme/$(basename $f)
  [ -f "$o" ] || docker run --rm --memory 1g --cpus 2 --cap-drop ALL -v $KOK:/work $IMAJ ffmpeg -v error -y -i /work/cikti/$(basename $f) -vf "scale=540:-2" -c:v libx264 -crf 30 -preset veryfast -c:a aac -b:a 64k -movflags +faststart /work/onizleme/$(basename $f)
  echo "ONIZLEME_BASLA $(basename $f)"; base64 -w 4000 "$o"; echo "ONIZLEME_BITTI"
done
cd $KOK && tar czf /opt/tampon/disari/video15.tgz cikti log && echo "NOT: paket $(du -h /opt/tampon/disari/video15.tgz | cut -f1)"
