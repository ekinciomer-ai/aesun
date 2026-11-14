#!/bin/bash
# Yükleme Yöneticisi: icerik/havuz/teslim/*.json kartlarını havuza alır (video kartın kaynak_dosya yolundan kopyalanır) ve kontrol eder.
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
for k in icerik/havuz/teslim/*.json; do [ -f "$k" ] || continue; python3 /opt/aesun/havuz/yonetici.py teslim "$k"; done
python3 /opt/aesun/havuz/yonetici.py durum --json
