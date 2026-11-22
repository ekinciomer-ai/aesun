#!/bin/bash
# Salt okunur teşhis: tts_kuyruk'taki docker adımını küçük bir işle tekrarlar, GİZLENEN hata çıktısını NOT olarak gösterir.
# Anahtar/sır yazdırmaz. Kuyruğa ve diğer uygulamalara dokunmaz.
set -u
IMAJ=aesun-tts:1
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
cd "$T"; mkdir -p kuyruk cikti kutuphane
cp "$OLDPWD/sunucu/tts/uret.py" . 2>/dev/null || { echo "NOT: HATA uret.py pakette yok"; exit 0; }
cp "$OLDPWD/sunucu/tts/kutuphane/SES_KUTUPHANESI.json" kutuphane/ 2>/dev/null
printf '{"kod":"TANI","motor":"gemini","ses":"charon","model_tercih":"gemini-3.8-flash-tts","model_kilit":true,"parcalar":[{"ad":"V1","ses":"charon","tek_istek":true,"ton":"anlatici","metin":"Deneme. Bu bir teşhis cümlesidir."}]}' > kuyruk/TANI.json
chown -R 1502:1502 . 2>/dev/null
echo "NOT: klasör izinleri: $(stat -c '%U:%G %a' . uret.py | tr '\n' ' ')"
EF=$(mktemp); chmod 600 "$EF"
G=$(/opt/aesun/kasa_coz.sh gemini_api_anahtar 2>/dev/null) || G=$(/opt/aesun/kasa_coz.sh gemini_api_key 2>/dev/null) || G=""
[ -n "$G" ] && printf 'GEMINI_KEY=%s\n' "$G" > "$EF" || echo "NOT: uyarı Gemini anahtarı yok"; unset G
echo "NOT: docker sürüm: $(docker version --format '{{.Server.Version}}' 2>&1 | head -1)"
timeout 300 docker run --rm --env-file "$EF" --memory 1g --cpus 2 -v "$PWD:/work" "$IMAJ" python /work/uret.py > cikis.txt 2>&1; RC=$?
rm -f "$EF"
echo "NOT: docker çıkış kodu: $RC"
grep -v -iE 'key|anahtar|token' cikis.txt | tail -n 15 | cut -c1-220 | sed 's/^/NOT: çıktı | /'
echo "NOT: üretilen: $(ls cikti 2>/dev/null | tr '\n' ' ')"
exit 0
