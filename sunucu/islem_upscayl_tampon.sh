#!/bin/bash
# Tampon: Upscayl motoru (upscayl-bin, AGPL – yalnız iç kullanım) + yazılımsal Vulkan; TikTok videolarını indirip netleştirme denemesi
D=/opt/tampon/upscayl; mkdir -p $D/girdi $D/cikti; cd $D
export DEBIAN_FRONTEND=noninteractive
command -v ffmpeg >/dev/null || apt-get -qq install -y ffmpeg >/dev/null
dpkg -s mesa-vulkan-drivers >/dev/null 2>&1 || { apt-get -qq update >/dev/null; apt-get -qq install -y mesa-vulkan-drivers libvulkan1 vulkan-tools unzip >/dev/null; }
echo "NOT: vulkan cihaz: $(vulkaninfo --summary 2>/dev/null | grep -m1 deviceName | sed 's/.*= //')"
# upscayl-bin (son sürüm)
if [ ! -x $D/bin/upscayl-bin ]; then
  U=$(curl -s https://api.github.com/repos/upscayl/upscayl-ncnn/releases/latest | grep -o 'https://[^"]*linux[^"]*\.zip' | head -1)
  echo "NOT: indiriliyor $U"; curl -sL "$U" -o bin.zip && mkdir -p bin && unzip -qo bin.zip -d bintmp && find bintmp -name 'upscayl-bin' -exec cp {} bin/ \; && chmod +x bin/upscayl-bin; rm -rf bintmp bin.zip
fi
if [ ! -d $D/models ]; then
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/upscayl/upscayl.git up && (cd up && git sparse-checkout set resources/models) && mv up/resources/models $D/models; rm -rf up
fi
echo "NOT: modeller: $(ls $D/models | sed 's/\..*//' | sort -u | tr '\n' ' ')"
# videoları indir (yt-dlp ayrı venv)
[ -x $D/venv/bin/yt-dlp ] || { python3 -m venv $D/venv && $D/venv/bin/pip -q install yt-dlp >/dev/null 2>&1; }
i=0; for u in https://vt.tiktok.com/ZSpD75Qmr/ https://vt.tiktok.com/ZSpUDFd6Q/; do i=$((i+1))
  $D/venv/bin/yt-dlp -q --no-warnings -o "girdi/v$i.%(ext)s" "$u" 2>&1 | tail -2 | sed 's/^/NOT: /'
  f=$(ls girdi/v$i.* 2>/dev/null | head -1); [ -z "$f" ] && { echo "NOT: v$i indirilemedi"; continue; }
  echo "NOT: v$i $(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate,duration -of csv=p=0 "$f") · $($D/venv/bin/yt-dlp --no-warnings --print '%(uploader)s | %(title).60s' "$u" 2>/dev/null)"
  ffmpeg -loglevel error -y -ss 1 -i "$f" -frames:v 1 girdi/v${i}_kare.png
  t0=$(date +%s); timeout 900 ./bin/upscayl-bin -i girdi/v${i}_kare.png -o cikti/v${i}_kare_x4.png -m $D/models -n upscayl-standard-4x -s 4 >/tmp/up.log 2>&1; rc=$?
  echo "NOT: v$i tek kare 4x: kod $rc, $(( $(date +%s)-t0 )) sn, $(ls -la cikti/v${i}_kare_x4.png 2>/dev/null | awk '{print $5" bayt"}')"; [ $rc -ne 0 ] && tail -3 /tmp/up.log | sed 's/^/NOT: /'
done
