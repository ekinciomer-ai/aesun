#!/bin/bash
# İndirici: biten LaMa kliplerini paketler (disari/parcalar.tgz)
C=/opt/tampon/indirici/parcalar_v2
ls $C/*.mp4 >/dev/null 2>&1 || { echo "NOT: HATA henüz klip yok"; exit 1; }
tar cf /opt/tampon/indirici/disari/parcalar.tgz -C $C $(cd $C && ls *.mp4) && echo "NOT: $(ls $C/*.mp4 | wc -l) klip paketlendi · $(du -sh /opt/tampon/indirici/disari/parcalar.tgz | cut -f1)"
