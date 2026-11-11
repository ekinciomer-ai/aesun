#!/bin/bash
# Kasada beklenen kayıtların listesini günceller (yalnız adlar ve açıklamalar; değer yok).
set -euo pipefail
F=/var/lib/docker/volumes/aesun_aesun_veri/_data/kasa/istenen.json
cat > $F <<'J'
{
 "yedek_kurtarma_parolasi": "Yedek kurtarma parolası: kendiniz belirleyin, kâğıda yazıp saklayın. Sunucu tamamen kaybolursa yedekler bununla açılır.",
 "sketchfab_api": "Sketchfab API anahtarı: sketchfab.com → Settings → Password & API → API Token. Kozmos Lab videoları için ücretsiz (CC) 3D model indirmede kullanılır."
}
J
chown 1001:1001 $F; chmod 600 $F
echo "NOT: beklenen kayıtlar: $(python3 -c "import json;print(', '.join(json.load(open('$F'))))")"
