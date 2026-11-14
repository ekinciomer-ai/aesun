#!/bin/bash
# Yükleme Yöneticisi: salt okunur durum raporu (önce platform kayıtlarıyla eşitler).
set -u
python3 /opt/aesun/havuz/yonetici.py esitle; python3 /opt/aesun/havuz/yonetici.py durum --json
