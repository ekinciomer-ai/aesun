#!/bin/bash
echo "NOT: tarife dosyası: $(docker exec aesun-isler cat /veri/epias-ptf/n8n/tarife_birim.json 2>&1 | cut -c1-900)"
