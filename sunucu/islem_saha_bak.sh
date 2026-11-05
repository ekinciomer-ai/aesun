#!/bin/bash
# Salt okunur: saha uygulaması yanıtı (boş gövde şüphesi).
curl -s -D /tmp/h.txt --compressed -o /tmp/s.html https://portal.aksarayenerji.net/saha/
echo "NOT: başlıklar: $(grep -iE '^(HTTP|content-type|content-length|location|refresh)' /tmp/h.txt | tr -d '\r' | tr '\n' ' ')"
echo "NOT: gövde: $(wc -c < /tmp/s.html) bayt · $(head -c 300 /tmp/s.html | tr '\n' ' ')"
curl -s --compressed -o /tmp/y.html -w 'NOT: yeni.html kod %{http_code} boyut %{size_download}\n' https://portal.aksarayenerji.net/saha/yeni.html
