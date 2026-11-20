#!/bin/bash
# Dava evrak arşivini gizli epias-ptf deposunun geçici dalından (sunucunun açık anahtarıyla şifreli) alır.
# Arşiv sunucuda da şifreli durur: /opt/aesun/ozel/davalar (yalnız root). Doğrulama geçici klasörde yapılır, sonra silinir.
# Açık aesun deposuna hiçbir dava verisi girmez; bu betik yalnız taşıma kodudur.
set -euo pipefail
DAL=gecici-dava-arsiv; AD=samet_kazasi_2026-11-20
H=/opt/aesun/ozel/davalar
T=$(mktemp -d /root/dava_tasima.XXXXXX); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/d"; S="$T/d/gecici_dava"
# epias-ptf'e erişim: aesun-isler kapsayıcısının kendi dağıtım anahtarı (Ömer onayı 20.11.2026; anahtar bu betikte görünmez)
C=$(docker ps --format '{{.Names}}' | grep -E '^aesun[-_]isler' | head -1)
[ -n "$C" ] || { echo "NOT: HATA aesun-isler kapsayıcısı bulunamadı"; exit 1; }
echo "NOT: depo bağlantı türü: $(docker exec "$C" sh -c 'cd /veri/epias-ptf && git remote get-url origin' | sed -E 's#(://)[^@]*@#\1***@#' | cut -c1-25)"
timeout 1500 docker exec -e GIT_SSH_COMMAND='ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20' -e GIT_TERMINAL_PROMPT=0 "$C" sh -c "cd /veri/epias-ptf && git fetch -q --depth 1 origin $DAL:refs/remotes/origin/$DAL" </dev/null || { echo "NOT: HATA geçici dal çekilemedi (zaman aşımı ya da erişim)"; exit 1; }
echo "NOT: geçici dal çekildi"
timeout 600 docker exec "$C" sh -c "cd /veri/epias-ptf && git archive refs/remotes/origin/$DAL gecici_dava" </dev/null | tar xf - -C "$T/d"
echo "NOT: geçici daldan $(ls "$S" 2>/dev/null | wc -l) parça alındı"
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
# geçici dalı depodan ve kapsayıcıdaki kopyadan kaldır
timeout 300 docker exec -e GIT_SSH_COMMAND="ssh -o BatchMode=yes" -e GIT_TERMINAL_PROMPT=0 "$C" sh -c "cd /veri/epias-ptf && git push -q origin --delete $DAL; git update-ref -d refs/remotes/origin/$DAL" >/dev/null 2>&1 && echo "NOT: geçici dal silindi" || echo "NOT: UYARI geçici dal silinemedi"
