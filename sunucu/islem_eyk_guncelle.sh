#!/bin/bash
# evdenyemekye.com: yayın çekirdeğini günceller; son main sürümü bir sonraki dakikada otomatik yeniden denenir.
install -m 700 sunucu/evdenyemekye/eyk-yayinla /usr/local/bin/eyk-yayinla
install -m 700 sunucu/evdenyemekye/eyk-oto /usr/local/bin/eyk-oto
rm -f /opt/evdenyemekye/oto_son
echo "NOT: çekirdek güncellendi · mod $(cat /opt/evdenyemekye/mod) · main yeniden denenecek"
