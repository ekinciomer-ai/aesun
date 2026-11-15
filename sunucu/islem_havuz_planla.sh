#!/bin/bash
# Yükleme Yöneticisi: yayın planını yeniden hesaplar (zamanı olmayan işlere ilk uygun saat) ve özeti yazar.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
python3 /opt/aesun/havuz/yonetici.py planla
python3 /opt/aesun/havuz/yonetici.py durum --json
