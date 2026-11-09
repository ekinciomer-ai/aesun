#!/bin/bash
# Tampon: Upscayl motoru (upscayl-bin, AGPL – iç kullanım). Ağır iş arka planda çalışır; sonuç: islem upscayl_sonuc_bak
D=/opt/tampon/upscayl; mkdir -p $D/girdi $D/cikti $D/models $D/bin; cd $D
export DEBIAN_FRONTEND=noninteractive
apt-get -qq install -y unzip vulkan-tools mesa-vulkan-drivers libvulkan1 ffmpeg >/dev/null 2>&1 || { apt-get -qq update >/dev/null; apt-get -qq install -y unzip vulkan-tools mesa-vulkan-drivers libvulkan1 ffmpeg >/dev/null; }
echo "NOT: vulkan cihaz: $(vulkaninfo --summary 2>/dev/null | grep -m1 deviceName | sed 's/.*= //')"
if [ ! -x bin/upscayl-bin ]; then U=$(curl -s https://api.github.com/repos/upscayl/upscayl-ncnn/releases/latest | grep -o 'https://[^"]*linux[^"]*\.zip' | head -1); curl -sL "$U" -o bin.zip && unzip -qo bin.zip -d bintmp && find bintmp -name upscayl-bin -exec cp {} bin/ \; && chmod +x bin/upscayl-bin; rm -rf bintmp bin.zip; fi
for e in bin param; do [ -s models/upscayl-standard-4x.$e ] || curl -sL https://raw.githubusercontent.com/upscayl/upscayl/main/resources/models/upscayl-standard-4x.$e -o models/upscayl-standard-4x.$e; done
echo "NOT: upscayl-bin $( [ -x bin/upscayl-bin ] && echo hazır || echo YOK ) · model $(du -sh models | cut -f1)"
[ -x venv/bin/yt-dlp ] || { python3 -m venv venv && venv/bin/pip -q install yt-dlp >/dev/null 2>&1; }
cat > is.sh <<'IS'
#!/bin/bash
cd /opt/tampon/upscayl; : > sonuc.txt; i=0
for u in https://vt.tiktok.com/ZSpD75Qmr/ https://vt.tiktok.com/ZSpUDFd6Q/; do i=$((i+1))
  venv/bin/yt-dlp -q --no-warnings -o "girdi/v$i.%(ext)s" "$u" >>sonuc.txt 2>&1
  f=$(ls girdi/v$i.* 2>/dev/null | grep -v kare | head -1); [ -z "$f" ] && { echo "v$i indirilemedi" >>sonuc.txt; continue; }
  echo "v$i $(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -show_entries format=duration -of csv=p=0 "$f" | tr '\n' ' ') · $(venv/bin/yt-dlp --no-warnings --print '%(uploader)s | %(title).70s' "$u" 2>/dev/null)" >>sonuc.txt
  ffmpeg -loglevel error -y -ss 1 -i "$f" -frames:v 1 girdi/v${i}_kare.png
  t0=$(date +%s); timeout 1800 bin/upscayl-bin -i girdi/v${i}_kare.png -o cikti/v${i}_kare_x4.png -m models -n upscayl-standard-4x -s 4 >log_v$i.txt 2>&1
  echo "v$i tek kare 4x: kod $?, $(( $(date +%s)-t0 )) sn, $(identify -format '%wx%h' cikti/v${i}_kare_x4.png 2>/dev/null || ls -la cikti/v${i}_kare_x4.png 2>/dev/null | awk '{print $5}')" >>sonuc.txt; tail -2 log_v$i.txt >>sonuc.txt
done; echo BITTI >>sonuc.txt
IS
chmod +x is.sh; nohup ./is.sh >/dev/null 2>&1 & echo "NOT: iş arka planda başladı"
