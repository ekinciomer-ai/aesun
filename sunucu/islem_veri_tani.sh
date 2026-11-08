#!/bin/bash
echo "NOT: köprüden gelen istekler (son 3 sa): $(docker logs --since 3h aesun-api 2>&1 | grep '49.12.150.131' | grep -o '"[A-Z]* /[^ ]*' | sed 's/?.*yol=/ /;s/&.*//' | sort | uniq -c | sort -rn | head -8 | tr '\n' ';')"
echo "NOT: köprü durum kodları: $(docker logs --since 3h aesun-api 2>&1 | grep '49.12.150.131' | grep -oE 'HTTP/1.1" [0-9]{3}' | sort | uniq -c | tr '\n' ' ')"
echo "NOT: anahtar adları: $(docker exec aesun-api python -c "import json;print(list(json.load(open('/veri/anahtarlar.json'))))")"
