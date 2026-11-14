#!/bin/bash
# Antik B01 tam kaydı arka planda başlatır (bağlantı kopsa da sürer). Durum: islem_antik_b01_sonuc.
set -u
P=/opt/tampon/antik_b01/is_paket; rm -rf $P; mkdir -p $P; cp -r sunucu $P/
rm -f /opt/tampon/antik_b01/arka.bitti
cd $P && setsid nohup bash -c 'bash sunucu/islem_antik_b01_gercek_tam.sh > /opt/tampon/antik_b01/arka.log 2>&1; date > /opt/tampon/antik_b01/arka.bitti' >/dev/null 2>&1 &
echo "NOT: arka plan kaydı başladı"
