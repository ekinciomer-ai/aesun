#!/bin/bash
# Davalar (portal Özel Alan) altyapısı: şifreleme anahtarı + sunum klasörü, sonra aesun-api güncellemesi (davalar.py).
# Anahtar yalnız aesun-api kullanıcısının (1001) okuyabileceği tek dosyadır; hiçbir yere yazdırılmaz.
set -euo pipefail
D=/opt/aesun/ozel/davalar
mkdir -p "$D/sunum/e"; chmod 700 /opt/aesun/ozel "$D"
if [ ! -s "$D/anahtar.bin" ]; then head -c 32 /dev/urandom > "$D/anahtar.bin"; echo "NOT: yeni dava anahtarı oluşturuldu"; else echo "NOT: dava anahtarı mevcut"; fi
chown 1001:1001 "$D/anahtar.bin" "$D/sunum" "$D/sunum/e"; chmod 400 "$D/anahtar.bin"; chmod 700 "$D/sunum" "$D/sunum/e"
# dava anahtarının yedeği root kasasına (felaket kurtarma): sunucu açık anahtarıyla şifreli
[ -f "$D/anahtar.bin.yedek" ] || openssl pkeyutl -encrypt -pubin -inkey /opt/aesun/sir/acik.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -in "$D/anahtar.bin" -out "$D/anahtar.bin.yedek"
chmod 600 "$D/anahtar.bin.yedek"
bash sunucu/islem_api_guncelle.sh
k=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/davalar/dizin)
echo "NOT: davalar dizini yetkisiz istek: $k (401 beklenir)"
