#!/bin/bash
# Yükleme Yöneticisi sınır revizyonu (Ömer 16.11.2026): bir kanalda günde en fazla 4, tüm kanallar toplam günde en fazla 8 video.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 /opt/aesun/havuz/yonetici.py planla | head -30
