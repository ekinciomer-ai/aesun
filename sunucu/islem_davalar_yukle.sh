#!/bin/bash
# Davalar sunum paketini gizli epias-ptf deposunun geçici dalından alır (sunucu açık anahtarıyla şifreli),
# her evrakı dava anahtarıyla (AES-256-GCM) ayrı ayrı şifreleyip /opt/aesun/ozel/davalar/sunum'a koyar. Açık metin diske kalmaz (geçici klasör silinir).
set -euo pipefail
DAL=gecici-davalar-sunum; D=/opt/aesun/ozel/davalar
[ -s "$D/anahtar.bin" ] || { echo "NOT: HATA önce davalar_kur çalışmalı"; exit 1; }
T=$(mktemp -d /root/davalar_yukle.XXXXXX); trap 'rm -rf "$T"' EXIT
C=$(docker ps --format '{{.Names}}' | grep -E '^aesun[-_]isler' | head -1)
[ -n "$C" ] || { echo "NOT: HATA aesun-isler kapsayıcısı yok"; exit 1; }
mkdir -p "$T/d"
timeout 1500 docker exec -e GIT_SSH_COMMAND='ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20' -e GIT_TERMINAL_PROMPT=0 "$C" sh -c "cd /veri/epias-ptf && git fetch -q --depth 1 origin $DAL:refs/remotes/origin/$DAL" </dev/null > "$T/fetch.log" 2>&1 || { echo "NOT: HATA geçici dal çekilemedi: $(tail -3 "$T/fetch.log" | tr '\n' ' ' | sed -E 's#https?://[^ ]*#URL#g' | cut -c1-300)"; exit 1; }
timeout 600 docker exec "$C" sh -c "cd /veri/epias-ptf && git archive refs/remotes/origin/$DAL gecici" </dev/null | tar xf - -C "$T/d"
S="$T/d/gecici"; echo "NOT: $(ls "$S" | wc -l) parça alındı"
cat "$S"/p_* > "$T/a.enc"
J=$(base64 -d "$S/anahtar.sarili" | openssl pkeyutl -decrypt -inkey /opt/aesun/sir/ozel.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256)
K=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["k"])'); IV=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["iv"])'); SHA=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["sha"])'); unset J
openssl enc -d -aes-256-cbc -K "$K" -iv "$IV" -in "$T/a.enc" -out "$T/a.tgz"; unset K IV
[ "$(sha256sum "$T/a.tgz" | cut -d' ' -f1)" = "$SHA" ] || { echo "NOT: HATA paket bozuk"; exit 1; }
mkdir -p "$T/ac" "$T/yeni/e"; tar xzf "$T/a.tgz" -C "$T/ac"; rm -f "$T/a.tgz"
[ -f "$T/ac/sunum/dizin.json" ] || { echo "NOT: HATA dizin yok"; exit 1; }
cat > "$T/sifrele.py" <<'P'
import os, sys
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
k = Path("/k").read_bytes()[:32]; a = AESGCM(k); kaynak = Path("/ac/sunum"); hedef = Path("/yeni")
def yaz(src, dst):
    n = os.urandom(12); dst.write_bytes(n + a.encrypt(n, src.read_bytes(), None))
yaz(kaynak / "dizin.json", hedef / "dizin.sifreli"); n = 0
for f in (kaynak / "e").iterdir():
    yaz(f, hedef / "e" / (f.name.split(".")[0] + ".sifreli")); n += 1
print(n)
P
chown -R 1001:1001 "$T/yeni"; chmod 755 "$T"; chmod -R a+rX "$T/ac" "$T/sifrele.py"
IMG=$(docker inspect -f '{{.Image}}' aesun-api)
N=$(docker run --rm --network none --user 1001 -v "$D/anahtar.bin":/k:ro -v "$T/ac":/ac:ro -v "$T/yeni":/yeni -v "$T/sifrele.py":/s.py:ro "$IMG" python /s.py)
echo "NOT: $N evrak şifrelendi"
rm -rf "$T/ac"
rm -rf "$D/sunum.onceki"; [ -d "$D/sunum" ] && mv "$D/sunum" "$D/sunum.onceki"
mv "$T/yeni" "$D/sunum"; chown -R 1001:1001 "$D/sunum"; chmod 700 "$D/sunum" "$D/sunum/e"
for n in brifing yorumlar; do [ -f "$D/$n.sifreli" ] && install -o 1001 -g 1001 -m 600 "$D/$n.sifreli" "$D/sunum/$n.sifreli"; done   # notlar yeni pakette de kalsın
cp "$T/a.enc" "$D/sunum_paket_$(date +%Y%m%d).enc"; cp "$S/anahtar.sarili" "$D/sunum_paket_$(date +%Y%m%d).anahtar"; chmod 600 "$D"/sunum_paket_*
docker restart aesun-api >/dev/null && sleep 6
echo "NOT: yetkisiz istek: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/davalar/dizin) (401 beklenir)"
timeout 300 docker exec -e GIT_SSH_COMMAND="ssh -o BatchMode=yes" -e GIT_TERMINAL_PROMPT=0 "$C" sh -c "cd /veri/epias-ptf && git push -q origin --delete $DAL; git update-ref -d refs/remotes/origin/$DAL" >/dev/null 2>&1 && echo "NOT: geçici dal silindi" || echo "NOT: UYARI geçici dal silinemedi"
