#!/bin/bash
# Davalar → Brifing / Yorumlar / grup notları (<gkod>_<ad>.md; ad: brifing|yorumlar|bekleyen|karsi): API'yi günceller (/v1/davalar/brifing), ardından brifing metnini gizli epias-ptf deposunun
# geçici dalından alır (sunucu açık anahtarıyla sarılı), dava anahtarıyla (AES-256-GCM) şifreleyip
# /opt/aesun/ozel/davalar/brifing.sifreli ve sunum/brifing.sifreli olarak koyar. Açık metin diske kalmaz.
set -euo pipefail
DAL=gecici-davalar-brifing; D=/opt/aesun/ozel/davalar
[ -s "$D/anahtar.bin" ] || { echo "NOT: HATA dava anahtarı yok"; exit 1; }
bash sunucu/islem_api_guncelle.sh || { echo "NOT: HATA API güncellenemedi, brifing yüklenmedi"; exit 1; }
T=$(mktemp -d /root/davalar_brifing.XXXXXX); trap 'rm -rf "$T"' EXIT
C=$(docker ps --format '{{.Names}}' | grep -E '^aesun[-_]isler' | head -1)
[ -n "$C" ] || { echo "NOT: HATA aesun-isler kapsayıcısı yok"; exit 1; }
mkdir -p "$T/d"
timeout 600 docker exec -e GIT_SSH_COMMAND='ssh -o BatchMode=yes -o StrictHostKeyChecking=accept-new -o ConnectTimeout=20' -e GIT_TERMINAL_PROMPT=0 "$C" sh -c "cd /veri/epias-ptf && git fetch -q --depth 1 origin $DAL:refs/remotes/origin/$DAL" </dev/null > "$T/fetch.log" 2>&1 || { echo "NOT: HATA geçici dal çekilemedi: $(tail -3 "$T/fetch.log" | tr '\n' ' ' | sed -E 's#https?://[^ ]*#URL#g' | cut -c1-300)"; exit 1; }
timeout 300 docker exec "$C" sh -c "cd /veri/epias-ptf && git archive refs/remotes/origin/$DAL gecici" </dev/null | tar xf - -C "$T/d"
S="$T/d/gecici"
J=$(base64 -d "$S/anahtar.sarili" | openssl pkeyutl -decrypt -inkey /opt/aesun/sir/ozel.pem -pkeyopt rsa_padding_mode:oaep -pkeyopt rsa_oaep_md:sha256 -pkeyopt rsa_mgf1_md:sha256)
K=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["k"])'); IV=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["iv"])'); SHA=$(printf '%s' "$J" | python3 -c 'import sys,json;print(json.load(sys.stdin)["sha"])'); unset J
mkdir -p "$T/ac" "$T/yeni"
if [ -f "$S/paket.enc" ]; then
  openssl enc -d -aes-256-cbc -K "$K" -iv "$IV" -in "$S/paket.enc" -out "$T/p.tgz"; unset K IV
  [ "$(sha256sum "$T/p.tgz" | cut -d' ' -f1)" = "$SHA" ] || { echo "NOT: HATA paket bozuk"; exit 1; }
  tar xzf "$T/p.tgz" -C "$T/ac"; rm -f "$T/p.tgz"
else
  openssl enc -d -aes-256-cbc -K "$K" -iv "$IV" -in "$S/brifing.enc" -out "$T/ac/brifing.md"; unset K IV
  [ "$(sha256sum "$T/ac/brifing.md" | cut -d' ' -f1)" = "$SHA" ] || { echo "NOT: HATA brifing bozuk"; exit 1; }
fi
cat > "$T/s.py" <<'P'
import os
from pathlib import Path
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
a = AESGCM(Path("/k").read_bytes()[:32])
import re
for f in sorted(Path("/ac").glob("*.md")):
    ad = f.stem
    # eski genel notlar (brifing, yorumlar) ya da grup notu: <gkod>_<brifing|yorumlar|bekleyen|karsi>
    if ad in ("brifing", "yorumlar") or re.fullmatch(r"[a-z0-9_]{1,30}_(brifing|yorumlar|bekleyen|karsi)", ad):
        n = os.urandom(12); Path(f"/yeni/{ad}.sifreli").write_bytes(n + a.encrypt(n, f.read_bytes(), None)); print(ad)
P
chown -R 1001:1001 "$T/yeni"; chmod 755 "$T"; chmod -R a+rX "$T/ac" "$T/s.py"
IMG=$(docker inspect -f '{{.Image}}' aesun-api)
docker run --rm --network none --user 1001 -v "$D/anahtar.bin":/k:ro -v "$T/ac":/ac:ro -v "$T/yeni":/yeni -v "$T/s.py":/s.py:ro "$IMG" python /s.py
rm -rf "$T/ac"
for f in "$T"/yeni/*.sifreli; do
  n=$(basename "$f")
  [ -f "$D/$n" ] && cp -p "$D/$n" "$D/${n%.sifreli}.onceki.sifreli"
  install -o 1001 -g 1001 -m 600 "$f" "$D/$n"
  [ -d "$D/sunum" ] && install -o 1001 -g 1001 -m 600 "$f" "$D/sunum/$n"
  echo "NOT: $n yüklendi ($(stat -c %s "$D/$n") bayt, şifreli)"
done
echo "NOT: yetkisiz istek: $(curl -s -o /dev/null -w '%{http_code}' --max-time 10 https://api.aksarayenerji.net/v1/davalar/brifing) (401 beklenir)"
timeout 300 docker exec -e GIT_SSH_COMMAND="ssh -o BatchMode=yes" -e GIT_TERMINAL_PROMPT=0 "$C" sh -c "cd /veri/epias-ptf && git push -q origin --delete $DAL; git update-ref -d refs/remotes/origin/$DAL" >/dev/null 2>&1 && echo "NOT: geçici dal silindi" || echo "NOT: UYARI geçici dal silinemedi"
