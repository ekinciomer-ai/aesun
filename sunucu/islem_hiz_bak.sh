#!/bin/bash
# Salt okunur: sayfa hızı (sıkıştırmalı gerçek tarayıcı koşulu): ilk bayt, toplam süre, aktarılan boyut.
for u in https://portal.aksarayenerji.net/ https://portal.aksarayenerji.net/monitoring/ https://portal.aksarayenerji.net/saha/ https://portal.aksarayenerji.net/kasa/ https://portal.aksarayenerji.net/yayin/ https://aksarayenerji.net/ https://api.aksarayenerji.net/v1/acik/portal/veri.json; do
  for i in 1 2 3; do curl -s --compressed -o /dev/null -w '%{time_starttransfer} %{time_total} %{size_download} %{http_code}\n' --max-time 30 "$u"; done \
   | awk -v u="$u" '{a+=$1;b+=$2;c=$3;d=$4} END{printf "NOT: %s → kod %s · ilk bayt %.2fs · toplam %.2fs · %d KB\n", u, d, a/3, b/3, c/1024}'
done
echo "NOT: sıkıştırma başlığı (monitoring): $(curl -sI --compressed https://portal.aksarayenerji.net/monitoring/ | grep -i -E 'content-encoding|cache-control|server:' | tr -d '\r' | tr '\n' ' ')"
