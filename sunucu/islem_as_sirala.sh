#!/bin/bash
# Antik Stüdyo: ekranda yazı "tasarım gereği" işaretlenen videoları yeniden kontrole sokar, sonra Ömer kararlarını uygular (günde bir, sırayla).
set -u
install -m 755 sunucu/havuz/yonetici.py /opt/aesun/havuz/yonetici.py
for k in AS_TM_B01_KEOPS_TEPE AS_TM_HEZARFEN_KARTON AS_GT_VECIHI_HURKUS; do python3 /opt/aesun/havuz/yonetici.py teslim sunucu/havuz/teslim/$k.json; done
bash sunucu/islem_havuz_onay.sh
