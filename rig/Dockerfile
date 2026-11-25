# AKSARAY 1 video işçisi kutusu: AMD kartlarda Vulkan (RADV) ile büyütme (Real-ESRGAN, BSD-3), akıcılaştırma (RIFE, MIT),
# kartın kodlayıcısıyla mp4 (VAAPI). HiveOS'un kendi sistemine dokunmaz.
# HiveOS çekirdeği 5.4 (DRM 3.41): yeni Mesa (24.04) bu çekirdekte AMD kartları açmıyor, 20.04 Mesa 21.x açıyor.
FROM ubuntu:20.04
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -qq && apt-get install -y -qq --no-install-recommends mesa-vulkan-drivers vulkan-tools libvulkan1 \
      mesa-va-drivers vainfo ffmpeg libgomp1 bc curl unzip ca-certificates python3 && rm -rf /var/lib/apt/lists/*
RUN cd /tmp && curl -fsSL -o r.zip https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesrgan-ncnn-vulkan-20220424-ubuntu.zip \
 && mkdir -p /opt/esrgan && unzip -q r.zip -d /opt/esrgan && chmod +x /opt/esrgan/realesrgan-ncnn-vulkan \
 && printf '#!/bin/sh\ncd /opt/esrgan && exec ./realesrgan-ncnn-vulkan "$@"\n' > /usr/local/bin/realesrgan-ncnn-vulkan && chmod +x /usr/local/bin/realesrgan-ncnn-vulkan && rm r.zip
# RIFE isteğe bağlı: indirilemezse imaj yine derlenir (araç yok olarak raporlanır)
RUN cd /tmp && ( curl -fsSL -o f.zip https://github.com/nihui/rife-ncnn-vulkan/releases/download/20221029/rife-ncnn-vulkan-20221029-ubuntu.zip \
 && unzip -q f.zip -d /opt/rife_ac && D=$(dirname "$(find /opt/rife_ac -name rife-ncnn-vulkan -type f | head -1)") && mv "$D" /opt/rife \
 && chmod +x /opt/rife/rife-ncnn-vulkan \
 && printf '#!/bin/sh\ncd /opt/rife && exec ./rife-ncnn-vulkan "$@"\n' > /usr/local/bin/rife-ncnn-vulkan && chmod +x /usr/local/bin/rife-ncnn-vulkan ) \
 || echo "UYARI rife kurulamadı"; rm -rf /tmp/f.zip /opt/rife_ac
WORKDIR /is
