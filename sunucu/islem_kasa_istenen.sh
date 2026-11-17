#!/bin/bash
# Kasada beklenen kayıtların listesini günceller (yalnız adlar ve açıklamalar; değer yok).
set -euo pipefail
F=/var/lib/docker/volumes/aesun_aesun_veri/_data/kasa/istenen.json
cat > $F <<'J'
{
 "yedek_kurtarma_parolasi": "Yedek kurtarma parolası: kendiniz belirleyin, kâğıda yazıp saklayın. Sunucu tamamen kaybolursa yedekler bununla açılır.",
 "sketchfab_api": "Sketchfab API anahtarı: sketchfab.com → Settings → Password & API → API Token. Kozmos Lab videoları için ücretsiz (CC) 3D model indirmede kullanılır.",
 "gemini_api_anahtar_kozmos": "Kozmos Lab için ayrı ücretsiz Gemini anahtarı: Kozmos Lab hesabıyla (modernantiktv@gmail.com) aistudio.google.com → Get API key → Create API key. Merak Lab seslendirmesi bununla yapılır, diğer kanalların ses hakkını tüketmez."
}
J
chown 1001:1001 $F; chmod 600 $F
echo "NOT: beklenen kayıtlar: $(python3 -c "import json;print(', '.join(json.load(open('$F'))))")"
