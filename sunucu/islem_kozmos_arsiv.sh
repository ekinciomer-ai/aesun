#!/bin/bash
# Kozmos Lab uzay görsel arşivini arka planda kurar/günceller (NASA kamu malı + ESA CC BY 4.0).
# Kod: /opt/kozmos/arsiv_kod (yedeğe girer). Görseller: /var/kozmos/arsiv (yeniden indirilebilir, yedeği şişirmesin diye /opt dışında).
# Durum için: islem_kozmos_arsiv_bak
set -u
HEDEF=/var/kozmos/arsiv; KOD=/opt/kozmos/arsiv_kod
BOS=$(df -BG --output=avail / | tail -1 | tr -dc 0-9)
[ "${BOS:-0}" -ge 40 ] || { echo "NOT: HATA disk boş alanı ${BOS} GB, en az 40 GB gerekli; başlatılmadı"; exit 1; }
if systemctl is-active --quiet kozmos-arsiv; then echo "NOT: arşiv işi zaten çalışıyor"; exit 0; fi
python3 -c 'import PIL' 2>/dev/null || { DEBIAN_FRONTEND=noninteractive apt-get install -y -q python3-pil >/dev/null 2>&1 && echo "NOT: python3-pil kuruldu"; }
mkdir -p "$KOD" "$HEDEF"
cp sunucu/kozmos/arsiv_indir.py sunucu/kozmos/liste.json "$KOD/"
systemctl reset-failed kozmos-arsiv 2>/dev/null
systemd-run --unit=kozmos-arsiv --nice=15 -p IOSchedulingClass=idle -p MemoryMax=6G -p CPUQuota=200% \
  /usr/bin/python3 -I "$KOD/arsiv_indir.py" "$KOD/liste.json" "$HEDEF" >/dev/null 2>&1 \
  && echo "NOT: arşiv indirme arka planda başladı (düşük öncelik, en çok 2 çekirdek / 6 GB bellek)" \
  || { echo "NOT: HATA arka plan işi başlatılamadı"; exit 1; }
echo "NOT: disk boş: ${BOS} GB · hedef $HEDEF"
