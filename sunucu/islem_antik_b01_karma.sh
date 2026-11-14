#!/bin/bash
# Antik B01 karma sürüm: Higgsfield sunucu çekimleri (kanca + kapanış) + ücretsiz gerçek görüntü kurgusu. YAYINLAMAZ.
set -u
K=/opt/tampon/antik_b01
[ -f $K/cikti/antik_b01_v2_ucretsiz_1080.mp4 ] || cp $K/cikti/antik_b01_gercek_1080.mp4 $K/cikti/antik_b01_v2_ucretsiz_1080.mp4
curl -sSfL -o $K/klip/take1.mp4 "https://d8j0ntlcm91z4.cloudfront.net/user_3F35Z01dg48YfZdbCpdAtehrgsa/hf_20261114_145526_33e354e7-e9f2-4f5d-b2ed-481af6dacda3.mp4" && \
curl -sSfL -o $K/klip/take2.mp4 "https://d8j0ntlcm91z4.cloudfront.net/user_3F35Z01dg48YfZdbCpdAtehrgsa/hf_20261114_145527_f6c80e4f-be7d-4e66-b9da-19c7da29a8e3.mp4" || { echo "NOT: HATA çekimler indirilemedi"; exit 1; }
chown 1500:1500 $K/klip/take*.mp4
for t in take1 take2; do echo "NOT: $t $(docker run --rm -v $K/klip:/k:ro tampon-video15:2 ffprobe -v error -show_entries stream=codec_type,width,height -show_entries format=duration -of csv=p=0 /k/$t.mp4 | tr '\n' ' ')"; done
bash sunucu/islem_antik_b01_gercek_tam.sh
