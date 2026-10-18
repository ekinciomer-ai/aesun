#!/bin/bash
# Salt okunur: anahtar adları ve son 2 günde hangi anahtarın hangi dosyalara yazdığı (değer yazdırmaz)
echo "NOT: anahtar adları: $(docker exec aesun-api python -c "import json;print(list(json.load(open('/veri/anahtarlar.json'))))")"
L=$(docker exec aesun-api sh -c 'ls /veri/depo_yazim.log >/dev/null 2>&1 && echo /veri/depo_yazim.log')
docker exec aesun-api sh -c "tail -n 20000 $L" | awk -F'\t' -v s="$(date -u -d '2 days ago' +%Y-%m-%dT%H)" '$1>=s{print $2" "$3}' | sort | uniq -c | sort -rn | head -12 | while read n k y; do echo "NOT: yazım $k $y x$n"; done
echo "NOT: okuma (son 6 sa, toplayıcı): $(docker logs --since 6h aesun-api 2>&1 | grep -o 'veri.php?a=oku&yol=[^ &"]*' | sort | uniq -c | sort -rn | head -6 | tr '\n' ';')"
