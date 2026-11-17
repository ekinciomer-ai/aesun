#!/bin/bash
# Tampon bölge: LVL MAX sıralama videosunu kurar (ffmpeg). Plan: sunucu/lvlmax/<P>_plan.json
# Girdi: /opt/tampon/lvlmax/<P>/kaynak/*.mp4 (islem_lvlmax_indir). Çıktı: 1080p sunucuda, 540p önizleme disari/lvlmax_onizleme.tgz
set -u
P=${P:-p01}; KOK=/opt/tampon/lvlmax/$P; mkdir -p $KOK/cikti /opt/tampon/disari
PL=/tmp/aesun_paket/sunucu/lvlmax/${P}_plan.json; [ -f $PL ] || { echo "NOT: HATA plan yok"; exit 1; }
cp $PL $KOK/plan.json
command -v fc-list >/dev/null && fc-list | grep -qi dejavu || { apt-get install -y -qq fonts-dejavu-core >/dev/null 2>&1 && echo "NOT: font kuruldu"; }
cd $KOK
python3 /tmp/aesun_paket/sunucu/lvlmax/kurgu.py plan.json kaynak cikti/${P}_onizleme.mp4 1 || exit 1
python3 /tmp/aesun_paket/sunucu/lvlmax/kurgu.py plan.json kaynak cikti/${P}_1080.mp4 || exit 1
ls -la cikti | awk '{print "NOT: " $5 " " $9}' | tail -3
tar czf /opt/tampon/disari/lvlmax_onizleme.tgz -C $KOK/cikti ${P}_onizleme.mp4 ${P}_1080.mp4
echo "NOT: önizleme hazır"
