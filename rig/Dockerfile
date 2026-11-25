# AKSARAY 1 video işçisi kutusu: AMD kartlarda Vulkan (RADV) ile büyütme (Real-ESRGAN, BSD-3), akıcılaştırma (RIFE, MIT),
# kartın kodlayıcısıyla mp4 (VAAPI). HiveOS'un kendi sistemine dokunmaz.
FROM ubuntu:24.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends mesa-vulkan-drivers vulkan-tools libvulkan1 \
      mesa-va-drivers vainfo ffmpeg libgomp1 bc curl unzip ca-certificates python3 && rm -rf /var/lib/apt/lists/*
RUN cd /tmp && curl -fsSL -o r.zip https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip \
 && mkdir -p /opt/esrgan && unzip -q r.zip -d /opt/esrgan && chmod +x /opt/esrgan/realesrgan-ncnn-vulkan \
 && printf '#!/bin/sh\ncd /opt/esrgan && exec ./realesrgan-ncnn-vulkan "$@"\n' > /usr/local/bin/realesrgan-ncnn-vulkan && chmod +x /usr/local/bin/realesrgan-ncnn-vulkan && rm r.zip
RUN cd /tmp && curl -fsSL -o f.zip https://github.com/nihui/rife-ncnn-vulkan/releases/download/20221029/rife-ncnn-vulkan-20221029-ubuntu.zip \
 && unzip -q f.zip -d /opt && mv /opt/rife-ncnn-vulkan-20221029-ubuntu /opt/rife && chmod +x /opt/rife/rife-ncnn-vulkan \
 && printf '#!/bin/sh\ncd /opt/rife && exec ./rife-ncnn-vulkan "$@"\n' > /usr/local/bin/rife-ncnn-vulkan && chmod +x /usr/local/bin/rife-ncnn-vulkan && rm f.zip
WORKDIR /is
