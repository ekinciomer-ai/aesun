#!/bin/bash
# evdenyemekye.com: düzeltilmiş yayın çekirdeğini kurar ve main'deki son sürümün yeniden denenmesini sağlar.
install -m 700 sunucu/evdenyemekye/eyk-yayinla /usr/local/bin/eyk-yayinla
rm -f /opt/evdenyemekye/oto_son
echo "NOT: çekirdek güncellendi · mod $(cat /opt/evdenyemekye/mod) · son sürüm bir dakika içinde yeniden denenecek"
