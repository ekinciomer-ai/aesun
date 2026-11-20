#!/bin/bash
# Dava evrak arşivini gizli epias-ptf deposunun geçici dalından (sunucunun açık anahtarıyla şifreli) alır.
# Arşiv sunucuda da şifreli durur: /opt/aesun/ozel/davalar (yalnız root). Doğrulama geçici klasörde yapılır, sonra silinir.
# Açık aesun deposuna hiçbir dava verisi girmez; bu betik yalnız taşıma kodudur.
set -euo pipefail
DAL=gecici-dava-arsiv; AD=samet_kazasi_2026-11-20
H=/opt/aesun/ozel/davalar
T=$(mktemp -d /root/dava_tasima.XXXXXX); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/d/gecici_dava"; S="$T/d/gecici_dava"; OK=0
for AD_ in GH_TOKEN AESUN_GH_OKU; do
  for F in /opt/aesun/isler.env /opt/aesun/.env; do
    GHT=$(grep -h "^$AD_=" "$F" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r"' || true)
    [ -n "$GHT" ] || continue
    printf 'header = "Authorization: Bearer %s"\n' "$GHT" > "$T/h.cfg"; chmod 600 "$T/h.cfg"; unset GHT
    L=$(curl -sf -K "$T/h.cfg" "https://api.github.com/repos/ekinciomer-ai/epias-ptf/contents/gecici_dava?ref=$DAL" | python3 -c 'import sys,json;print(" ".join(x["name"] for x in json.load(sys.stdin)))' 2>/dev/null || true)
    if [ -n "$L" ]; then
      for f in $L; do curl -sfL -K "$T/h.cfg" -H "Accept: application/vnd.github.raw" -o "$S/$f" "https://api.github.com/repos/ekinciomer-ai/epias-ptf/contents/gecici_dava/$f?ref=$DAL"; done
      echo "NOT: geçici daldan $(ls "$S" | wc -l) parça alındı ($AD_)"; OK=1; break 2
    fi
  done
done
rm -f "$T/h.cfg"
[ $OK = 1 ] || { echo "NOT: HATA sunucudaki depo anahtarlarıyla geçici dal okunamadı"; exit 1; }
[ -f "$S/anahtar.sarili" ] || { echo "NOT: HATA geçici dal okunamadı"; exit 1; }
mkdir -p "$H"; chmod 700 /opt/aesun/ozel "$H"; chown root:root /opt/aesun/ozel "$H"
cat "$S"/p_* > "$T/a.enc"
J=$(base64 -d "$S/anahtar.sarili" | openssl pkeyutl -decrypt -inkey /opt/aesun/sir/ozel.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256)
K=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["k"])')
IV=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["iv"])')
SHA=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["sha"])')
unset J
openssl enc -d -aes-256-cbc -K "$K" -iv "$IV" -in "$T/a.enc" -out "$T/a.tgz"; unset K IV
[ "$(sha256sum "$T/a.tgz" | cut -d' ' -f1)" = "$SHA" ] || { echo "NOT: HATA arşiv bozuk geldi (özet tutmadı)"; exit 1; }
N=$(tar tzf "$T/a.tgz" | grep -vc '/$')
KL=$(tar tzf "$T/a.tgz" | awk -F/ 'NF>2{print $2}' | sort -u | tr '\n' ' ')
[ -f "$H/$AD.enc" ] && mv "$H/$AD.enc" "$H/$AD.enc.onceki"
mv "$T/a.enc" "$H/$AD.enc"; cp "$S/anahtar.sarili" "$H/$AD.anahtar"
printf '{"ad":"%s","dosya_sayisi":%s,"sha256":"%s","alinma":"%s","sifre":"RSA-OAEP-256 sarili AES-256-CBC, ozel anahtar /opt/aesun/sir/ozel.pem"}\n' "$AD" "$N" "$SHA" "$(date -Is)" > "$H/$AD.json"
chmod 600 "$H"/*
echo "NOT: dava arşivi alındı ve doğrulandı: $N dosya, $(du -h "$H/$AD.enc" | cut -f1) şifreli"
echo "NOT: klasörler: $KL"
ls -la "$H" | tail -n +2 | sed 's/^/NOT: /'
