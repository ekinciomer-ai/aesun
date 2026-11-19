#!/bin/bash
# İndirici: arka plandaki LaMa işini durdurur, modeli paketler (başka makinede çalıştırmak için)
KOK=/opt/tampon/indirici
systemctl stop tampon-parcala 2>/dev/null; pkill -f "$KOK/parcala.py" 2>/dev/null
systemctl is-active --quiet tampon-parcala && echo "NOT: HATA durmadı" || echo "NOT: arka plan işi durduruldu"
echo "NOT: o ana kadar biten klip: $(ls $KOK/parcalar_v2/*.mp4 2>/dev/null | wc -l)"
tar czf $KOK/disari/lama_model.tgz -C $KOK/model lama_fp32.onnx && echo "NOT: model paketlendi"
