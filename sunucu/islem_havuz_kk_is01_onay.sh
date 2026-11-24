#!/bin/bash
# Kara Kutu "Kimin Kusuru? #1" (KK_IS_01): Ömer'in sohbette verdiği yayın onayı (24.11.2026 14:49: "evet yayınla").
set -u
Y=/opt/aesun/havuz/yonetici.py
python3 $Y onay KK_IS_01_KASADAN_DUSME evet "Ömer sohbette onayladı 24.11.2026 14:49"
python3 $Y durum 2>/dev/null | grep -E "KK_IS|KK_PI" | sed 's/^/NOT: /' | head -10
