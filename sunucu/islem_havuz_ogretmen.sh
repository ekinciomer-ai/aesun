#!/bin/bash
# Öğretmenler Günü: Başöğretmen Short'u (Antik Stüdyo) 24.11 09:00. Ömer 23.11 23:55: o gün tek seferlik 9 video (toplam sınır istisnası).
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
Y=/opt/aesun/havuz/yonetici.py; K=AS_GT_BASOGRETMEN
python3 - <<'PY'
import sys; sys.path.insert(0, "/opt/aesun/havuz")
import yonetici as y
idx = y.yukle(); it = idx.get("AS_GT_BASOGRETMEN")
if not it:
    print("NOT: HATA havuzda yok")
else:
    it["kart"]["toplam_sinir_istisna"] = "2026-11-24"; it["kart"]["yayin_zamani"] = "2026-11-24T09:00+03:00"
    y.olay(it, "Ömer 23.11 23:55: 24.11 için tek seferlik toplam sınır istisnası (o gün 9 video)")
    y.kaydet(idx); print("NOT: istisna yazıldı · durum " + it.get("durum", "?"))
PY
python3 $Y yonlendir 2>&1 | grep -E "NOT:|===|$K" | cut -c1-6000
