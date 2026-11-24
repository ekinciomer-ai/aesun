#!/bin/bash
# Kara Kutu "Patron mu Haklı?" #1-5: teslim (#1 güncel sürümle yenilenir, yayınlanmamışsa) + plan + Ömer'in sohbette verdiği onay (24.11.2026 13:02: "evet tamam yayınla").
set -u
Y=/opt/aesun/havuz/yonetici.py
mkdir -p /opt/aesun/video_bekleyen
python3 - <<'PY'
import sys; sys.path.insert(0,'/opt/aesun/havuz'); import yonetici as y
idx=y.yukle(); k='KK_PI_01_ISTIFA_DILEKCESI'
if k in idx and idx[k].get('durum')=='onay_bekliyor':
    idx[k]['durum']='kontrol_hatasi'; y.olay(idx[k],'yeni sürüm (kanca: Genelde böyle bilinir) için yeniden teslim'); y.kaydet(idx); print('NOT: #1 yenilemeye açıldı')
elif k in idx: print('NOT: #1 durumu', idx[k].get('durum'), '— yenilenmedi')
PY
for kod in KK_PI_01_ISTIFA_DILEKCESI KK_PI_02_KULLANILMAYAN_IZIN KK_PI_03_HATA_YAPTIN_KOVULDUN KK_PI_04_DEVAMSIZLIK KK_PI_05_ISRARLI_MESAJ; do
  install -m 644 "sunucu/havuz/gelen/${kod}.mp4" "/opt/aesun/video_bekleyen/${kod}_kaynak.mp4" || { echo "NOT: HATA ${kod} kopyalanamadı"; continue; }
  python3 $Y teslim "sunucu/havuz/teslim/${kod}.json"
done
python3 $Y planla | grep -E "KK_PI" || true
for kod in KK_PI_01_ISTIFA_DILEKCESI KK_PI_02_KULLANILMAYAN_IZIN KK_PI_03_HATA_YAPTIN_KOVULDUN KK_PI_04_DEVAMSIZLIK KK_PI_05_ISRARLI_MESAJ; do
  python3 $Y onay "$kod" evet "Ömer sohbette onayladı 24.11.2026 13:02"
done
python3 $Y durum 2>/dev/null | grep -E "KK_PI" | sed 's/^/NOT: /' | head -10
