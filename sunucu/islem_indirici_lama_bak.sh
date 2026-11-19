#!/bin/bash
# İndirici: arka plandaki LaMa bölme işinin ilerlemesi (salt okunur)
C=/opt/tampon/indirici/parcalar_v2
systemctl is-active --quiet tampon-parcala && D="çalışıyor" || D="durdu"
B=$(cat $C/.basla 2>/dev/null || echo 0); S=$(date +%s)
echo "NOT: durum $D · geçen $(( (S-B)/60 )) dk · biten video $(ls $C/.bitti_* 2>/dev/null | wc -l)/16 · biten klip $(wc -l < $C/.ilerleme.log 2>/dev/null || echo 0)"
[ -f $C/.son ] && echo "NOT: iş tamamlandı"
[ -s $C/.hatalar ] && sed 's/^/NOT: HATA /' $C/.hatalar | cut -c1-200
tail -3 $C/.ilerleme.log 2>/dev/null | sed 's/^/NOT: son /'
