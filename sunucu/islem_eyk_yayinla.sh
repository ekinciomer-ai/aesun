#!/bin/bash
# evdenyemekye.com: onay.txt'deki sürümü kurallarla yayınlar (otomatik mod kapalıyken kullanılır).
install -m 700 sunucu/evdenyemekye/eyk-yayinla /usr/local/bin/eyk-yayinla
SHA=$(grep -E '^SHA=[0-9a-f]{40}$' sunucu/evdenyemekye/onay.txt | cut -d= -f2)
[ -n "$SHA" ] || { echo "NOT: HATA onay.txt içinde geçerli SHA yok"; exit 1; }
/usr/local/bin/eyk-yayinla $SHA
