#!/bin/bash
# Kutu içinde çalışır: 120 karelik test videosuyla büyütme, akıcılaştırma ve kodlama süreleri. Çıktı /is/deneme.json
set -u; cd /is; rm -rf d; mkdir -p d/k d/b d/r
GL="$1"
s(){ date +%s.%N; }; f(){ echo "$(s) - $1" | bc; }
ffmpeg -loglevel error -f lavfi -i testsrc2=size=640x360:rate=30 -t 4 -pix_fmt yuv420p /is/d/test.mp4
ffmpeg -loglevel error -i /is/d/test.mp4 /is/d/k/%04d.png
N=$(ls d/k | wc -l)
t=$(s); realesrgan-ncnn-vulkan -i /is/d/k -o /is/d/b -n realesr-animevideov3 -s 2 -g 0 >/is/esrgan.log 2>&1; e1=$(f $t)
rm -f d/b/*; t=$(s); realesrgan-ncnn-vulkan -i /is/d/k -o /is/d/b -n realesr-animevideov3 -s 2 -g "$GL" >>/is/esrgan.log 2>&1; e2=$(f $t); nb=$(ls d/b | wc -l)
if command -v rife-ncnn-vulkan >/dev/null; then t=$(s); rife-ncnn-vulkan -i /is/d/k -o /is/d/r -g 0 >/is/rife.log 2>&1; e3=$(f $t); else e3=-1; fi; nr=$(ls d/r | wc -l)
t=$(s); if ffmpeg -loglevel error -y -vaapi_device /dev/dri/renderD128 -i /is/d/test.mp4 -vf format=nv12,hwupload -c:v h264_vaapi /is/d/v.mp4 2>/is/vaapi.log; then e4=$(f $t); else e4=-1; fi
t=$(s); ffmpeg -loglevel error -y -i /is/d/test.mp4 -c:v libx264 -preset veryfast /is/d/c.mp4; e5=$(f $t)
python3 -c "import json;print(json.dumps({'kare':$N,'buyutme_2x_tek_gpu_sn':$e1,'buyutme_2x_tum_gpu_sn':$e2,'buyutulen_kare':$nb,
 'rife_tek_gpu_sn':$e3,'rife_kare':$nr,'kodlama_gpu_sn':$e4,'kodlama_cpu_sn':$e5,'not':'4 sn 640x360 test videosu'}))" > /is/deneme.json
rm -rf d
